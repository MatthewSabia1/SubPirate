import axios from 'axios';
import type { SubredditPost } from './reddit';

const OPENROUTER_API_KEY = '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';
const MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct:free';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface SubredditAnalysisInput {
  name: string;
  title: string;
  subscribers: number;
  active_users: number;
  description: string;
  posts_per_day: number;
  historical_posts: SubredditPost[];
  engagement_metrics: {
    avg_comments: number;
    avg_score: number;
    peak_hours: number[];
    interaction_rate: number;
    posts_per_hour: number[];
  };
  rules: {
    title: string;
    description: string;
    priority: number;
    marketingImpact: 'high' | 'medium' | 'low';
  }[];
}

interface AIAnalysisOutput {
  postingLimits: {
    frequency: number;
    bestTimeToPost: string[];
    contentRestrictions: string[];
  };
  titleTemplates: {
    patterns: string[];
    examples: string[];
    effectiveness: number;
  };
  contentStrategy: {
    recommendedTypes: string[];
    topics: string[];
    style: string;
    dos: string[];
    donts: string[];
  };
  strategicAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    risks: string[];
  };
  marketingFriendliness: {
    score: number;
    reasons: string[];
    recommendations: string[];
  };
  gamePlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export class AIAnalysisError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'AIAnalysisError';
  }
}

const systemPrompt = `You are an expert Reddit marketing analyst. Analyze the provided subreddit data and generate a comprehensive marketing intelligence report. Focus on actionable insights and specific recommendations. Your response must be valid JSON matching this schema:

{
  "marketingFriendliness": {
    "score": number,
    "reasons": string[],
    "recommendations": string[]
  },
  "postingLimits": {
    "frequency": number,
    "bestTimeToPost": string[],
    "contentRestrictions": string[]
  },
  "contentStrategy": {
    "recommendedTypes": string[],
    "topics": string[],
    "style": string,
    "dos": string[],
    "donts": string[]
  },
  "titleTemplates": {
    "patterns": string[],
    "examples": string[],
    "effectiveness": number
  },
  "strategicAnalysis": {
    "strengths": string[],
    "weaknesses": string[],
    "opportunities": string[],
    "risks": string[]
  },
  "gamePlan": {
    "immediate": string[],
    "shortTerm": string[],
    "longTerm": string[]
  }
}`;

