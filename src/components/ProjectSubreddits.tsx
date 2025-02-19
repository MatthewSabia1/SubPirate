import React, { useState, useEffect } from 'react';
import { Download, FolderPlus, X, ChevronDown, ChevronUp, Search, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SubredditAnalysis from '../pages/SubredditAnalysis';
import { getSubredditInfo, getSubredditPosts } from '../lib/reddit';
import { analyzeSubredditData, AnalysisResult } from '../lib/analysis';
import AddToProjectModal from '../components/AddToProjectModal';

interface ProjectSubreddit {
  id: string;
  subreddit: {
    id: string;
    name: string;
    subscriber_count: number;
    active_users: number;
    marketing_friendly_score: number;
    allowed_content: string[];
  };
  created_at: string;
  last_post_at: string | null;
}

interface ProjectSubredditsProps {
  projectId: string;
}

function ProjectSubreddits({ projectId }: ProjectSubredditsProps) {
  const [subreddits, setSubreddits] = useState<ProjectSubreddit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [expandedSubreddit, setExpandedSubreddit] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedSubreddit, setSelectedSubreddit] = useState<{id: string; name: string} | null>(null);

  useEffect(() => {
    fetchProjectSubreddits();
  }, [projectId]);

  const fetchProjectSubreddits = async () => {
    try {
      const { data, error } = await supabase
        .from('project_subreddits')
        .select(`
          id,
          created_at,
          subreddit:subreddits (
            id,
            name,
            subscriber_count,
            active_users,
            marketing_friendly_score,
            allowed_content
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubreddits(data || []);
    } catch (err) {
      console.error('Error fetching project subreddits:', err);
      setError('Failed to load subreddits');
    } finally {
      setLoading(false);
    }
  };

  const removeSubreddit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_subreddits')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSubreddits(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error removing subreddit:', err);
      setError('Failed to remove subreddit');
    }
  };

  const exportToCSV = () => {
    const headers = ['Subreddit', 'Subscribers', 'Active Users', 'Marketing Score', 'Content Types', 'Date Added'];
    const rows = subreddits.map(s => [
      s.subreddit.name,
      s.subreddit.subscriber_count,
      s.subreddit.active_users,
      `${s.subreddit.marketing_friendly_score}%`,
      s.subreddit.allowed_content.join(', '),
      new Date(s.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'project_subreddits.csv';
    link.click();
  };

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
    return styles[type.toLowerCase()] || "bg-gray-600 text-white";
  };

  const toggleSubredditExpansion = async (subredditName: string) => {
    if (expandedSubreddit === subredditName) {
      setExpandedSubreddit(null);
      setAnalysisResult(null);
      return;
    }

    setExpandedSubreddit(subredditName);
    setAnalyzing(true);

    try {
      // Try to load from localStorage first
      const cached = localStorage.getItem(`analysis:${subredditName}`);
      if (cached) {
        setAnalysisResult(JSON.parse(cached));
        setAnalyzing(false);
        return;
      }

      // If no cache, perform analysis
      const [info, posts] = await Promise.all([
        getSubredditInfo(subredditName),
        getSubredditPosts(subredditName)
      ]);

      const result = await analyzeSubredditData(
        info,
        posts,
        () => {} // Progress updates not needed here
      );

      setAnalysisResult(result);
      
      // Cache the result
      localStorage.setItem(
        `analysis:${subredditName}`,
        JSON.stringify(result)
      );
    } catch (err) {
      console.error('Error analyzing subreddit:', err);
      setError('Failed to analyze subreddit');
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredSubreddits = subreddits
    .filter(s => s.subreddit.name.toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return a.subreddit.name.localeCompare(b.subreddit.name);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading subreddits...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Subreddits</h2>
        <button 
          onClick={exportToCSV}
          className="secondary flex items-center gap-2"
        >
          <Download size={20} />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter by name..."
              className="search-input w-full h-10 bg-[#111111] rounded-md"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
            className="bg-[#111111] border-none rounded-md px-4 h-10 focus:ring-1 focus:ring-[#333333]"
          >
            <option value="date">Date Added</option>
            <option value="name">Name</option>
          </select>
        </div>

        {subreddits.length === 0 ? (
          <div className="bg-[#111111] rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">No Subreddits Yet</h3>
            <p className="text-gray-400">
              Add subreddits to this project to start tracking them
            </p>
          </div>
        ) : (
          <div className="bg-[#111111] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_auto_auto_auto] gap-6 p-4 border-b border-[#222222] text-sm text-gray-400">
              <div>Subreddit</div>
              <div>Community Stats</div>
              <div>Marketing-Friendly</div>
              <div>Content Types</div>
              <div className="text-center">Posts</div>
              <div className="w-[80px] text-right">Actions</div>
            </div>

            <div className="divide-y divide-[#222222]">
              {filteredSubreddits.map((item) => (
                <div key={item.id}>
                  <div className="grid grid-cols-[2fr_1fr_1fr_auto_auto_auto] gap-6 p-4 items-center hover:bg-[#1A1A1A] transition-colors">
                    <div className="font-medium">
                      r/{item.subreddit.name}
                    </div>

                    <div className="flex items-center gap-1 text-gray-400">
                      <span>{formatNumber(item.subreddit.subscriber_count)}</span>
                      <span className="text-gray-600">•</span>
                      <span>{formatNumber(item.subreddit.active_users)} online</span>
                    </div>

                    <div>
                      <div className="w-24 h-2 bg-[#222222] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#C69B7B] via-[#E6B17E] to-[#4CAF50]"
                          style={{ width: `${item.subreddit.marketing_friendly_score}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {item.subreddit.marketing_friendly_score}%
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {item.subreddit.allowed_content.map((type) => (
                        <span 
                          key={type}
                          className={`px-2 py-1 text-xs rounded ${getContentTypeBadgeStyle(type)}`}
                        >
                          {type}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-center gap-1">
                      <Calendar size={16} className="text-gray-400" />
                      <span className="text-gray-400">0</span>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => removeSubreddit(item.id)}
                        className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                        title="Remove from Project"
                      >
                        <X size={20} />
                      </button>
                      <button 
                        onClick={() => toggleSubredditExpansion(item.subreddit.name)}
                        className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                        title={expandedSubreddit === item.subreddit.name ? "Hide Analysis" : "Show Analysis"}
                      >
                        {expandedSubreddit === item.subreddit.name ? (
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Analysis Section */}
                  {expandedSubreddit === item.subreddit.name && (
                    <div className="border-t border-[#222222] bg-[#0A0A0A] p-6">
                      {analyzing ? (
                        <div className="text-center py-8 text-gray-400">
                          Analyzing subreddit...
                        </div>
                      ) : analysisResult ? (
                        <SubredditAnalysis analysis={analysisResult} />
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          Failed to load analysis
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectSubreddits;