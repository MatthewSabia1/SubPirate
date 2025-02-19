import { redditApi } from './redditApi';
import type { SubredditInfo, SubredditPost } from './redditApi';

export type { SubredditInfo, SubredditPost };

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

export function parseSubredditName(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const cleaned = input.trim();
  if (!cleaned) {
    return '';
  }

  const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?reddit\.com\/r\/([^/?#]+)/i);
  if (urlMatch) {
    return urlMatch[1].toLowerCase();
  }

  const withoutPrefix = cleaned.replace(/^\/?(r\/)?/i, '').split(/[/?#]/)[0];
  return withoutPrefix.toLowerCase();
}

export async function getSubredditInfo(subreddit: string): Promise<SubredditInfo> {
  const cleanSubreddit = parseSubredditName(subreddit);
  
  if (!cleanSubreddit) {
    throw new RedditAPIError('Please enter a valid subreddit name');
  }

  try {
    return await redditApi.getSubredditInfo(cleanSubreddit);
  } catch (error) {
    if (error instanceof Error) {
      throw new RedditAPIError(error.message);
    }
    throw new RedditAPIError('Failed to fetch subreddit info');
  }
}

export async function getSubredditPosts(
  subreddit: string, 
  sort: 'hot' | 'new' | 'top' = 'hot',
  limit = 100
): Promise<SubredditPost[]> {
  const cleanSubreddit = parseSubredditName(subreddit);
  
  if (!cleanSubreddit) {
    throw new RedditAPIError('Please enter a valid subreddit name');
  }

  try {
    return await redditApi.getSubredditPosts(cleanSubreddit, sort, limit);
  } catch (error) {
    if (error instanceof Error) {
      throw new RedditAPIError(error.message);
    }
    throw new RedditAPIError('Failed to fetch subreddit posts');
  }
}

export async function searchSubreddits(query: string): Promise<SubredditInfo[]> {
  if (!query.trim()) {
    throw new RedditAPIError('Please enter a search query');
  }

  try {
    return await redditApi.searchSubreddits(query.trim());
  } catch (error) {
    if (error instanceof Error) {
      throw new RedditAPIError(error.message);
    }
    throw new RedditAPIError('Failed to search subreddits');
  }
}

export function calculateMarketingFriendliness(subreddit: SubredditInfo, posts: SubredditPost[]): number {
  let score = 0;
  const maxScore = 100;

  // Factor 1: Subscriber count (30%)
  const subscriberScore = Math.min(subreddit.subscribers / 1000000, 1) * 30;
  score += subscriberScore;

  // Factor 2: Active users ratio (20%)
  const avgEngagementRatio = posts.reduce((sum, post) => sum + (post.score + post.num_comments) / subreddit.subscribers, 0) / posts.length;
  const activeScore = Math.min(avgEngagementRatio * 10000, 1) * 20;
  score += activeScore;

  // Factor 3: Post engagement (30%)
  const avgEngagement = posts.reduce((sum, post) => sum + post.score + post.num_comments, 0) / posts.length;
  const engagementScore = Math.min(avgEngagement / 1000, 1) * 30;
  score += engagementScore;

  // Factor 4: Content restrictions (20%)
  if (subreddit.over18) {
    score -= 10;
  }

  return Math.max(0, Math.min(score, maxScore));
}