function calculatePostingFrequency(posts: SubredditPost[]): { frequency: number; bestTimes: string[] } {
  // Group posts by hour
  const postsByHour = new Map<number, number>();
  posts.forEach(post => {
    const hour = new Date(post.created_utc * 1000).getHours();
    postsByHour.set(hour, (postsByHour.get(hour) || 0) + 1);
  });

  const sortedHours = Array.from(postsByHour.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const bestTimes = sortedHours.map(([hour]) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period} UTC`;
  });

  // Calculate posts per day based on time span if possible
  let postsPerDay;
  if (posts.length > 1) {
    const times = posts.map(p => p.created_utc);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const daysSpan = (maxTime - minTime) / 86400;
    postsPerDay = daysSpan > 0 ? posts.length / daysSpan : posts.length;
  } else {
    postsPerDay = posts.length / 7; // fallback
  }

  let frequency = Math.min(Math.ceil(postsPerDay), 3);
  if (frequency < 1) frequency = 1;

  return { frequency, bestTimes };
}

function analyzeContentTypes(posts: SubredditPost[]): string[] {
  const types = new Set<string>();
  
  posts.forEach(post => {
    if (post.selftext) types.add('text');
    if (post.preview_url) types.add('image');
    if (post.url && !post.preview_url && !post.selftext) types.add('link');
    // Add video detection logic if available in the API response
  });

  return Array.from(types);
}

function generateTitleTemplates(posts: SubredditPost[]): {
  patterns: string[];
  examples: string[];
  effectiveness: number;
} {
  if (posts.length === 0) {
    return {
      patterns: ['Descriptive Statement about Topic'],
      examples: ['No data available'],
      effectiveness: 50
    };
  }

  // Analyze successful posts (top 25% by score)
  const sortedPosts = [...posts].sort((a, b) => b.score - a.score);
  const topPosts = sortedPosts.slice(0, Math.ceil(posts.length * 0.25));

  const patterns: string[] = [];
  const examples: string[] = [];

  const hasQuestions = topPosts.some(post => post.title.includes('?'));
  const hasNumbers = topPosts.some(post => /\d+/.test(post.title));
  const hasBrackets = topPosts.some(post => /\[.*?\]/.test(post.title));

  if (hasBrackets) {
    patterns.push('[Topic] Description');
  }
  if (hasQuestions) {
    patterns.push('Question about Topic?');
  }
  if (hasNumbers) {
    patterns.push('Number + Key Point');
  }
  if (patterns.length === 0) {
    patterns.push('Descriptive Statement about Topic');
  }

  examples.push(...topPosts.slice(0, 2).map(post => post.title));

  const avgTopScore = topPosts.reduce((sum, post) => sum + post.score, 0) / topPosts.length;
  const avgAllScore = posts.reduce((sum, post) => sum + post.score, 0) / posts.length;
  const effectiveness = avgAllScore > 0 ? Math.min(Math.round((avgTopScore / avgAllScore) * 70), 100) : 0;

  return {
    patterns,
    examples,
    effectiveness
  };
}

function generateContentStrategy(input: SubredditAnalysisInput, posts: SubredditPost[]): {
  recommendedTypes: string[];
  topics: string[];
  style: string;
  dos: string[];
  donts: string[];
} {
  // Analyze successful content types
  const contentTypes = analyzeContentTypes(posts);
  // Analyze post performance by type
  const performanceByType = new Map<string, number>();
  posts.forEach(post => {
    const type = post.selftext ? 'text' : 
                post.preview_url ? 'image' : 'link';
    const score = post.score + post.num_comments;
    performanceByType.set(type, (performanceByType.get(type) || 0) + score);
  });

  // Sort content types by performance
  const sortedTypes = Array.from(performanceByType.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type);

  // Extract key topics and themes
  const topPosts = posts.sort((a, b) => b.score - a.score).slice(0, 10);
  const topics = extractTopics(topPosts);

  // Determine content style based on community analysis
  const style = determineContentStyle(input, posts);

  // Generate specific best practices
  const dos = [
    `Post during peak engagement hours: ${formatTimeRanges(input.engagement_metrics.peak_hours)}`,
    `Focus on ${sortedTypes[0]} content with ${style.toLowerCase()} approach`,
    `Include community-specific keywords: ${topics.slice(0, 3).join(', ')}`,
    'Engage actively in post comments within first 2 hours',
    'Follow community formatting guidelines'
  ];

  // Generate restrictions based on rules and data
  const donts = [
    ...input.rules
      .filter(r => r.marketingImpact === 'high')
      .map(r => `Avoid ${r.title.toLowerCase()}`),
    'No excessive self-promotion or spam',
    'Avoid posting during low-activity hours',
    'Don\'t use clickbait or misleading titles',
    'Don\'t ignore community feedback'
  ].slice(0, 5);

  return {
    recommendedTypes: sortedTypes.length > 0 ? sortedTypes : (contentTypes.length ? contentTypes : ['text']),
    topics,
    style,
    dos,
    donts
  };
}

function generateGamePlan(input: SubredditAnalysisInput): AIAnalysisOutput['gamePlan'] {
  // Analyze posting patterns
  const postingPatterns = analyzePostingPatterns(input.historical_posts);
  
  // Analyze rule impact
  const ruleImpact = analyzeRuleImpact(input.rules);
  
  // Generate immediate actions based on current state
  const immediate = [
    `Optimize posting schedule for ${postingPatterns.bestDays.join(', ')} at ${postingPatterns.bestTimes.join(', ')}`,
    `Focus on ${ruleImpact.allowedTypes.join(' and ')} content formats`,
    `Build credibility through ${input.engagement_metrics.avg_comments > input.engagement_metrics.avg_score ? 'community discussions' : 'valuable insights'}`
  ];

  // Generate short-term strategy
  const shortTerm = [
    `Develop a content calendar focusing on ${postingPatterns.frequency} posts per day`,
    `Create templates for ${ruleImpact.allowedTypes[0]} posts that align with community guidelines`,
    `Build relationships with active community members through meaningful interactions`
  ];

  // Generate long-term strategy
  const longTerm = [
    'Establish thought leadership through consistent, high-quality contributions',
    'Create a recognizable brand voice that resonates with the community',
    'Develop a network of supporters through genuine engagement'
  ];

  return {
    immediate,
    shortTerm,
    longTerm
  };
}

// Helper functions
function extractTopics(posts: SubredditPost[]): string[] {
  const wordFreq: Record<string, number> = {};
  const stopwords = new Set(["the", "and", "a", "to", "of", "in", "is", "it", "that", "for", "on", "with", "as", "at", "by", "an", "be", "i", "you", "this", "are", "from"]);
  
  posts.forEach(post => {
    post.title.toLowerCase()
      .split(/\W+/)
      .filter(word => word && !stopwords.has(word))
      .forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
  });

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function determineContentStyle(input: SubredditAnalysisInput, posts: SubredditPost[]): string {
  const avgComments = input.engagement_metrics.avg_comments;
  const avgScore = input.engagement_metrics.avg_score;
  const hasDiscussions = posts.some(p => p.num_comments > p.score * 2);
  
  if (avgComments > avgScore * 1.5) {
    return 'Discussion-focused and interactive';
  } else if (hasDiscussions) {
    return 'Balanced mix of information and discussion';
  } else {
    return 'Informative and value-driven';
  }
}

function formatTimeRanges(hours: number[]): string {
  return hours.map(hour => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}${period}`;
  }).join(', ');
}

