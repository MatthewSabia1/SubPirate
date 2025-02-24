/// <reference lib="webworker" />

import { SubredditInfo, SubredditPost } from './reddit';
import { AnalysisResult, AnalysisProgress } from './analysis';

interface WorkerMessage {
  info: SubredditInfo;
  posts: SubredditPost[];
  analysisId: string;
}

declare const self: SharedWorkerGlobalScope;

self.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  
  port.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { info, posts, analysisId } = event.data;
    
    try {
      // Send initial progress
      port.postMessage({ 
        type: 'progress', 
        analysisId, 
        data: { progress: 0, message: 'Starting analysis...', indeterminate: false } 
      });

      // Basic analysis first (fast metrics)
      const basicMetrics: AnalysisResult = {
        info: {
          ...info,
          rules: info.rules.map(rule => ({
            ...rule,
            marketingImpact: 'medium' as const
          }))
        },
        posts: posts.map(post => ({
          title: post.title,
          score: post.score,
          num_comments: post.num_comments,
          created_utc: post.created_utc
        })),
        analysis: {
          marketingFriendliness: {
            score: 0.7,
            reasons: ['Initial analysis'],
            recommendations: ['Preliminary recommendation']
          },
          postingLimits: {
            frequency: posts.length / 30,
            bestTimeToPost: ['9:00 AM EST'],
            contentRestrictions: []
          },
          contentStrategy: {
            recommendedTypes: ['text', 'image'],
            topics: ['general'],
            style: 'casual',
            dos: ['Be engaging'],
            donts: ['Avoid spam']
          },
          titleTemplates: {
            patterns: ['[Topic] Discussion'],
            examples: ['Example Title'],
            effectiveness: 0.8
          },
          strategicAnalysis: {
            strengths: ['Active community'],
            weaknesses: ['Areas to improve'],
            opportunities: ['Growth potential'],
            risks: ['Competition']
          },
          gamePlan: {
            immediate: ['Start engaging'],
            shortTerm: ['Build presence'],
            longTerm: ['Establish authority']
          }
        }
      };

      port.postMessage({
        type: 'basicAnalysis',
        analysisId,
        data: basicMetrics
      });

      // Simulate deeper analysis with progress updates
      for (let i = 1; i <= 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        port.postMessage({
          type: 'progress',
          analysisId,
          data: { progress: i * 20, message: `Processing phase ${i}...`, indeterminate: false }
        });
      }

      // Final analysis result - in a real implementation, this would be more detailed
      const result: AnalysisResult = {
        ...basicMetrics,
        analysis: {
          ...basicMetrics.analysis,
          marketingFriendliness: {
            score: 0.85,
            reasons: ['High engagement rate', 'Active moderation', 'Relevant topics'],
            recommendations: ['Post during peak hours', 'Focus on quality content', 'Engage with comments']
          },
          contentStrategy: {
            ...basicMetrics.analysis.contentStrategy,
            topics: ['Trending topics', 'Community interests', 'Current events'],
            dos: ['Research before posting', 'Follow community guidelines', 'Add value to discussions'],
            donts: ['Avoid self-promotion', 'Don\'t spam', 'Don\'t ignore feedback']
          }
        }
      };

      port.postMessage({
        type: 'complete',
        analysisId,
        data: result
      });
    } catch (err: any) {
      port.postMessage({
        type: 'error',
        analysisId,
        error: err.message || 'Unknown error during analysis'
      });
    }
  };

  port.start();
}; 