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
  posts: Array<{
    title: string;
    score: number;
    num_comments: number;
    created_utc: number;
  }>;
  analysis: {
    marketingFriendliness: {
      score: number;
      reasons: string[];
      recommendations: string[];
    };
    postingLimits: {
      frequency: number;
      bestTimeToPost: string[];
      contentRestrictions: string[];
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
  rules: Array<{
    title: string;
    description: string;
    priority: number;
    marketingImpact: 'high' | 'medium' | 'low';
  }>;
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

function prepareAnalysisInput(info: SubredditInfo, posts: SubredditPost[]): SubredditAnalysisInput {
  const engagement = calculateEngagementMetrics(posts);
  if (!engagement) {
    throw new Error('Not enough post data for analysis');
  }

  const historicalPosts = posts.map(post => ({
    ...post,
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

function calculateMarketingScore(input: SubredditAnalysisInput): number {
  let score = 50; // Base score
  
  // Factor 1: Community Size and Activity (15+15 points)
  const subscriberScore = Math.min(input.subscribers / 1000000, 1) * 15;
  const activityScore = input.subscribers > 0 ? Math.min(input.active_users / input.subscribers, 1) * 15 : 0;
  score += subscriberScore + activityScore;

  // Factor 2: Engagement Quality (up to 30 points)
  const totalEngagement = input.engagement_metrics.avg_score + input.engagement_metrics.avg_comments;
  const engagementRatio = input.subscribers > 0 ? (totalEngagement / input.subscribers) * 100 : 0;
  const engagementScore = Math.min(engagementRatio, 30);
  score += engagementScore;

  // Factor 3: Rule Restrictions (- max 20 points)
  const highImpactRules = input.rules.filter((r: { marketingImpact: string }) => r.marketingImpact === 'high').length;
  const mediumImpactRules = input.rules.filter((r: { marketingImpact: string }) => r.marketingImpact === 'medium').length;
  score -= (highImpactRules * 4) + (mediumImpactRules * 2);

  // Factor 4: Post Frequency and Timing (10 points)
  const postFrequencyScore = Math.min(input.posts_per_day / 10, 1) * 10;
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

    // Sort posts by engagement score (75% upvotes, 25% comments)
    const scoredPosts = posts.map(post => ({
      ...post,
      engagement_score: (post.score * 0.75 + post.num_comments * 0.25)
    }));

    // Get posts from the last month, fallback to all posts if none are recent enough
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let recentPosts = scoredPosts.filter(post => post.created_utc * 1000 > oneMonthAgo);
    
    // If we don't have enough recent posts, use all posts
    if (recentPosts.length < 50) {
      recentPosts = scoredPosts;
    }

    // Sort by engagement score and get top 500
    const topPosts = recentPosts
      .sort((a, b) => b.engagement_score - a.engagement_score)
      .slice(0, 500);

    // For AI analysis, use a subset of the most engaged posts to keep processing time reasonable
    const aiAnalysisPosts = topPosts.slice(0, 100);

    const input = prepareAnalysisInput(info, aiAnalysisPosts);
    const engagement = calculateEngagementMetrics(topPosts);

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

    // Ensure we include all necessary post data for the heatmap
    const postsForHeatmap = topPosts.map(post => ({
      title: post.title,
      score: post.score,
      num_comments: post.num_comments,
      created_utc: post.created_utc
    }));

    const result: AnalysisResult = {
      info: {
        ...info,
        rules: info.rules.map(rule => ({
          ...rule,
          marketingImpact: analyzeRuleMarketingImpact(rule)
        }))
      },
      posts: postsForHeatmap,
      analysis: {
        marketingFriendliness: {
          score: Math.round(aiAnalysis.marketingFriendliness.score),
          reasons: aiAnalysis.marketingFriendliness.reasons,
          recommendations: aiAnalysis.marketingFriendliness.recommendations
        },
        postingLimits: {
          frequency: aiAnalysis.postingLimits.frequency,
          bestTimeToPost: formatBestPostingTimes(engagement.peak_hours),
          contentRestrictions: aiAnalysis.postingLimits.contentRestrictions
        },
        contentStrategy: {
          recommendedTypes: getRecommendedContentTypes(topPosts),
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