function analyzePostingPatterns(posts: SubredditPost[]): {
  frequency: number;
  bestDays: string[];
  bestTimes: string[];
} {
  const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const postsByDay = new Map<string, number>();
  const postsByHour = new Map<number, number>();

  posts.forEach(post => {
    const date = new Date(post.created_utc * 1000);
    const day = dayMap[date.getDay()];
    const hour = date.getHours();

    postsByDay.set(day, (postsByDay.get(day) || 0) + 1);
    postsByHour.set(hour, (postsByHour.get(hour) || 0) + 1);
  });

  const bestDays = Array.from(postsByDay.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([day]) => day);

  const bestTimes = Array.from(postsByHour.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}${period}`;
    });

  return {
    frequency: Math.ceil(posts.length / 7),
    bestDays,
    bestTimes
  };
}

function analyzeRuleImpact(rules: SubredditAnalysisInput['rules']): {
  allowedTypes: string[];
  restrictions: string[];
  marketingImpact: 'high' | 'medium' | 'low';
} {
  const contentRestrictions = rules
    .filter(r => r.marketingImpact === 'high')
    .map(r => r.title);

  const defaultTypes = ['text', 'link'];
  const restrictedTypes = new Set<string>();

  rules.forEach(rule => {
    const description = rule.description.toLowerCase();
    if (description.includes('image') && description.includes('not allowed')) {
      restrictedTypes.add('image');
    }
    if (description.includes('video') && description.includes('not allowed')) {
      restrictedTypes.add('video');
    }
  });

  const allowedTypes = defaultTypes.filter(type => !restrictedTypes.has(type));

  const marketingImpact = rules.filter(r => r.marketingImpact === 'high').length > 2 ? 'high' :
                         rules.filter(r => r.marketingImpact === 'medium').length > 3 ? 'medium' : 'low';

  return {
    allowedTypes,
    restrictions: contentRestrictions,
    marketingImpact
  };
}

function calculateMarketingScore(input: SubredditAnalysisInput): number {
  // Initialize scoring components
  const scores: { [key: string]: number } = {
    communitySize: 0,        // Max 20 points
    activityRatio: 0,       // Max 15 points
    engagement: 0,          // Max 25 points
    contentFlexibility: 0,  // Max 20 points
    activityFrequency: 0,   // Max 20 points
  };

  // 1. Community Size Score (20 points) - Logarithmic scale
  const subscriberTiers = [
    { threshold: 1000000, score: 20 },   // 1M+
    { threshold: 500000, score: 18 },    // 500K+
    { threshold: 100000, score: 16 },    // 100K+
    { threshold: 50000, score: 14 },     // 50K+
    { threshold: 10000, score: 12 },     // 10K+
    { threshold: 5000, score: 10 },      // 5K+
    { threshold: 1000, score: 8 },       // 1K+
  ];
  
  for (const tier of subscriberTiers) {
    if (input.subscribers >= tier.threshold) {
      scores.communitySize = tier.score;
      break;
    }
  }
  if (scores.communitySize === 0 && input.subscribers > 0) {
    scores.communitySize = 6; // Base score for any active community
  }

  // 2. Activity Ratio Score (15 points) - Square root scaling for better distribution
  if (input.subscribers > 0) {
    const activeRatio = (input.active_users / input.subscribers) * 100;
    // Using square root to balance the ratio
    scores.activityRatio = Math.min(15, Math.round(Math.sqrt(activeRatio) * 3));
  }

  // 3. Engagement Score (25 points)
  const avgEngagement = input.engagement_metrics.avg_comments + (input.engagement_metrics.avg_score * 0.5);
  const engagementRate = (avgEngagement / input.subscribers) * 100;
  
  // Logarithmic scaling for engagement
  if (engagementRate > 0) {
    scores.engagement = Math.min(25, Math.round(5 * Math.log10(engagementRate * 100 + 1)));
  }

  // 4. Content Flexibility Score (20 points)
  // Start with maximum and deduct based on restrictions
  scores.contentFlexibility = 20;
  
  // Count high and medium impact rules
  const highImpactRules = input.rules.filter(r => r.marketingImpact === 'high').length;
  const mediumImpactRules = input.rules.filter(r => r.marketingImpact === 'medium').length;
  
  // Deduct points based on rule impact
  scores.contentFlexibility -= (highImpactRules * 3);    // -3 points per high impact rule
  scores.contentFlexibility -= (mediumImpactRules * 1);  // -1 point per medium impact rule
  
  // Ensure minimum of 0
  scores.contentFlexibility = Math.max(0, scores.contentFlexibility);

  // 5. Activity Frequency Score (20 points)
  // Score based on posts per day with diminishing returns
  const postsPerDay = input.posts_per_day;
  if (postsPerDay > 0) {
    scores.activityFrequency = Math.min(20, Math.round(Math.sqrt(postsPerDay) * 8));
  }

  // Calculate final score
  let finalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

  // Apply bonus/penalty adjustments
  // Bonus for highly engaged communities
  if (scores.engagement > 20 && scores.activityRatio > 10) {
    finalScore += 5;
  }

  // Penalty for extremely restrictive communities
  if (highImpactRules > 5) {
    finalScore -= 10;
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(finalScore)));
}

// Add this type for better type safety
interface MarketingScoreFactors {
  communitySize: number;
  activityRatio: number;
  engagement: number;
  contentFlexibility: number;
  activityFrequency: number;
}

// Add interface for database schema compatibility
export interface SubredditDBRecord {
  id: string;
  name: string;
  subscriber_count: number;
  active_users: number;
  marketing_friendly_score: number;
  posting_requirements: {
    restrictions: string[];
    bestTimes: string[];
    bestDays?: string[];
  };
  posting_frequency: {
    frequency: number;
    recommendedTypes: string[];
  };
  allowed_content: string[];
  best_practices: string[];
  rules_summary: string | null;
  title_template: string | null;
  last_analyzed_at: string;
  created_at: string;
  updated_at: string;
  icon_img: string | null;
  community_icon: string | null;
  total_posts_24h: number;
  last_post_sync: string | null;
  analysis_data: AIAnalysisOutput;
}

export async function analyzeSubreddit(input: SubredditAnalysisInput): Promise<AIAnalysisOutput> {
  const MAX_RETRIES = 2;
  const TIMEOUT = 120000; // 120 seconds
  let retries = 0;

  while (retries <= MAX_RETRIES) {
    try {
      // Simplify input for the prompt
      const simplifiedInput = {
        name: input.name,
        subscribers: input.subscribers,
        active_users: input.active_users,
        posts_per_day: input.posts_per_day,
        engagement: {
          avg_comments: input.engagement_metrics.avg_comments,
          avg_score: input.engagement_metrics.avg_score,
          peak_hours: input.engagement_metrics.peak_hours,
          interaction_rate: input.engagement_metrics.interaction_rate
        },
        rules: input.rules.map(rule => ({
          title: rule.title,
          description: rule.description,
          impact: rule.marketingImpact
        }))
      };

      const systemPrompt = `You are an expert Reddit marketing analyst. Analyze the provided subreddit data and generate a comprehensive marketing intelligence report. Focus on actionable insights and specific recommendations. Your response must be valid JSON matching this schema:

{
  "marketingFriendliness": {
    "score": number,
    "reasons": string[],
    "recommendations": string[]
  },
  "postingLimits": {
    "frequency": number,
    "bestTimeToPost": string[],
    "contentRestrictions": string[]
  },
  "contentStrategy": {
    "recommendedTypes": string[],
    "topics": string[],
    "style": string,
    "dos": string[],
    "donts": string[]
  },
  "titleTemplates": {
    "patterns": string[],
    "examples": string[],
    "effectiveness": number
  },
  "strategicAnalysis": {
    "strengths": string[],
    "weaknesses": string[],
    "opportunities": string[],
    "risks": string[]
  },
  "gamePlan": {
    "immediate": string[],
    "shortTerm": string[],
    "longTerm": string[]
  }
}`;

      const response = await axios.post(
        API_URL,
        {
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(simplifiedInput, null, 2) }
          ],
          max_tokens: 2000,
          temperature: 0.7,
          stream: false,
          response_format: { type: 'json' }
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'SubPirate - Reddit Marketing Analysis',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: TIMEOUT,
          validateStatus: (status) => status >= 200 && status < 300
        }
      );

      const choice = response.data?.choices?.[0];
      if (!choice?.message?.content) {
        throw new AIAnalysisError('No analysis results received');
      }

      let parsedResult;
      try {
        // First try to parse as direct JSON
        parsedResult = typeof choice.message.content === 'string' 
          ? JSON.parse(choice.message.content.trim())
          : choice.message.content;
      } catch (err) {
        // If direct parsing fails, try to extract JSON from markdown
        const markdownMatch = choice.message.content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (markdownMatch) {
          try {
            parsedResult = JSON.parse(markdownMatch[1].trim());
          } catch (jsonErr) {
            console.error('Failed to parse JSON from markdown block:', jsonErr);
            throw new AIAnalysisError('Invalid response format from API');
          }
        } else {
          throw new AIAnalysisError('Invalid response format from API');
        }
      }

      // Validate the parsed result has all required fields
      if (!parsedResult.marketingFriendliness ||
          !parsedResult.postingLimits ||
          !parsedResult.contentStrategy ||
          !parsedResult.titleTemplates ||
          !parsedResult.strategicAnalysis ||
          !parsedResult.gamePlan) {
        throw new AIAnalysisError('Incomplete analysis results');
      }

      return parsedResult;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' && retries < MAX_RETRIES) {
          retries++;
          console.log(`Retry ${retries} after timeout...`);
          continue;
        }
        if (error.response?.status === 429 && retries < MAX_RETRIES) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 2000 * retries));
          continue;
        }
        if (error.response?.status === 500 && retries < MAX_RETRIES) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          continue;
        }
        
        const status = error.response?.status;
        const message = error.response?.data?.error || error.message;
        throw new AIAnalysisError(getErrorMessage(status, message), status);
      }
      throw error;
    }
  }
  
  throw new AIAnalysisError('Maximum retries exceeded');
}

// Helper function for error messages
function getErrorMessage(status?: number, message?: string): string {
  const TIMEOUT_SECONDS = 120; // Match the TIMEOUT constant

  switch (status) {
    case 402:
      return 'API credits depleted. Please check your balance.';
    case 408:
      return `Analysis timed out after ${TIMEOUT_SECONDS} seconds. Please try again with a smaller dataset.`;
    case 429:
      return 'Rate limit exceeded. Please try again in a few moments.';
    case 500:
      return 'OpenRouter service is experiencing issues. Please try again later.';
    default:
      if (message === 'ECONNABORTED') {
        return `Analysis timed out after ${TIMEOUT_SECONDS} seconds. Please try again with a smaller dataset.`;
      }
      return message || 'An unexpected error occurred during analysis.';
  }
}

// Add JSON schema for OpenRouter API
const AIOutputSchema = {
  type: 'object',
  properties: {
    postingLimits: {
      type: 'object',
      properties: {
        frequency: { type: 'number' },
        bestTimeToPost: { type: 'array', items: { type: 'string' } },
        contentRestrictions: { type: 'array', items: { type: 'string' } }
      },
      required: ['frequency', 'bestTimeToPost', 'contentRestrictions']
    },
    titleTemplates: {
      type: 'object',
      properties: {
        patterns: { type: 'array', items: { type: 'string' } },
        examples: { type: 'array', items: { type: 'string' } },
        effectiveness: { type: 'number' }
      },
      required: ['patterns', 'examples', 'effectiveness']
    },
    contentStrategy: {
      type: 'object',
      properties: {
        recommendedTypes: { type: 'array', items: { type: 'string' } },
        topics: { type: 'array', items: { type: 'string' } },
        style: { type: 'string' },
        dos: { type: 'array', items: { type: 'string' } },
        donts: { type: 'array', items: { type: 'string' } }
      },
      required: ['recommendedTypes', 'topics', 'style', 'dos', 'donts']
    },
    strategicAnalysis: {
      type: 'object',
      properties: {
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        opportunities: { type: 'array', items: { type: 'string' } },
        risks: { type: 'array', items: { type: 'string' } }
      },
      required: ['strengths', 'weaknesses', 'opportunities', 'risks']
    },
    marketingFriendliness: {
      type: 'object',
      properties: {
        score: { type: 'number' },
        reasons: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } }
      },
      required: ['score', 'reasons', 'recommendations']
    },
    gamePlan: {
      type: 'object',
      properties: {
        immediate: { type: 'array', items: { type: 'string' } },
        shortTerm: { type: 'array', items: { type: 'string' } },
        longTerm: { type: 'array', items: { type: 'string' } }
      },
      required: ['immediate', 'shortTerm', 'longTerm']
    }
  },
  required: ['postingLimits', 'titleTemplates', 'contentStrategy', 'strategicAnalysis', 'marketingFriendliness', 'gamePlan']
};

function validateAndTransformOutput(result: unknown): AIAnalysisOutput {
  let parsedResult: any = result;
  
  try {
    // Handle string results that might be markdown-formatted
    if (typeof parsedResult === 'string') {
      // Try to extract JSON from markdown code block if present
      const markdownMatch = parsedResult.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (markdownMatch) {
        try {
          parsedResult = JSON.parse(markdownMatch[1].trim());
        } catch (jsonErr) {
          console.error('Failed to parse JSON from markdown block:', jsonErr);
          // Continue with original string if markdown parsing fails
        }
      }
      
      // If not markdown or markdown parsing failed, try parsing the whole string
      if (typeof parsedResult === 'string') {
        try {
          parsedResult = JSON.parse(parsedResult);
        } catch (err) {
          console.error('Failed to parse result string:', err);
        }
      }
    }

    // Rest of the validation logic remains the same
    const output: AIAnalysisOutput = {
      postingLimits: {
        frequency: parsedResult?.postingLimits?.frequency || 1,
        bestTimeToPost: Array.isArray(parsedResult?.postingLimits?.bestTimeToPost) 
          ? parsedResult.postingLimits.bestTimeToPost.map(String)
          : ['9:00 AM', '3:00 PM', '7:00 PM'],
        contentRestrictions: Array.isArray(parsedResult?.postingLimits?.contentRestrictions)
          ? parsedResult.postingLimits.contentRestrictions.map(String)
          : ['Follow subreddit rules']
      },
      titleTemplates: {
        patterns: Array.isArray(parsedResult?.titleTemplates?.patterns)
          ? parsedResult.titleTemplates.patterns.map(String)
          : ['[Topic] - Brief Description'],
        examples: Array.isArray(parsedResult?.titleTemplates?.examples)
          ? parsedResult.titleTemplates.examples.map(String)
          : ['Example Title'],
        effectiveness: typeof parsedResult?.titleTemplates?.effectiveness === 'number'
          ? Math.min(100, Math.max(0, parsedResult.titleTemplates.effectiveness))
          : 75
      },
      contentStrategy: {
        recommendedTypes: Array.isArray(parsedResult?.contentStrategy?.recommendedTypes)
          ? parsedResult.contentStrategy.recommendedTypes.map(String)
          : ['text', 'image'],
        topics: Array.isArray(parsedResult?.contentStrategy?.topics)
          ? parsedResult.contentStrategy.topics.map(String)
          : ['General Discussion'],
        style: String(parsedResult?.contentStrategy?.style || 'Professional and informative'),
        dos: Array.isArray(parsedResult?.contentStrategy?.dos)
          ? parsedResult.contentStrategy.dos.map(String)
          : ['Be respectful', 'Follow rules'],
        donts: Array.isArray(parsedResult?.contentStrategy?.donts)
          ? parsedResult.contentStrategy.donts.map(String)
          : ['No spam', 'No self-promotion']
      },
      strategicAnalysis: {
        strengths: Array.isArray(parsedResult?.strategicAnalysis?.strengths)
          ? parsedResult.strategicAnalysis.strengths.map(String)
          : ['Active community'],
        weaknesses: Array.isArray(parsedResult?.strategicAnalysis?.weaknesses)
          ? parsedResult.strategicAnalysis.weaknesses.map(String)
          : ['High competition'],
        opportunities: Array.isArray(parsedResult?.strategicAnalysis?.opportunities)
          ? parsedResult.strategicAnalysis.opportunities.map(String)
          : ['Growing niche'],
        risks: Array.isArray(parsedResult?.strategicAnalysis?.risks)
          ? parsedResult.strategicAnalysis.risks.map(String)
          : ['Content saturation']
      },
      marketingFriendliness: {
        score: typeof parsedResult?.marketingFriendliness?.score === 'number'
          ? Math.min(100, Math.max(0, parsedResult.marketingFriendliness.score))
          : 50,
        reasons: Array.isArray(parsedResult?.marketingFriendliness?.reasons)
          ? parsedResult.marketingFriendliness.reasons.map(String)
          : ['Moderate engagement'],
        recommendations: Array.isArray(parsedResult?.marketingFriendliness?.recommendations)
          ? parsedResult.marketingFriendliness.recommendations.map(String)
          : ['Focus on value']
      },
      gamePlan: {
        immediate: Array.isArray(parsedResult?.gamePlan?.immediate)
          ? parsedResult.gamePlan.immediate.map(String)
          : ['Review rules'],
        shortTerm: Array.isArray(parsedResult?.gamePlan?.shortTerm)
          ? parsedResult.gamePlan.shortTerm.map(String)
          : ['Build presence'],
        longTerm: Array.isArray(parsedResult?.gamePlan?.longTerm)
          ? parsedResult.gamePlan.longTerm.map(String)
          : ['Establish authority']
      }
    };

    return output;
  } catch (error) {
    console.error('Error validating output:', error);
    // Return a safe default output
    return {
      postingLimits: {
        frequency: 1,
        bestTimeToPost: ['9:00 AM', '3:00 PM', '7:00 PM'],
        contentRestrictions: ['Follow subreddit rules']
      },
      titleTemplates: {
        patterns: ['[Topic] - Brief Description'],
        examples: ['Example Title'],
        effectiveness: 75
      },
      contentStrategy: {
        recommendedTypes: ['text', 'image'],
        topics: ['General Discussion'],
        style: 'Professional and informative',
        dos: ['Be respectful', 'Follow rules'],
        donts: ['No spam', 'No self-promotion']
      },
      strategicAnalysis: {
        strengths: ['Active community'],
        weaknesses: ['High competition'],
        opportunities: ['Growing niche'],
        risks: ['Content saturation']
      },
      marketingFriendliness: {
        score: 50,
        reasons: ['Moderate engagement'],
        recommendations: ['Focus on value']
      },
      gamePlan: {
        immediate: ['Review rules'],
        shortTerm: ['Build presence'],
        longTerm: ['Establish authority']
      }
    };
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}