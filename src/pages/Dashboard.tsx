import React, { useState } from 'react';
import { Search, Shield, Users, ExternalLink, AlertTriangle, Activity } from 'lucide-react';
import { getSubredditInfo, getSubredditPosts, searchSubreddits, SubredditInfo, RedditAPIError } from '../lib/reddit';
import { analyzeSubredditData, AnalysisProgress, AnalysisResult } from '../lib/analysis';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import SubredditAnalysis from './SubredditAnalysis';

function Dashboard() {
  const [subredditInput, setSubredditInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<SubredditInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [showNSFW, setShowNSFW] = useState(false);
  const [sortBy, setSortBy] = useState<'subscribers' | 'name'>('subscribers');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const navigate = useNavigate();

  const handleAnalyzeSubreddit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subredditInput || analyzing) return;

    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalysisResult(null);
    setAnalyzeProgress({
      status: 'Validating subreddit...',
      progress: 0,
      indeterminate: true
    });

    try {
      const cleanSubreddit = subredditInput.replace(/^r\//, '').trim();
      
      setAnalyzeProgress({
        status: 'Fetching subreddit information...',
        progress: 20,
        indeterminate: false
      });
      
      const info = await getSubredditInfo(cleanSubreddit);

      setAnalyzeProgress({
        status: 'Collecting recent posts...',
        progress: 40,
        indeterminate: false
      });
      
      const posts = await getSubredditPosts(cleanSubreddit);

      const result = await analyzeSubredditData(
        info,
        posts,
        (progress) => setAnalyzeProgress(progress)
      );

      localStorage.setItem(
        `analysis:${cleanSubreddit}`,
        JSON.stringify(result)
      );

      setAnalysisResult(result);
    } catch (err) {
      if (err instanceof RedditAPIError) {
        setAnalyzeError(err.message);
      } else if (err instanceof Error) {
        setAnalyzeError(err.message || 'An unexpected error occurred. Please try again later.');
      } else {
        setAnalyzeError('An unexpected error occurred. Please try again later.');
      }
      setAnalysisResult(null);
    } finally {
      setAnalyzing(false);
      setAnalyzeProgress(null);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput || loading) return;

    setLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      const results = await searchSubreddits(searchInput);
      setSearchResults(results);
    } catch (err) {
      if (err instanceof RedditAPIError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message || 'An unexpected error occurred while searching. Please try again later.');
      } else {
        setError('An unexpected error occurred while searching. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = searchResults
    .filter(subreddit => showNSFW ? true : !subreddit.over18)
    .sort((a, b) => {
      if (sortBy === 'subscribers') {
        return b.subscribers - a.subscribers;
      }
      return a.name.localeCompare(b.name);
    });

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getSubredditIcon = (subreddit: SubredditInfo) => {
    // Use community icon first if available
    if (subreddit.community_icon) {
      return subreddit.community_icon;
    }
    
    // Fallback to icon_img if available
    if (subreddit.icon_img) {
      return subreddit.icon_img;
    }
    
    // Final fallback to generated placeholder
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${subreddit.name}&backgroundColor=111111&radius=12`;
  };

  return (
    <div className="max-w-[1200px] mx-auto px-8 space-y-8">
      {/* Analyze Specific Subreddit */}
      <div>
        <h2 className="text-xl md:text-2xl font-semibold mb-6">Analyze Specific Subreddit</h2>
        <form onSubmit={handleAnalyzeSubreddit} className="space-y-4">
          <div className="relative">
            <input 
              type="text" 
              value={subredditInput}
              onChange={(e) => setSubredditInput(e.target.value)}
              placeholder="Enter subreddit name (with or without r/)"
              className="w-full h-12 md:h-[52px] bg-[#111111] rounded-lg pl-4 pr-[120px] text-white placeholder-gray-500 border-none focus:ring-1 focus:ring-[#C69B7B]"
              disabled={analyzing}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <button 
                type="submit" 
                className="bg-[#C69B7B] hover:bg-[#B38A6A] h-9 px-4 rounded-md text-sm font-medium text-white flex items-center gap-2 transition-colors disabled:opacity-50 disabled:hover:bg-[#C69B7B]"
                disabled={analyzing}
              >
                <Search size={16} />
                {analyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>
          
          {analyzeProgress && (
            <div className="bg-[#111111] p-4 rounded-lg">
              <ProgressBar 
                progress={analyzeProgress.progress}
                status={analyzeProgress.status}
                indeterminate={analyzeProgress.indeterminate}
              />
            </div>
          )}

          {analyzeError && (
            <div className="p-4 bg-red-900/30 text-red-400 rounded-lg flex items-center gap-2">
              <AlertTriangle size={20} className="shrink-0" />
              <p>{analyzeError}</p>
            </div>
          )}
        </form>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div>
          <SubredditAnalysis analysis={analysisResult} />
        </div>
      )}

      {/* Discover Subreddits */}
      <div>
        <h2 className="text-xl md:text-2xl font-semibold mb-6">Discover Subreddits</h2>
        <div className="space-y-6">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input 
                type="text" 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search subreddits by keywords..."
                className="w-full h-12 md:h-[52px] bg-[#111111] rounded-lg pl-4 pr-[120px] text-white placeholder-gray-500 border-none focus:ring-1 focus:ring-[#C69B7B]"
                disabled={loading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button 
                  type="submit" 
                  className="bg-[#C69B7B] hover:bg-[#B38A6A] h-9 px-4 rounded-md text-sm font-medium text-white flex items-center gap-2 transition-colors"
                  disabled={loading}
                >
                  <Search size={16} />
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-[#111111] rounded-md px-3 h-8">
                <Users size={16} className="text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'subscribers' | 'name')}
                  className="bg-transparent border-none text-sm text-gray-400 focus:ring-0 cursor-pointer h-8"
                >
                  <option value="subscribers">Most Subscribers</option>
                  <option value="name">Name</option>
                </select>
              </div>
              <button
                onClick={() => setShowNSFW(!showNSFW)}
                className={`h-8 px-3 text-sm rounded-md transition-colors flex items-center gap-2 ${
                  showNSFW 
                    ? 'bg-[#111111] text-white' 
                    : 'bg-[#111111] text-gray-400 hover:text-white'
                }`}
              >
                <Shield size={16} className={showNSFW ? 'text-white' : 'text-gray-400'} />
                Show NSFW
              </button>
            </div>
          )}

          {filteredResults.length > 0 && (
            <div className="space-y-3">
              {filteredResults.map((subreddit) => (
                <div 
                  key={subreddit.name}
                  className="flex items-start gap-4 bg-[#111111] p-4 rounded-lg hover:bg-[#1A1A1A] transition-colors group"
                >
                  <a 
                    href={`https://reddit.com/r/${subreddit.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <img 
                      src={getSubredditIcon(subreddit)}
                      alt={`r/${subreddit.name}`}
                      className="w-12 h-12 rounded-lg bg-[#1A1A1A] group-hover:bg-[#222222] transition-colors"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${subreddit.name}&backgroundColor=111111&radius=12`;
                      }}
                    />
                  </a>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <a 
                        href={`https://reddit.com/r/${subreddit.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[15px] hover:text-[#C69B7B] transition-colors inline-flex items-center gap-2"
                      >
                        r/{subreddit.name}
                        <ExternalLink size={14} className="text-gray-400" />
                      </a>
                      {subreddit.over18 && (
                        <span className="px-2 py-0.5 text-xs bg-red-900/50 text-red-400 rounded flex items-center gap-1">
                          <Shield size={12} />
                          NSFW
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                      {subreddit.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-400">
                        <Users size={14} />
                        <span>{formatNumber(subreddit.subscribers)} members</span>
                      </div>
                      {subreddit.active_users > 0 && (
                        <>
                          <span className="text-gray-600">•</span>
                          <div className="flex items-center gap-1 text-emerald-400">
                            <Activity size={14} />
                            <span>{formatNumber(subreddit.active_users)} online</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSubredditInput(subreddit.name);
                      handleAnalyzeSubreddit(new Event('submit') as any);
                    }}
                    className="bg-[#C69B7B] hover:bg-[#B38A6A] h-9 px-4 rounded-md text-sm font-medium text-white transition-colors whitespace-nowrap flex items-center gap-2"
                  >
                    <Search size={16} />
                    Analyze
                  </button>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="text-center py-12 text-gray-400">
              Searching subreddits...
            </div>
          )}

          {!loading && searchResults.length === 0 && searchInput && (
            <div className="text-center py-12 text-gray-400">
              No subreddits found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;