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
  icon_img: string;
  community_icon: string;
  rules: Array<{
    title: string;
    description: string;
  }>;
}

export interface SubredditPost {
  id: string;
  title: string;
  author: string;
  created_utc: number;
  score: number;
  num_comments: number;
  url: string;
  selftext: string;
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

  private getSubredditIcon(info: any): { icon_img: string; community_icon: string } {
    let icon_img = '';
    let community_icon = '';

    // Try to get community icon first
    if (info.community_icon) {
      community_icon = info.community_icon.split('?')[0]; // Remove query parameters
    }

    // Fallback to icon_img if no community icon
    if (info.icon_img) {
      icon_img = info.icon_img.split('?')[0]; // Remove query parameters
    }

    return { icon_img, community_icon };
  }

  async getSubredditInfo(subreddit: string): Promise<SubredditInfo> {
    try {
      const data = await this.request(`/r/${subreddit}/about.json`);
      
      if (!data.data) {
        throw new RedditAPIError('Invalid response from Reddit API', 0, 'about');
      }

      const info = data.data;
      const { icon_img, community_icon } = this.getSubredditIcon(info);

      // Get subreddit rules
      const rulesData = await this.request(`/r/${subreddit}/about/rules.json`);
      const rules = rulesData.rules?.map((rule: any) => ({
        title: this.decodeHtmlEntities(rule.short_name || rule.title),
        description: this.decodeHtmlEntities(rule.description || '')
      })) || [];

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
          const { icon_img, community_icon } = this.getSubredditIcon(child.data);
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
}

export const redditApi = new RedditAPI();