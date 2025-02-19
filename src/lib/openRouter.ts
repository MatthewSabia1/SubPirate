import axios from 'axios';

const OPENROUTER_API_KEY = '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';
const MODEL = 'deepseek/deepseek-chat';

interface SubredditAnalysisInput {
  name: string;
  title: string;
  subscribers: number;
  active_users: number;
  description: string;
  posts_per_day: number;
  historical_posts: {
    title: string;
    content: string;
    score: number;
    engagement_rate: number;
  }[];
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

function calculateMarketingScore(input: SubredditAnalysisInput): number {
  let score = 50; // Base score

  // Factor 1: Community Size and Activity (30 points)
  const subscriberScore = Math.min(input.subscribers / 1000000, 1) * 15;
  const activeUsersRatio = input.active_users / input.subscribers;
  const activityScore = Math.min(activeUsersRatio * 1000, 1) * 15;
  score += subscriberScore + activityScore;

  // Factor 2: Engagement Quality (30 points)
  const avgEngagement = input.engagement_metrics.interaction_rate;
  const engagementScore = Math.min(avgEngagement / 100, 1) * 30;
  score += engagementScore;

  // Factor 3: Rule Restrictions (-20 points max)
  const highImpactRules = input.rules.filter(r => r.marketingImpact === 'high').length;
  const mediumImpactRules = input.rules.filter(r => r.marketingImpact === 'medium').length;
  score -= (highImpactRules * 4) + (mediumImpactRules * 2);

  // Factor 4: Post Frequency and Timing (10 points)
  const postsPerDay = input.posts_per_day;
  const postFrequencyScore = Math.min(postsPerDay / 10, 1) * 10;
  score += postFrequencyScore;

  return Math.max(0, Math.min(100, Math.round(score)));
}

const systemPrompt = `You are an expert Reddit marketing analyst. Your task is to analyze subreddit data and provide detailed, actionable insights for content marketing.

Your analysis must be:
1. Data-driven: Base recommendations on the provided metrics
2. Specific: Provide concrete examples and actionable steps
3. Contextual: Consider the subreddit's rules and culture
4. Strategic: Focus on long-term success and community building

Key focus areas:
1. Content strategy aligned with subreddit rules
2. Posting guidelines and timing
3. Title patterns that drive engagement
4. Community-specific best practices
5. Risk mitigation strategies

Format your response according to the schema, ensuring all recommendations are:
- Practical and immediately actionable
- Compliant with subreddit rules
- Focused on value creation
- Engagement-optimized`;

function generateGamePlan(input: SubredditAnalysisInput): AIAnalysisOutput['gamePlan'] {
  const rules = input.rules;
  const engagement = input.engagement_metrics;
  const posts = input.historical_posts;

  // Analyze top-performing posts
  const topPosts = [...posts].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 5);
  const topPostPatterns = topPosts.map(post => {
    const hasQuestion = post.title.includes('?');
    const hasNumber = /\d+/.test(post.title);
    const length = post.title.length;
    return { hasQuestion, hasNumber, length };
  });

  // Generate immediate actions based on data
  const immediate = [
    'Review and document all subreddit rules in detail',
    `Analyze top ${topPosts.length} posts for content patterns`,
    'Set up post scheduling for optimal timing',
    'Create content templates aligned with successful posts'
  ];

  // Generate short-term strategy based on engagement
  const shortTerm = [
    `Focus on ${engagement.avg_comments > engagement.avg_score ? 'discussion-driven' : 'value-focused'} content`,
    'Build a content calendar for consistent posting',
    'Develop a unique voice that resonates with the community',
    'Start engaging with other community content'
  ];

  // Generate long-term strategy based on rules and patterns
  const longTerm = [
    'Establish authority through consistent, valuable contributions',
    'Build relationships with community moderators',
    'Create a library of proven content templates',
    'Develop a community engagement strategy'
  ];

  return {
    immediate,
    shortTerm,
    longTerm
  };
}

export async function analyzeSubreddit(input: SubredditAnalysisInput): Promise<AIAnalysisOutput> {
  try {
    // Calculate marketing friendliness score
    const marketingScore = calculateMarketingScore(input);

    // Generate game plan
    const gamePlan = generateGamePlan(input);

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: JSON.stringify({
              ...input,
              calculated_marketing_score: marketingScore,
              generated_game_plan: gamePlan
            })
          }
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://stackblitz.com',
          'X-Title': 'SubPirate'
        }
      }
    );

    const result = response.data.choices[0]?.message?.content;
    if (!result) {
      throw new AIAnalysisError('No analysis results received');
    }

    try {
      const parsedResult = JSON.parse(result);
      const output = validateAndTransformOutput(parsedResult);

      // Override AI's marketing score with our calculated score
      output.marketingFriendliness.score = marketingScore;

      // Override AI's game plan with our generated one
      output.gamePlan = gamePlan;

      return output;
    } catch (err) {
      throw new AIAnalysisError('Invalid analysis results format');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new AIAnalysisError(
        error.response?.data?.message || 'Failed to analyze subreddit',
        error.response?.status
      );
    }
    throw new AIAnalysisError('An unexpected error occurred during analysis');
  }
}

function validateAndTransformOutput(result: any): AIAnalysisOutput {
  // Ensure all required fields are present with reasonable defaults
  const output: AIAnalysisOutput = {
    postingLimits: {
      frequency: result.postingLimits?.frequency || 1,
      bestTimeToPost: result.postingLimits?.bestTimeToPost || ['9:00 AM', '3:00 PM', '7:00 PM'],
      contentRestrictions: result.postingLimits?.contentRestrictions || ['Follow subreddit rules']
    },
    titleTemplates: {
      patterns: result.titleTemplates?.patterns || ['[Topic] - Brief Description'],
      examples: result.titleTemplates?.examples || ['Example Title'],
      effectiveness: result.titleTemplates?.effectiveness || 75
    },
    contentStrategy: {
      recommendedTypes: result.contentStrategy?.recommendedTypes || ['text', 'image'],
      topics: result.contentStrategy?.topics || ['General Discussion'],
      style: result.contentStrategy?.style || 'Professional and informative',
      dos: result.contentStrategy?.dos || ['Be respectful', 'Follow rules'],
      donts: result.contentStrategy?.donts || ['No spam', 'No self-promotion']
    },
    strategicAnalysis: {
      strengths: result.strategicAnalysis?.strengths || ['Active community'],
      weaknesses: result.strategicAnalysis?.weaknesses || ['High competition'],
      opportunities: result.strategicAnalysis?.opportunities || ['Growing niche'],
      risks: result.strategicAnalysis?.risks || ['Content saturation']
    },
    marketingFriendliness: {
      score: result.marketingFriendliness?.score || 50,
      reasons: result.marketingFriendliness?.reasons || ['Moderate engagement'],
      recommendations: result.marketingFriendliness?.recommendations || ['Focus on value']
    },
    gamePlan: result.gamePlan || {
      immediate: ['Review rules'],
      shortTerm: ['Build presence'],
      longTerm: ['Establish authority']
    }
  };

  return output;
}