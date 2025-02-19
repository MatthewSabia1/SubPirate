import { createClient } from '@supabase/supabase-js';

const CLIENT_ID = import.meta.env.VITE_REDDIT_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_REDDIT_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:5173/auth/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('Missing Reddit API credentials');
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
  private retryCount: number = 0;
  private readonly MAX_RETRIES = 3;

  parseUsername(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const cleaned = input.trim();
    if (!cleaned) {
      return '';
    }

    // Handle full Reddit profile URLs
    const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?reddit\.com\/(?:user|u)\/([^/?#]+)/i);
    if (urlMatch) {
      return urlMatch[1].toLowerCase();
    }

    // Handle u/username format
    const withoutPrefix = cleaned.replace(/^\/?(u\/)?/i, '').split(/[/?#]/)[0];
    return withoutPrefix.toLowerCase();
  }

  async analyzePostFrequency(posts: SubredditPost[]): Promise<SubredditFrequency[]> {
    // Group posts by subreddit
    // Count posts per subreddit
    const frequencies = new Map<string, {
      count: number;
      posts: SubredditPost[];
    }>();

    // Count posts and collect top posts for each subreddit
    posts.forEach(post => {
      const current = frequencies.get(post.subreddit) || { count: 0, posts: [] };
      frequencies.set(post.subreddit, {
        count: current.count + 1,
        posts: [...current.posts, post]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
      });
    });

    // Sort subreddits by post count and limit to top 20
    const sortedSubreddits = Array.from(frequencies.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20);

    // Fetch subreddit info sequentially to avoid rate limits
    const results = [];
    for (const [subreddit, { count, posts }] of sortedSubreddits) {
      try {
        const data = await this.request(`/r/${subreddit}/about.json`);
        
        if (!data.data) {
          throw new RedditAPIError('Invalid response from Reddit API', 0, 'about');
        }

        const info = data.data;
        results.push({
          name: info.display_name,
          count,
          subscribers: info.subscribers || 0,
          active_users: info.active_user_count || 0,
          icon_img: this.cleanImageUrl(info.icon_img),
          community_icon: this.cleanImageUrl(info.community_icon),
          lastPosts: posts
        });

        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching info for r/${subreddit}:`, error);
        // Continue with next subreddit
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
    try {
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials'
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new RedditAPIError(
          error.message || 'Failed to authenticate with Reddit',
          response.status,
          'auth'
        );
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.expiresAt = Date.now() + (data.expires_in * 1000);
    } catch (error) {
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError(
        'Failed to connect to Reddit. Please check your internet connection.',
        0,
        'auth'
      );
    }
  }

  async ensureAuth() {
    if (!this.accessToken || Date.now() >= this.expiresAt) {
      await this.getApplicationOnlyToken();
    }
  }

  private async handleResponse(response: Response, endpoint: string) {
    if (response.status === 404) {
      throw new RedditAPIError('Subreddit not found', 404, endpoint);
    }

    if (response.status === 403) {
      throw new RedditAPIError('This subreddit is private', 403, endpoint);
    }

    if (response.status === 429) {
      if (this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
        return null; // Signal retry
      }
      throw new RedditAPIError('Too many requests. Please try again later.', 429, endpoint);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new RedditAPIError(
        error.message || `Reddit API error (${response.status})`,
        response.status,
        endpoint
      );
    }

    this.retryCount = 0; // Reset retry count on success
    return response.json();
  }

  async request(endpoint: string, options: RequestInit = {}) {
    try {
      await this.ensureAuth();

      const response = await fetch(`https://oauth.reddit.com${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': 'SubPirate/1.0.0 (by /u/subpirate_bot)'
        }
      });

      const result = await this.handleResponse(response, endpoint);
      if (result === null) {
        return this.request(endpoint, options); // Retry
      }
      return result;
    } catch (error) {
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError(
        'Failed to connect to Reddit. Please check your internet connection.',
        0,
        endpoint
      );
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
    
    // Remove query parameters
    const cleanUrl = url.split('?')[0];
    
    // Handle special cases
    if (cleanUrl.includes('reddit_default')) return null;
    if (cleanUrl.includes('default-icon')) return null;
    
    return cleanUrl;
  }

  async getSubredditInfo(subreddit: string): Promise<SubredditInfo> {
    try {
      const data = await this.request(`/r/${subreddit}/about.json`);
      
      if (!data.data) {
        throw new RedditAPIError('Invalid response from Reddit API', 0, 'about');
      }

      const info = data.data;

      // Get subreddit rules
      const rulesData = await this.request(`/r/${subreddit}/about/rules.json`);
      const rules = rulesData.rules?.map((rule: any) => ({
        title: this.decodeHtmlEntities(rule.short_name || rule.title),
        description: this.decodeHtmlEntities(rule.description || '')
      })) || [];

      // Clean and validate icons
      const icon_img = this.cleanImageUrl(info.icon_img);
      const community_icon = this.cleanImageUrl(info.community_icon);

      return {
        name: info.display_name,
        title: this.decodeHtmlEntities(info.title || info.display_name),
        subscribers: info.subscribers || 0,
        active_users: info.active_user_count || 0,
        description: this.cleanMarkdown(this.decodeHtmlEntities(info.public_description || info.description || '')),
        created_utc: info.created_utc,
        over18: info.over_18 || false,
        icon_img,
        community_icon,
        rules
      };
    } catch (error) {
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError(
        'Failed to get subreddit information',
        0,
        'about'
      );
    }
  }

  async getSubredditPosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' = 'hot',
    limit = 100
  ): Promise<SubredditPost[]> {
    try {
      const data = await this.request(`/r/${subreddit}/${sort}.json?limit=${limit}`);
      
      if (!data.data?.children) {
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
          selftext: this.cleanMarkdown(this.decodeHtmlEntities(child.data.selftext || ''))
        }));
    } catch (error) {
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError(
        'Failed to get subreddit posts',
        0,
        'posts'
      );
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
            description: this.cleanMarkdown(this.decodeHtmlEntities(child.data.public_description || child.data.description || '')),
            created_utc: child.data.created_utc,
            over18: child.data.over_18 || false,
            icon_img,
            community_icon,
            rules: []
          };
        });
    } catch (error) {
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError(
        'Failed to search subreddits',
        0,
        'search'
      );
    }
  }

  async getUserPosts(username: string): Promise<UserPost[]> {
    try {
      const response = await fetch(`https://www.reddit.com/user/${username}/submitted.json?limit=100`);
      
      if (!response.ok) {
        throw new RedditAPIError(
          response.status === 404 ? 'User not found' : 'Failed to fetch user posts',
          response.status,
          'user_posts'
        );
      }

      const data = await response.json();
      
      if (!data.data?.children) {
        throw new RedditAPIError('Invalid response from Reddit API', 0, 'user_posts');
      }

      return data.data.children
        .filter((child: any) => child.data)
        .map((child: any) => ({
          id: child.data.id,
          title: this.decodeHtmlEntities(child.data.title),
          subreddit: child.data.subreddit,
          created_utc: child.data.created_utc,
          score: child.data.score,
          num_comments: child.data.num_comments,
          url: child.data.url,
          selftext: this.cleanMarkdown(this.decodeHtmlEntities(child.data.selftext || ''))
        }));
    } catch (error) {
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError(
        'Failed to analyze user. Please check the username and try again.',
        0,
        'user_posts'
      );
    }
  }
}

export const redditApi = new RedditAPI();