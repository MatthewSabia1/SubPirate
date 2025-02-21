/* src/features/subreddit-analysis/components/analysis-card.tsx */

import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface AnalysisData {
  subreddit: string;
  subscribers: number;
  activeUsers: number;
  rules?: any[];
  marketingFriendliness: {
    score: number;
    reasons: string[];
    recommendations: string[];
  };
  postingGuidelines: {
    allowedTypes: string[];
    restrictions: string[];
    recommendations: string[];
  };
  contentStrategy: {
    postTypes: string[];
    timing: Array<{ hour: number; timezone: string }>;
    topics: string[];
  };
  strategicAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
  };
}

interface AnalysisCardProps {
  analysis: AnalysisData;
  mode?: 'new' | 'saved';
  onSaveComplete?: () => void;
  isAnalyzing?: boolean;
}

interface SavedSubreddit {
  id: string;
  name: string;
  subscriber_count: number;
  active_users: number;
  marketing_friendly_score: number;
  allowed_content: string[];
  posting_requirements: any;
  posting_frequency: any;
  best_practices: string[];
  rules_summary: string;
  title_template: string;
  last_analyzed_at: string;
  analysis_data: AnalysisData;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ 
  analysis, 
  mode = 'new',
  onSaveComplete,
  isAnalyzing = false
}) => {
  const [showRules, setShowRules] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      // First, insert or update the subreddit
      const { data: subredditData, error: subredditError } = await supabase
        .from('subreddits')
        .upsert({
          name: analysis.subreddit,
          subscriber_count: analysis.subscribers,
          active_users: analysis.activeUsers,
          marketing_friendly_score: analysis.marketingFriendliness.score,
          allowed_content: analysis.postingGuidelines.allowedTypes,
          posting_requirements: {
            restrictions: analysis.postingGuidelines.restrictions,
            recommendations: analysis.postingGuidelines.recommendations
          },
          posting_frequency: {
            timing: analysis.contentStrategy.timing,
            postTypes: analysis.contentStrategy.postTypes
          },
          best_practices: analysis.contentStrategy.topics,
          rules_summary: analysis.rules ? JSON.stringify(analysis.rules) : null,
          title_template: analysis.postingGuidelines.recommendations.find(r => r.toLowerCase().includes('title'))?.split(': ')[1] || null,
          last_analyzed_at: new Date().toISOString(),
          // Store the complete analysis data
          analysis_data: analysis
        }, {
          onConflict: 'name'
        }) as { data: SavedSubreddit[] | null; error: any };

      if (subredditError) throw subredditError;
      
      const savedSubreddit = subredditData?.[0];
      if (!savedSubreddit) throw new Error('Failed to save subreddit data');

      // Then, create the saved_subreddits entry with user_id
      const { error: savedError } = await supabase
        .from('saved_subreddits')
        .upsert({
          user_id: user.id,
          subreddit_id: savedSubreddit.id,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,subreddit_id'
        });

      if (savedError) throw savedError;

      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (err) {
      console.error('Error saving subreddit:', err);
      setError('Failed to save subreddit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow-xl" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold">Subreddit Analysis</h2>
        {mode === 'new' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#C69B7B] hover:bg-[#B38A6A] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Analysis'}
          </button>
        )}
      </div>

      {saveError && (
        <div className="mb-4 p-3 bg-red-900/30 text-red-400 rounded-md text-sm">
          {saveError}
        </div>
      )}

      <div className="mb-4">
        <div className="text-sm">
          <span className="mr-4">Subscribers: {analysis.subscribers}</span>
          <span>Active Users: {analysis.activeUsers}</span>
        </div>
      </div>

      {/* Rules Section */}
      <div className="mb-4" onClick={e => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowRules(!showRules);
          }}
          className="px-4 py-2 bg-[#111111] hover:bg-[#222222] text-white rounded-md transition-colors"
        >
          {showRules ? 'Hide Rules' : 'Show Rules'}
        </button>
        {showRules && (
          <div className="mt-2 bg-[#111111] p-4 rounded" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-2">Subreddit Rules</h3>
            <pre className="bg-[#1A1A1A] p-2 rounded text-sm overflow-auto">
              {analysis.rules ? JSON.stringify(analysis.rules, null, 2) : 'No rules available.'}
            </pre>
          </div>
        )}
      </div>

      {/* Analysis Sections */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold mb-2">Marketing Friendliness</h3>
          <pre className="bg-[#111111] p-3 rounded text-sm">
            {JSON.stringify(analysis.marketingFriendliness, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-2">Posting Guidelines</h3>
          <pre className="bg-[#111111] p-3 rounded text-sm">
            {JSON.stringify(analysis.postingGuidelines, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-2">Content Strategy</h3>
          <pre className="bg-[#111111] p-3 rounded text-sm">
            {JSON.stringify(analysis.contentStrategy, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-2">Strategic Analysis</h3>
          <pre className="bg-[#111111] p-3 rounded text-sm">
            {JSON.stringify(analysis.strategicAnalysis, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default AnalysisCard; 