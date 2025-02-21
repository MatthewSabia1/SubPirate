import { SubredditInfo, SubredditPost } from './reddit';
import { analyzeSubreddit, AIAnalysisError } from './openRouter';

export interface AnalysisProgress {
  status: string;
  progress: number;
  indeterminate: boolean;
}

export interface AnalysisResult {
  info: SubredditInfo & {
    rules: Array<{
      title: string;
      description: string;
      marketingImpact: 'high' | 'medium' | 'low';
    }>;
  };
  posts: SubredditPost[];
  analysis: {
    marketingFriendliness: {
      score: number;
      reasons: string[];
      recommendations: string[];
    };
    postingGuidelines: {
      frequency: number;
      bestTimes: string[];
      restrictions: string[];
    };
    contentStrategy: {
      recommendedTypes: string[];
      topics: string[];
      style: string;
      dos: string[];
      donts: string[];
    };
    titleTemplates: {
      patterns: string[];
      examples: string[];
      effectiveness: number;
    };
    strategicAnalysis: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      risks: string[];
    };
    gamePlan: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
  };
}

function calculateEngagementMetrics(posts: SubredditPost[]) {
  const totalPosts = posts.length;
  if (totalPosts === 0) return null;

  const avgComments = posts.reduce((sum, post) => sum + post.num_comments, 0) / totalPosts;
  const avgScore = posts.reduce((sum, post) => sum + post.score, 0) / totalPosts;
  
  // Calculate posts per hour
  const postTimes = posts.map(post => new Date(post.created_utc * 1000).getHours());
  const hourCounts = new Array(24).fill(0);
  postTimes.forEach(hour => hourCounts[hour]++);
  
  // Find peak hours (hours with most posts)
  const maxPosts = Math.max(...hourCounts);
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter(({ count }) => count >= maxPosts * 0.8)
    .map(({ hour }) => hour);

  const interactionRate = (avgComments + avgScore) / totalPosts;

  return {
    avg_comments: avgComments,
    avg_score: avgScore,
    peak_hours: peakHours,
    interaction_rate: interactionRate,
    posts_per_hour: hourCounts
  };
}

function analyzeRuleMarketingImpact(rule: { title: string; description: string }): 'high' | 'medium' | 'low' {
  const text = `${rule.title} ${rule.description}`.toLowerCase();
  
  // Keywords that indicate high marketing impact
  const highImpactKeywords = [
    'spam', 'promotion', 'advertising', 'marketing', 'self-promotion',
    'commercial', 'business', 'selling', 'merchandise', 'affiliate'
  ];
  
  // Keywords that indicate medium marketing impact
  const mediumImpactKeywords = [
    'quality', 'format', 'title', 'flair', 'tags',
    'submission', 'guidelines', 'requirements', 'posting'
  ];
  
  // Check for high impact keywords first
  if (highImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'high';
  }
  
  // Then check for medium impact keywords
  if (mediumImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'medium';
  }
  
  // Default to low impact
  return 'low';
}

function prepareAnalysisInput(info: SubredditInfo, posts: SubredditPost[]) {
  const engagement = calculateEngagementMetrics(posts);
  if (!engagement) {
    throw new Error('Not enough post data for analysis');
  }

  const historicalPosts = posts.map(post => ({
    title: post.title,
    content: post.selftext,
    score: post.score,
    engagement_rate: (post.score + post.num_comments) / engagement.interaction_rate
  }));

  // Analyze marketing impact for each rule
  const rulesWithImpact = info.rules.map(rule => ({
    ...rule,
    marketingImpact: analyzeRuleMarketingImpact(rule)
  }));

  return {
    name: info.name,
    title: info.title,
    subscribers: info.subscribers,
    active_users: info.active_users,
    description: info.description,
    posts_per_day: posts.length / 7, // Assuming posts are from last 7 days
    historical_posts: historicalPosts,
    engagement_metrics: engagement,
    rules: rulesWithImpact.map((rule, index) => ({
      title: rule.title,
      description: rule.description,
      priority: index + 1,
      marketingImpact: rule.marketingImpact
    }))
  };
}

function formatBestPostingTimes(peakHours: number[]): string[] {
  return peakHours.map(hour => {
    const period = hour < 12 ? 'AM' : 'PM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:00 ${period} - ${formattedHour}:59 ${period}`;
  });
}

function getRecommendedContentTypes(posts: SubredditPost[]): string[] {
  const types = new Set<string>();
  
  posts.forEach(post => {
    if (post.selftext.length > 0) types.add('text');
    if (post.url.match(/\.(jpg|jpeg|png|gif)$/i)) types.add('image');
    if (post.url.match(/\.(mp4|webm)$/i)) types.add('video');
    if (post.url.match(/^https?:\/\//) && !post.url.match(/\.(jpg|jpeg|png|gif|mp4|webm)$/i)) {
      types.add('link');
    }
  });

  return Array.from(types);
}

function calculateMarketingScore(input: any): number {
  let score = 50; // Base score

  // Factor 1: Community Size and Activity (30 points)
  const subscriberScore = Math.min((input.subscribers || 0) / 1000000, 1) * 15;
  const activeUsersRatio = (input.active_users || 0) / (input.subscribers || 1);
  const activityScore = Math.min(activeUsersRatio * 1000, 1) * 15;
  score += subscriberScore + activityScore;

  // Factor 2: Engagement Quality (30 points)
  const avgEngagement = input.engagement_metrics?.interaction_rate || 0;
  const engagementScore = Math.min(avgEngagement / 100, 1) * 30;
  score += engagementScore;

  // Factor 3: Rule Restrictions (-20 points max)
  const highImpactRules = (input.rules || []).filter(r => r.marketingImpact === 'high').length;
  const mediumImpactRules = (input.rules || []).filter(r => r.marketingImpact === 'medium').length;
  score -= (highImpactRules * 4) + (mediumImpactRules * 2);

  // Factor 4: Post Frequency and Timing (10 points)
  const postsPerDay = input.posts_per_day || 0;
  const postFrequencyScore = Math.min(postsPerDay / 10, 1) * 10;
  score += postFrequencyScore;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function analyzeSubredditData(
  info: SubredditInfo,
  posts: SubredditPost[],
  onProgress: (progress: AnalysisProgress) => void
): Promise<AnalysisResult> {
  try {
    // Step 1: Prepare data
    onProgress({
      status: 'Initializing analysis...',
      progress: 20,
      indeterminate: false
    });

    const input = prepareAnalysisInput(info, posts);
    const engagement = calculateEngagementMetrics(posts);

    onProgress({
      status: 'Analyzing engagement metrics...',
      progress: 35,
      indeterminate: false
    });

    if (!engagement) {
      throw new Error('Not enough post data for analysis');
    }

    // Step 2: AI Analysis
    onProgress({
      status: 'Processing posting patterns...',
      progress: 50,
      indeterminate: false
    });

    const aiAnalysis = await analyzeSubreddit(input);

    onProgress({
      status: 'Generating content strategy...',
      progress: 65,
      indeterminate: false
    });

    onProgress({
      status: 'Finalizing recommendations...',
      progress: 80,
      indeterminate: false
    });

    // Step 3: Transform results
    onProgress({
      status: 'Compiling analysis report...',
      progress: 90,
      indeterminate: false
    });

    const result: AnalysisResult = {
      info: {
        ...info,
        rules: info.rules.map(rule => ({
          ...rule,
          marketingImpact: analyzeRuleMarketingImpact(rule)
        }))
      },
      posts,
      analysis: {
        marketingFriendliness: {
          score: Math.round(aiAnalysis.marketingFriendliness.score),
          reasons: aiAnalysis.marketingFriendliness.reasons,
          recommendations: aiAnalysis.marketingFriendliness.recommendations
        },
        postingGuidelines: {
          frequency: aiAnalysis.postingLimits.frequency,
          bestTimes: formatBestPostingTimes(engagement.peak_hours),
          restrictions: aiAnalysis.postingLimits.contentRestrictions
        },
        contentStrategy: {
          recommendedTypes: getRecommendedContentTypes(posts),
          topics: aiAnalysis.contentStrategy.topics,
          style: aiAnalysis.contentStrategy.style,
          dos: aiAnalysis.contentStrategy.dos,
          donts: aiAnalysis.contentStrategy.donts
        },
        titleTemplates: {
          patterns: aiAnalysis.titleTemplates.patterns,
          examples: aiAnalysis.titleTemplates.examples,
          effectiveness: aiAnalysis.titleTemplates.effectiveness
        },
        strategicAnalysis: {
          strengths: aiAnalysis.strategicAnalysis.strengths,
          weaknesses: aiAnalysis.strategicAnalysis.weaknesses,
          opportunities: aiAnalysis.strategicAnalysis.opportunities,
          risks: aiAnalysis.strategicAnalysis.risks
        },
        gamePlan: {
          immediate: aiAnalysis.gamePlan.immediate,
          shortTerm: aiAnalysis.gamePlan.shortTerm,
          longTerm: aiAnalysis.gamePlan.longTerm
        }
      }
    };

    onProgress({
      status: 'Analysis complete!',
      progress: 100,
      indeterminate: false
    });

    return result;
  } catch (error) {
    if (error instanceof AIAnalysisError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new Error(error.message || 'Failed to analyze subreddit data');
    }
    throw new Error('Failed to analyze subreddit data');
  }
}