import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  Target, 
  Gamepad2, 
  BookOpen, 
  Bookmark, 
  BookmarkCheck,
  Shield,
  ChevronDown,
  ChevronUp,
  Type,
  TrendingUp,
  Brain,
  Activity
} from 'lucide-react';
import { getSubredditInfo, getSubredditPosts } from '../lib/reddit';
import { analyzeSubredditData, AnalysisResult } from '../lib/analysis';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SubredditAnalysisProps {
  analysis?: AnalysisResult;
}

function SubredditAnalysis({ analysis }: SubredditAnalysisProps) {
  const { subreddit } = useParams();
  const navigate = useNavigate();
  const [localAnalysis, setLocalAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [showDetailedRules, setShowDetailedRules] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [subredditId, setSubredditId] = useState<string | null>(null);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getContentTypeBadgeStyle = (type: string) => {
    const styles: Record<string, string> = {
      text: "bg-[#2B543A] text-white",
      image: "bg-[#8B6D3F] text-white",
      link: "bg-[#4A3B69] text-white",
      video: "bg-[#1E3A5F] text-white"
    };
    return `${styles[type.toLowerCase()] || "bg-gray-600"} px-2.5 py-0.5 rounded-full text-xs font-medium`;
  };

  const getMarketingImpactStyle = (impact: 'high' | 'medium' | 'low') => {
    const styles = {
      high: "bg-gradient-to-r from-red-500 to-rose-600",
      medium: "bg-gradient-to-r from-amber-500 to-amber-600",
      low: "bg-gradient-to-r from-emerald-500 to-emerald-600"
    };
    return `${styles[impact]} text-white px-4 py-1.5 rounded-full text-sm font-medium`;
  };

  useEffect(() => {
    // If analysis is provided as a prop, use it
    if (analysis) {
      setLocalAnalysis(analysis);
      return;
    }

    // Otherwise, try to load from localStorage
    if (subreddit) {
      const cached = localStorage.getItem(`analysis:${subreddit}`);
      if (cached) {
        try {
          setLocalAnalysis(JSON.parse(cached));
        } catch (err) {
          console.error('Failed to parse cached analysis:', err);
          setError('Failed to load analysis data');
        }
      } else {
        setError('No analysis data found');
        navigate('/');
      }
    }
  }, [analysis, subreddit, navigate]);

  useEffect(() => {
    if (!localAnalysis || !user) return;

    // Check if subreddit exists in database and get its ID
    async function getOrCreateSubredditId() {
      try {
        // Use upsert to handle race conditions
        const { data: upsertedSubreddit, error: upsertError } = await supabase
          .from('subreddits')
          .upsert(
            {
              name: localAnalysis.info.name,
              subscriber_count: localAnalysis.info.subscribers,
              active_users: localAnalysis.info.active_users,
              marketing_friendly_score: localAnalysis.analysis.marketingFriendliness.score,
              posting_requirements: localAnalysis.analysis.postingGuidelines,
              allowed_content: localAnalysis.analysis.contentStrategy.recommendedTypes,
              best_practices: localAnalysis.analysis.contentStrategy.dos,
              rules_summary: localAnalysis.info.rules.map(r => r.title).join('\n'),
              last_analyzed_at: new Date().toISOString()
            },
            {
              onConflict: 'name',
              ignoreDuplicates: false
            }
          )
          .select('id')
          .maybeSingle();

        if (upsertError) throw upsertError;

        if (upsertedSubreddit) {
          setSubredditId(upsertedSubreddit.id);
          return;
        }

        // If upsert didn't return data, try to fetch the existing record
        const { data: existingSubreddit, error: fetchError } = await supabase
          .from('subreddits')
          .select('id')
          .eq('name', localAnalysis.info.name)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (existingSubreddit) {
          setSubredditId(existingSubreddit.id);
        }
      } catch (err) {
        console.error('Error getting/creating subreddit:', err);
      }
    }

    getOrCreateSubredditId();
  }, [localAnalysis, user]);

  useEffect(() => {
    if (!subredditId || !user) return;

    // Check if subreddit is saved
    async function checkSavedStatus() {
      try {
        const { data, error } = await supabase
          .from('saved_subreddits')
          .select('id')
          .eq('subreddit_id', subredditId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setIsSaved(!!data);
      } catch (err) {
        console.error('Error checking saved status:', err);
      }
    }

    checkSavedStatus();
  }, [subredditId, user]);

  const toggleSaved = async () => {
    if (!subredditId || !localAnalysis || !user) return;

    setSavingState('saving');
    try {
      if (isSaved) {
        // Remove from saved
        const { error } = await supabase
          .from('saved_subreddits')
          .delete()
          .eq('subreddit_id', subredditId)
          .eq('user_id', user.id);

        if (error) throw error;
        setIsSaved(false);
      } else {
        // Add to saved
        const { error: savedError } = await supabase
          .from('saved_subreddits')
          .upsert(
            {
              subreddit_id: subredditId,
              user_id: user.id,
              last_post_at: null
            },
            { onConflict: 'subreddit_id,user_id', ignoreDuplicates: true }
          );

        if (savedError) throw savedError;
        setIsSaved(true);
      }
      setSavingState('idle');
    } catch (err) {
      console.error('Error toggling saved status:', err);
      setSavingState('error');
      setTimeout(() => setSavingState('idle'), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading analysis...</div>
      </div>
    );
  }

  if (error || !localAnalysis) {
    return (
      <div className="bg-red-900/30 text-red-400 p-4 rounded-lg flex items-center gap-2">
        <AlertTriangle size={20} className="shrink-0" />
        <p>{error || 'Failed to load analysis'}</p>
      </div>
    );
  }

  const {
    info,
    analysis: {
      marketingFriendliness,
      postingGuidelines,
      contentStrategy,
      titleTemplates,
      strategicAnalysis,
      gamePlan
    }
  } = localAnalysis;

  return (
    <div className="bg-[#111111] rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h1 className="text-xl md:text-2xl font-semibold">r/{info.name}</h1>
            <div className="flex items-center gap-2 text-sm md:text-base text-gray-400">
              <Users className="h-4 w-4" />
              <span>{formatNumber(info.subscribers)}</span>
              <Activity className="h-4 w-4 ml-2" />
              <span>{formatNumber(info.active_users)} online</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#C69B7B] to-[#E6B17E] text-white text-sm font-medium">
              {marketingFriendliness.score}% Marketing-Friendly
            </span>
            <button 
              onClick={toggleSaved}
              className="secondary flex items-center gap-2 h-9 px-3 text-sm md:text-base"
              disabled={savingState === 'saving'}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck size={18} />
                  <span className="text-sm">Saved</span>
                </>
              ) : (
                <>
                  <Bookmark size={18} />
                  <span className="text-sm">Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-8">
        {/* Marketing Friendliness Meter */}
        <div>
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Marketing Difficulty</span>
            <span>Marketing Friendly</span>
          </div>
          <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div className="h-full transition-all duration-500" style={{
              width: `${marketingFriendliness.score}%`,
              backgroundColor: marketingFriendliness.score >= 80 ? '#4CAF50' :
                             marketingFriendliness.score >= 60 ? '#FFA726' :
                             '#EF5350'
            }} />
          </div>
          <div className="mt-2 text-sm text-gray-400">
            {marketingFriendliness.reasons[0]}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Posting Requirements */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Posting Requirements</h3>
            </div>
            <ul className="space-y-2 text-gray-400 text-sm">
              {postingGuidelines.restrictions.map((restriction, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{restriction}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Best Posting Times */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Best Posting Times</h3>
            </div>
            <ul className="space-y-2 text-gray-400 text-sm">
              {postingGuidelines.bestTimes.map((time, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Content Strategy */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Allowed Content</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {contentStrategy.recommendedTypes.map((type) => (
                <span 
                  key={type}
                  className={`px-3 py-1 rounded-full text-sm ${getContentTypeBadgeStyle(type)}`}
                >
                  {type}
                </span>
              ))}
            </div>
          </div>

          {/* Best Practices */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Best Practices</h3>
            </div>
            <ul className="space-y-2 text-gray-400 text-sm">
              {contentStrategy.dos.map((practice, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#C69B7B]">•</span>
                  <span>{practice}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Game Plan */}
        <div className="bg-[#0A0A0A] rounded-lg overflow-hidden border border-gray-800 text-sm md:text-base">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Game Plan</h3>
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Title Template */}
            <div>
              <h4 className="text-sm text-gray-400 mb-3">Title Template</h4>
              <div className="bg-[#111111] rounded-lg p-4 border border-gray-800">
                <code className="text-emerald-400 font-mono block mb-3">
                  {titleTemplates.patterns[0]}
                </code>
                <div className="text-sm text-gray-400">
                  <div className="mb-2">Example:</div>
                  {titleTemplates.examples.map((example, index) => (
                    <div key={index} className="text-white">{example}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Immediate Actions</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {gamePlan.immediate.map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-[#C69B7B]">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Short-term Strategy</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {gamePlan.shortTerm.map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-[#C69B7B]">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Do's and Don'ts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Do's</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {contentStrategy.dos.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-emerald-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm text-gray-400 mb-3">Don'ts</h4>
                <ul className="space-y-2 text-gray-300 text-sm">
                  {contentStrategy.donts.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Rules Analysis */}
        <div className="bg-[#0A0A0A] rounded-lg overflow-hidden border border-gray-800">
          <button 
            onClick={() => setShowDetailedRules(!showDetailedRules)}
            className="w-full p-4 flex items-center justify-between hover:bg-[#111111] transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#C69B7B]" />
              <h3 className="font-medium">Detailed Rules Analysis</h3>
            </div>
            {showDetailedRules ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </button>

          {showDetailedRules && (
            <div className="p-4 border-t border-gray-800 space-y-4">
              {info.rules.map((rule, index) => (
                <div 
                  key={index} 
                  className="bg-[#111111] rounded-lg p-5 border border-gray-800/50 hover:border-gray-700/50 transition-colors"
                >
                  <p className="text-gray-200 mb-4 leading-relaxed">{rule.description}</p>
                  <div className="flex items-center gap-2">
                    <div className={getMarketingImpactStyle(rule.marketingImpact)}>
                      Marketing Impact: {rule.marketingImpact.charAt(0).toUpperCase() + rule.marketingImpact.slice(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubredditAnalysis;