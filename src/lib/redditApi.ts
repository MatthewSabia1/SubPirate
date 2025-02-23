import { createClient } from '@supabase/supabase-js';

const CLIENT_ID = import.meta.env.VITE_REDDIT_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_REDDIT_CLIENT_SECRET;
const REDIRECT_URI = window.location.origin + '/auth/callback';

if (!CLIENT_ID) {
  console.warn('Reddit Client ID not configured. Some features may be limited.');
}

if (!CLIENT_SECRET) {
  console.warn('Reddit Client Secret not configured. Some features may be limited.');
}

export interface RedditAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SubredditInfo {
  name: string;
  title: string;
  subscribers: number;
  active_users: number;
  description: string;
  created_utc: number;
  over18: boolean;
  icon_img: string | null;
  community_icon: string | null;
  rules: Array<{
    title: string;
    description: string;
  }>;
}

export interface SubredditPost {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  created_utc: number;
  score: number;
  num_comments: number;
  url: string;
  selftext: string;
  thumbnail?: string;
  preview_url?: string | null;
  post_karma?: number; // Added optional property
}

export interface SubredditFrequency {
  name: string;
  count: number;
  subscribers: number;
  active_users: number;
  icon_img: string | null;
  community_icon: string | null;
  lastPosts: SubredditPost[];
}

export class RedditAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'RedditAPIError';
  }
}

class RedditAPI {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number = 0;
  private readonly USER_AGENT = 'web:SubPirate:1.0.0';

