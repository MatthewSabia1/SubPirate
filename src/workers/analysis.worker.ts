// Web Worker for handling subreddit analysis
import { analyzeSubreddit } from '../lib/openRouter';
import { SubredditInfo, SubredditPost } from '../lib/reddit';
import { AnalysisResult, AnalysisProgress } from '../lib/analysis';

interface WorkerMessage {
  info: SubredditInfo;
  posts: SubredditPost[];
  analysisId: string;
}

interface EngagementMetrics {
  avg_comments: number;
  avg_score: number;
  peak_hours: number[];
  interaction_rate: number;
  posts_per_hour: number[];
}

interface ScoredPost extends SubredditPost {
  engagement_score: number;
}

interface AnalysisInput {
  name: string;
  title: string;
  subscribers: number;
  active_users: number;
  description: string;
  posts_per_day: number;
  historical_posts: Array<ScoredPost & { engagement_rate: number }>;
  engagement_metrics: EngagementMetrics;
  rules: Array<{
    title: string;
    description: string;
    priority: number;
    marketingImpact: 'high' | 'medium' | 'low';
  }>;
}

// Helper functions from analysis.ts
function calculateEngagementMetrics(posts: SubredditPost[]): EngagementMetrics | null {
  const totalPosts = posts.length;
  if (totalPosts === 0) return null;

  const avgComments = posts.reduce((sum, post) => sum + post.num_comments, 0) / totalPosts;
  const avgScore = posts.reduce((sum, post) => sum + post.score, 0) / totalPosts;
  
  const postTimes = posts.map(post => new Date(post.created_utc * 1000).getHours());
  const hourCounts = new Array(24).fill(0);
  postTimes.forEach(hour => hourCounts[hour]++);
  
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

function analyzeRuleMarketingImpact(rule: { title: string; description: string }): 'high' | 'medium' | 'low' {
  const text = `${rule.title} ${rule.description}`.toLowerCase();
  
  const highImpactKeywords = [
    'spam', 'promotion', 'advertising', 'marketing', 'self-promotion',
    'commercial', 'business', 'selling', 'merchandise', 'affiliate'
  ];
  
  const mediumImpactKeywords = [
    'quality', 'format', 'title', 'flair', 'tags',
    'submission', 'guidelines', 'requirements', 'posting'
  ];
  
  if (highImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'high';
  }
  
  if (mediumImpactKeywords.some(keyword => text.includes(keyword))) {
    return 'medium';
  }
  
  return 'low';
}

function calculateMarketingScore(input: AnalysisInput): number {
  let score = 50;
  
  const subscriberScore = Math.min(input.subscribers / 1000000, 1) * 15;
  const activityScore = input.subscribers > 0 ? Math.min(input.active_users / input.subscribers, 1) * 15 : 0;
  score += subscriberScore + activityScore;

  const totalEngagement = input.engagement_metrics.avg_score + input.engagement_metrics.avg_comments;
  const engagementRatio = input.subscribers > 0 ? (totalEngagement / input.subscribers) * 100 : 0;
  const engagementScore = Math.min(engagementRatio, 30);
  score += engagementScore;

  const highImpactRules = input.rules.filter(r => r.marketingImpact === 'high').length;
  const mediumImpactRules = input.rules.filter(r => r.marketingImpact === 'medium').length;
  score -= (highImpactRules * 4) + (mediumImpactRules * 2);

  const postFrequencyScore = Math.min(input.posts_per_day / 10, 1) * 10;
  score += postFrequencyScore;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function prepareAnalysisInput(info: SubredditInfo, posts: SubredditPost[]): AnalysisInput {
  const engagement = calculateEngagementMetrics(posts);
  if (!engagement) {
    throw new Error('Not enough post data for analysis');
  }

  const historicalPosts = posts.map(post => ({
    ...post,
    engagement_rate: (post.score + post.num_comments) / engagement.interaction_rate,
    engagement_score: (post.score * 0.75 + post.num_comments * 0.25)
  }));

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
    posts_per_day: posts.length / 7,
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

// Worker message handler
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { info, posts, analysisId } = e.data;

  try {
    // Phase 1: Immediate Basic Analysis
    self.postMessage({
      type: 'progress',
      analysisId,
      data: { status: 'Calculating basic metrics...', progress: 20, indeterminate: false }
    });

    const scoredPosts = posts.map(post => ({
      ...post,
      engagement_score: (post.score * 0.75 + post.num_comments * 0.25)
    }));

    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let recentPosts = scoredPosts.filter(post => post.created_utc * 1000 > oneMonthAgo);
    if (recentPosts.length < 50) {
      recentPosts = scoredPosts;
    }
    const topPosts = recentPosts
      .sort((a, b) => b.engagement_score - a.engagement_score)
      .slice(0, 500);
    const basicAnalysisPosts = topPosts.slice(0, 100);

    const input = prepareAnalysisInput(info, basicAnalysisPosts);
    const engagement = calculateEngagementMetrics(topPosts) || {
      avg_comments: 0,
      avg_score: 0,
      peak_hours: [9, 12, 15, 18],
      interaction_rate: 0,
      posts_per_hour: new Array(24).fill(0)
    };

    // Send basic analysis results
    const basicResult: AnalysisResult = {
      info: {
        ...info,
        rules: info.rules.map(rule => ({
          ...rule,
          marketingImpact: analyzeRuleMarketingImpact(rule)
        }))
      },
      posts: topPosts.map(post => ({
        title: post.title,
        score: post.score,
        num_comments: post.num_comments,
        created_utc: post.created_utc
      })),
      analysis: {
        marketingFriendliness: {
          score: calculateMarketingScore(input),
          reasons: [
            `Community of ${formatNumber(info.subscribers)} members with ${formatNumber(info.active_users)} currently active`,
            `Average engagement rate: ${Math.round(engagement.interaction_rate)} interactions per post`
          ],
          recommendations: [
            'Detailed recommendations loading...',
            'AI analysis in progress...'
          ]
        },
        postingLimits: {
          frequency: input.posts_per_day,
          bestTimeToPost: formatBestPostingTimes(engagement.peak_hours),
          contentRestrictions: info.rules
            .filter(rule => analyzeRuleMarketingImpact(rule) !== 'low')
            .map(rule => rule.description)
        },
        contentStrategy: {
          recommendedTypes: getRecommendedContentTypes(topPosts),
          topics: ['Analyzing common topics...'],
          style: 'Analyzing posting patterns and community preferences...',
          dos: [
            `Post during peak hours: ${formatBestPostingTimes(engagement.peak_hours)[0]}`,
            `Aim for ${Math.round(engagement.avg_comments)} or more comments per post`,
            'Additional insights loading...'
          ],
          donts: [
            ...info.rules
              .filter(rule => analyzeRuleMarketingImpact(rule) === 'high')
              .map(rule => rule.title),
            'Additional restrictions loading...'
          ]
        },
        titleTemplates: {
          patterns: ['Analyzing successful title patterns...'],
          examples: ['Loading examples from top posts...'],
          effectiveness: 0
        },
        strategicAnalysis: {
          strengths: [
            `Active community with ${formatNumber(info.active_users)} online users`,
            `Average of ${Math.round(input.posts_per_day)} posts per day`,
            'Detailed strengths analysis loading...'
          ],
          weaknesses: ['Analyzing potential challenges...'],
          opportunities: ['Identifying growth opportunities...'],
          risks: ['Evaluating potential risks...']
        },
        gamePlan: {
          immediate: [
            'Follow posting time patterns',
            'Match community engagement levels',
            'Detailed strategy loading...'
          ],
          shortTerm: ['Analyzing optimal approach...'],
          longTerm: ['Developing long-term recommendations...']
        }
      }
    };

    self.postMessage({
      type: 'basicAnalysis',
      analysisId,
      data: basicResult
    });

    // Phase 2: AI Analysis
    self.postMessage({
      type: 'progress',
      analysisId,
      data: { status: 'Running AI analysis...', progress: 55, indeterminate: false }
    });

    const aiAnalysis = await analyzeSubreddit(input);

    // Merge AI analysis with basic results
    const finalResult: AnalysisResult = {
      ...basicResult,
      analysis: {
        ...basicResult.analysis,
        marketingFriendliness: {
          score: Math.round(aiAnalysis.marketingFriendliness.score),
          reasons: aiAnalysis.marketingFriendliness.reasons,
          recommendations: aiAnalysis.marketingFriendliness.recommendations
        },
        postingLimits: {
          ...basicResult.analysis.postingLimits,
          contentRestrictions: aiAnalysis.postingLimits.contentRestrictions
        },
        contentStrategy: {
          ...basicResult.analysis.contentStrategy,
          topics: aiAnalysis.contentStrategy.topics,
          style: aiAnalysis.contentStrategy.style,
          dos: aiAnalysis.contentStrategy.dos,
          donts: aiAnalysis.contentStrategy.donts
        },
        titleTemplates: aiAnalysis.titleTemplates,
        strategicAnalysis: aiAnalysis.strategicAnalysis,
        gamePlan: aiAnalysis.gamePlan
      }
    };

    self.postMessage({
      type: 'complete',
      analysisId,
      data: finalResult
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      analysisId,
      error: error instanceof Error ? error.message : 'Unknown error during analysis'
    });
  }
};

// Helper function to format numbers
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
} 