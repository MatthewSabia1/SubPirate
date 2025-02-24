/* src/features/subreddit-analysis/services/reddit.ts */

import fetch from 'node-fetch';
 
import { RedditAPIError } from './errors.js';

export class RedditAPI {
  async getSubredditStats(subreddit: string): Promise<any> {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/about.json`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new RedditAPIError(`Error fetching subreddit stats for ${subreddit}`);
      }
      const data = await response.json();
      // Transform fetched data into a standardized structure for analysis
      return {
        subreddit,
        subscribers: data.data.subscribers,
        activeUsers: data.data.active_user_count || 0,
        rules: data.data.rules || [],
        // Placeholder for additional fields
        requires_approval: false
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new RedditAPIError(error.message);
      } else {
        throw new RedditAPIError('Unknown error');
      }
    }
  }
} 