  private async getRedditProfilePic(username: string): Promise<string | null> {
    try {
      const response = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
        headers: {
          "User-Agent": this.USER_AGENT,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      // Handle both icon_img and snoovatar_img
      const avatarUrl = data?.data?.icon_img || data?.data?.snoovatar_img;
      return avatarUrl ? avatarUrl.split('?')[0] : null;
    } catch (error) {
      console.error("Error fetching Reddit profile picture:", error);
      // Return a generated avatar as fallback
      return `https://api.dicebear.com/7.x/initials/svg?seed=${username}&backgroundColor=111111`;
    }
  }

  parseUsername(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const cleaned = input.trim();
    if (!cleaned) {
      return '';
    }

    // Handle full Reddit profile URLs
    const urlMatch = cleaned.match(
      /(?:https?:\/\/)?(?:www\.)?reddit\.com\/(?:user|u)\/([^/?#]+)/i
    );
    if (urlMatch) {
      return urlMatch[1].toLowerCase();
    }

    // Handle u/username format
    const withoutPrefix = cleaned.replace(/^\/?(u\/)?/i, '').split(/[/?#]/)[0];
    return withoutPrefix.toLowerCase();
  }

  private async handleResponse(response: Response, endpoint: string) {
    // Handle specific HTTP status codes
    if (response.status === 404) {
      throw new RedditAPIError('Subreddit not found', 404, endpoint);
    }

    if (response.status === 403) {
      const responseText = await response.text();
      if (responseText.includes('quarantined')) {
        throw new RedditAPIError('This subreddit is quarantined', 403, endpoint);
      } else if (responseText.includes('private')) {
        throw new RedditAPIError('This subreddit is private', 403, endpoint);
      } else if (responseText.includes('banned')) {
        throw new RedditAPIError('This subreddit has been banned', 403, endpoint);
      } else {
        throw new RedditAPIError('Access denied', 403, endpoint);
      }
    }

    if (response.status === 429) {
      throw new RedditAPIError(
        'Too many requests. Please try again later.',
        429,
        endpoint
      );
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new RedditAPIError(
        error.message || `Reddit API error (${response.status})`,
        response.status,
        endpoint
      );
    }
  }

  async request(endpoint: string): Promise<any> {
    try { 
      // Use JSON API endpoint with proper headers
      const url = `https://www.reddit.com${endpoint}${endpoint.endsWith('.json') ? '' : '.json'}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'application/json'
        },
        credentials: 'omit' // Prevent CORS preflight
      });

      await this.handleResponse(response, endpoint);

      // Only try to parse JSON if we have a successful response
      if (response.ok) {
        const result = await response.json();
        if (!result) {
          throw new RedditAPIError('Invalid response from Reddit API');
        }
        return result;
      }

      throw new RedditAPIError('Failed to fetch data from Reddit');
    } catch (error) {
      if (error instanceof RedditAPIError) throw error;
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new RedditAPIError(
          'Failed to connect to Reddit. Please check your internet connection.',
          0,
          endpoint
        );
      }
      throw new RedditAPIError(
        'Failed to fetch data from Reddit. Please try again later.',
        0,
        endpoint
      );
    }
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (error instanceof RedditAPIError && error.status === 429) {
          // Exponential backoff
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    
    throw lastError;
  }

  private async safeRequest(endpoint: string): Promise<any> {
    return this.retryWithBackoff(() => this.request(endpoint));
  }

  async analyzePostFrequency(
    posts: SubredditPost[]
  ): Promise<SubredditFrequency[]> {
    // Group posts by subreddit and count posts per subreddit
    const frequencies = new Map<
      string,
      { count: number; posts: SubredditPost[] }
    >();

    posts.forEach((post) => {
      const current = frequencies.get(post.subreddit) || { count: 0, posts: [] };
      frequencies.set(post.subreddit, {
        count: current.count + 1,
        posts: [...current.posts, post]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
      });
    });

    // Sort subreddits by post count and limit to top 20
    const sortedSubreddits = Array.from(frequencies.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20);

    const results = [];
    for (const [subreddit, { count, posts }] of sortedSubreddits) {
      try {
        const data = await this.safeRequest(`/r/${subreddit}/about.json`);

        if (!data.data) {
          console.warn(`Invalid response for r/${subreddit}`);
          continue;
        }

        const info = data.data;
        results.push({
          name: info.display_name,
          count,
          subscribers: info.subscribers || 0,
          active_users: info.active_user_count || 0,
          icon_img: this.cleanImageUrl(info.icon_img),
          community_icon: this.cleanImageUrl(info.community_icon),
          lastPosts: posts,
        });

        // Add a small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        // Log error but continue with other subreddits
        console.warn(`Error fetching info for r/${subreddit}:`, error);
      }
    }

    return results;
  }

  async setAuth(auth: RedditAuth) {
    this.accessToken = auth.accessToken;
    this.refreshToken = auth.refreshToken;
    this.expiresAt = auth.expiresAt;
  }

  private async getApplicationOnlyToken() {
    // Using public API, no auth needed
    this.accessToken = 'public';
    this.expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  }

  async ensureAuth() {
    if (!this.accessToken || Date.now() >= this.expiresAt) {
      await this.getApplicationOnlyToken();
    }
  }

  private decodeHtmlEntities(text: string): string {
    if (!text) return '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  private cleanMarkdown(text: string): string {
    if (!text) return '';
    return text
      // Remove markdown links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove bold
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      // Remove italic
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove blockquotes
      .replace(/^>(.+)$/gm, '$1')
      // Remove headers
      .replace(/#{1,6}\s/g, '')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove horizontal rules
      .replace(/^-{3,}|_{3,}|\*{3,}$/gm, '')
      // Remove list markers
      .replace(/^[\s]*[-*+][\s]+/gm, '')
      .replace(/^[\s]*\d+\.[\s]+/gm, '')
      // Remove HTML tags
      .replace(/<[^>]+>/g, '')
      // Collapse multiple newlines
      .replace(/\n{2,}/g, ' ')
      // Collapse multiple spaces
      .replace(/\s{2,}/g, ' ')
      // Trim whitespace
      .trim();
  }

  private cleanImageUrl(url: string | null): string | null {
    if (!url) return null;

    // Handle special URL cases
    if (url === 'self' || url === 'default' || url === 'spoiler' || url === 'nsfw') return null;

    // Handle URLs with query parameters
    if (url.includes('?')) {
      try {
        const urlObj = new URL(url);
        
        // Keep all params for Reddit CDN URLs
        if (urlObj.hostname.includes('redd.it') || 
            urlObj.hostname.includes('reddit.com') || 
            urlObj.hostname.includes('redditstatic.com')) {
          return url;
        }
        
        // Strip query params for non-Reddit URLs
        return `${urlObj.origin}${urlObj.pathname}`;
      } catch (err) {
        // If URL parsing fails, return original
        return url;
      }
    }

    return url;
  }

  async getSubredditInfo(subreddit: string): Promise<SubredditInfo> {
    try {
      const data = await this.request(`/r/${subreddit}/about.json`);

      if (!data?.data) {
        throw new RedditAPIError('Invalid response from Reddit API', 0, 'about');
      }

      const info = data.data;

      // Get subreddit rules
      let rules = [];
      try {
        const rulesData = await this.request(`/r/${subreddit}/about/rules.json`);
        rules = rulesData.rules?.map((rule: any) => ({
          title: this.decodeHtmlEntities(rule.short_name || rule.title || ''),
          description: this.decodeHtmlEntities(rule.description || '')
        })) || [];
      } catch (err) {
        console.warn('Failed to fetch subreddit rules:', err);
        rules = [];
      }

      // Clean and validate icons
      const icon_img = this.cleanImageUrl(info.icon_img);
      const community_icon = this.cleanImageUrl(info.community_icon);

      return {
        name: info.display_name,
        title: this.decodeHtmlEntities(info.title || info.display_name),
        subscribers: info.subscribers || 0,
        active_users: info.active_user_count || 0,
        description: this.cleanMarkdown(
          this.decodeHtmlEntities(info.public_description || info.description || '')
        ),
        created_utc: info.created_utc,
        over18: info.over_18 || false,
        icon_img,
        community_icon,
        rules,
      };
    } catch (error) {
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError('Failed to get subreddit information', 0, 'about');
    }
  }

  async getSubredditPosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' = 'hot',
    limit: number = 100,
    timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'day'
  ): Promise<SubredditPost[]> {
    try {
      const endpoint = `/r/${subreddit}/${sort}.json?limit=${limit}&t=${timeframe}`;
      const data = await this.request(endpoint);

      if (!data?.data?.children) {
        throw new RedditAPIError('Invalid response from Reddit API', 0, 'posts');
      }

      return data.data.children
        .filter((child: any) => child.data && !child.data.stickied)
        .map((child: any) => ({
          id: child.data.id,
          title: this.decodeHtmlEntities(child.data.title),
          author: child.data.author,
          created_utc: child.data.created_utc,
          score: child.data.score,
          num_comments: child.data.num_comments,
          url: child.data.url,
          selftext: this.cleanMarkdown(
            this.decodeHtmlEntities(child.data.selftext || '')
          ),
          thumbnail: this.cleanImageUrl(child.data.thumbnail),
          preview_url: child.data.preview?.images?.[0]?.source?.url || null,
        }));
    } catch (error) {
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError('Failed to get subreddit posts', 0, 'posts');
    }
  }

  async searchSubreddits(query: string): Promise<SubredditInfo[]> {
    try {
      const data = await this.request(
        `/subreddits/search.json?q=${encodeURIComponent(query)}&limit=20`
      );

      if (!data.data?.children) {
        throw new RedditAPIError('Invalid response from Reddit API', 0, 'search');
      }

      return data.data.children
        .filter((child: any) => child.data)
        .map((child: any) => {
          const icon_img = this.cleanImageUrl(child.data.icon_img);
          const community_icon = this.cleanImageUrl(child.data.community_icon);

          return {
            name: child.data.display_name,
            title: this.decodeHtmlEntities(child.data.title || child.data.display_name),
            subscribers: child.data.subscribers || 0,
            active_users: child.data.active_user_count || 0,
            description: this.cleanMarkdown(
              this.decodeHtmlEntities(child.data.public_description || child.data.description || '')
            ),
            created_utc: child.data.created_utc,
            over18: child.data.over_18 || false,
            icon_img,
            community_icon,
            rules: [],
          };
        });
    } catch (error) {
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError('Failed to search subreddits', 0, 'search');
    }
  }

  async getUserPosts(
    username: string,
    sort: 'new' | 'top' = 'new',
    limit = 25,
    timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'day'
  ): Promise<SubredditPost[]> {
    try {
      const cleanUsername = this.parseUsername(username);
      if (!cleanUsername) {
        throw new RedditAPIError('Invalid username format', 400, 'user_posts');
      }

      // Get user data and posts in parallel to speed up the request
      const [userData, postsData] = await Promise.all([
        this.request(`/user/${cleanUsername}/about`),
        this.request(`/user/${cleanUsername}/submitted?limit=${limit}&sort=${sort}${
          sort === 'top' ? `&t=${timeframe}` : ''
        }`)
      ]);

      if (!userData?.data) {
        throw new RedditAPIError('Invalid user data response', 0, 'user_posts');
      }

      if (!postsData?.data?.children) {
        throw new RedditAPIError('Invalid posts response', 0, 'user_posts');
      }

      const postKarma = userData.data.link_karma || 0;
      const posts = postsData.data.children
        .filter((child: any) => child.data && !child.data.stickied)
        .map((child: any) => ({
          id: child.data.id,
          title: this.decodeHtmlEntities(child.data.title),
          subreddit: child.data.subreddit,
          created_utc: child.data.created_utc,
          score: child.data.score,
          num_comments: child.data.num_comments,
          url: child.data.url,
          selftext: this.cleanMarkdown(
            this.decodeHtmlEntities(child.data.selftext || '')
          ),
          thumbnail: child.data.thumbnail,
          preview_url: child.data.preview?.images?.[0]?.source?.url || null
        }));

      // Add post karma to the first post for access in the calling code
      if (posts.length > 0) {
        posts[0].post_karma = postKarma;
      }

      return posts;

    } catch (error) {
      if (error instanceof RedditAPIError) {
        throw error;
      }
      throw new RedditAPIError(
        error instanceof Error ? error.message : 'Failed to analyze user. Please check the username and try again.',
        0,
        'user_posts'
      );
    }
  }
}

export const redditApi = new RedditAPI();