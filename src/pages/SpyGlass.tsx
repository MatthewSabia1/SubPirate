import React, { useState, useEffect } from 'react';
import { Search, Telescope, Bookmark, FolderPlus, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, Check, Users, MessageCircle, Calendar, Activity } from 'lucide-react';
import { redditApi, SubredditFrequency } from '../lib/redditApi';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProgressBar from '../components/ProgressBar';
import AddToProjectModal from '../components/AddToProjectModal';
import CreateProjectModal from '../components/CreateProjectModal';
import { useCallback } from 'react';
import { getSubredditInfo, getSubredditPosts } from '../lib/reddit';
import { analyzeSubredditData } from '../lib/analysis';

interface AnalysisProgress {
  status: string;
  progress: number;
  indeterminate: boolean;
}

interface SaveStatus {
  subreddits: Partial<Record<string, {
    type: 'success' | 'error';
    message: string;
    saving: boolean;
    saved: boolean;
  }>>;
}

function SpyGlass() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [frequencies, setFrequencies] = useState<SubredditFrequency[]>([]);
  const [expandedSubreddit, setExpandedSubreddit] = useState<string | null>(null);
  const [selectedSubreddit, setSelectedSubreddit] = useState<{id: string; name: string} | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ subreddits: {} });
  const [savingAll, setSavingAll] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState<string[]>([]);

  // Process notification queue
  useEffect(() => {
    const timer = setInterval(() => {
      setNotificationQueue(prev => {
        if (prev.length === 0) return prev;
        return prev.slice(1);
      });
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || loading) return;

    setLoading(true);
    setError(null);
    setFrequencies([]);
    setProgress({
      status: 'Validating username...',
      progress: 20,
      indeterminate: false
    });

    try {
      const cleanUsername = redditApi.parseUsername(username.trim());
      if (!cleanUsername) {
        throw new Error('Please enter a valid Reddit username');
      }

      setProgress({
        status: 'Fetching user posts...',
        progress: 40,
        indeterminate: false
      });

      const posts = await redditApi.getUserPosts(cleanUsername);
      if (posts.length === 0) {
        throw new Error('No posts found for this user');
      }

      setProgress({
        status: 'Analyzing posting patterns...',
        progress: 80,
        indeterminate: false
      });

      const frequencies = await redditApi.analyzePostFrequency(posts);
      setFrequencies(frequencies);

      setProgress({
        status: 'Analysis complete!',
        progress: 100,
        indeterminate: false
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze user');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const saveSubreddit = async (subredditName: string) => {
    try {
      if (!user) {
        throw new Error('Please sign in to save subreddits');
      }

      // First check if this subreddit is already saved by the user
      const { data: existingSaved } = await supabase
        .from('saved_subreddits_with_icons')
        .select('*')
        .eq('name', subredditName)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingSaved) {
        setSaveStatus(prev => ({
          subreddits: {
            ...prev.subreddits,
            [subredditName]: {
              type: 'success',
              message: 'Already saved',
              saving: false,
              saved: true
            }
          }
        }));
        return existingSaved;
      }

      // Set initial saving state
      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [subredditName]: {
            type: 'success',
            message: 'Checking subreddit...',
            saving: true,
            saved: false
          }
        }
      }));

      // Check if subreddit already exists
      const { data: existingSubreddit } = await supabase
        .from('subreddits')
        .select('id, name')
        .eq('name', subredditName)
        .maybeSingle();

      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [subredditName]: {
            type: 'success',
            message: 'Analyzing subreddit...',
            saving: true,
            saved: false
          }
        }
      }));

      // Get fresh data
      const info = await getSubredditInfo(subredditName);
      const posts = await getSubredditPosts(subredditName);
      
      const analysis = await analyzeSubredditData(info, posts, () => {});

      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [subredditName]: {
            type: 'success',
            message: 'Saving to database...',
            saving: true,
            saved: false
          }
        }
      }));

      // Save to database
      const { data: savedSubreddit, error: upsertError } = await supabase
        .from('subreddits')
        .upsert({
          name: info.name,
          subscriber_count: info.subscribers,
          active_users: info.active_users,
          marketing_friendly_score: analysis.analysis.marketingFriendliness.score,
          posting_requirements: {
            restrictions: analysis.analysis.postingGuidelines.restrictions,
            bestTimes: analysis.analysis.postingGuidelines.bestTimes,
            frequency: analysis.analysis.postingGuidelines.frequency || 1
          },
          allowed_content: analysis.analysis.contentStrategy.recommendedTypes,
          best_practices: analysis.analysis.contentStrategy.dos,
          rules_summary: info.rules.map(r => r.title).join('\n'),
          last_analyzed_at: new Date().toISOString(),
          icon_img: info.icon_img,
          community_icon: info.community_icon
        }, {
          onConflict: 'name',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      if (!savedSubreddit) throw new Error('Failed to save subreddit');

      // Save to user's list if not already saved
      const { error: savedError } = await supabase
        .from('saved_subreddits')
        .insert({
          subreddit_id: savedSubreddit.id,
          user_id: user.id,
          last_post_at: null
        }, {
          onConflict: 'user_id,subreddit_id',
          ignoreDuplicates: true
        });

      if (savedError) throw savedError;
      return savedSubreddit;
    } catch (err) {
      console.error('Error saving subreddit:', err);
      throw err;
    }
  };

  const clearSaveStatus = useCallback((subredditName: string) => {
    setSaveStatus(prev => {
      const { [subredditName]: removed, ...rest } = prev.subreddits;
      return { subreddits: rest };
    });
  }, []);

  const handleSaveSubreddit = async (subredditName: string) => {
    const key = 'save_' + subredditName;
    if (!user || savingAll || saveStatus.subreddits[key]?.saving) return;

    clearSaveStatus(key);

    setSaveStatus(prev => ({
      subreddits: {
        ...prev.subreddits,
        [key]: ({
          type: 'success',
          message: 'Starting...',
          saving: true,
          saved: false
        } as { type: 'success' | 'error'; message: string; saving: boolean; saved: boolean; })
      }
    }));
    
    try {
      await saveSubreddit(subredditName);
      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [key]: ({
            type: 'success',
            message: 'Saved successfully',
            saving: false,
            saved: true
          } as { type: 'success' | 'error'; message: string; saving: boolean; saved: boolean; })
        }
      }));
    } catch (err) {
      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [key]: ({
            type: 'error',
            message: 'Failed to save',
            saving: false,
            saved: false
          } as { type: 'success' | 'error'; message: string; saving: boolean; saved: boolean; })
        }
      }));
      
      setTimeout(() => clearSaveStatus(key), 3000);
    }
  };

  const handleAddToProject = async (subredditName: string) => {
    const key = 'add_' + subredditName;
    if (!user || savingAll || saveStatus.subreddits[key]?.saving) return;

    setSaveStatus(prev => ({
      subreddits: {
        ...prev.subreddits,
        [key]: ({
          type: 'success',
          message: 'Starting addition...',
          saving: true,
          saved: false
        } as { type: 'success' | 'error'; message: string; saving: boolean; saved: boolean; })
      }
    }));
    
    try {
      const subreddit = await saveSubreddit(subredditName);
      setSelectedSubreddit({
        id: subreddit.id,
        name: subreddit.name
      });

      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [key]: ({
            type: 'success',
            message: 'Added to project',
            saving: false,
            saved: true
          } as { type: 'success' | 'error'; message: string; saving: boolean; saved: boolean; })
        }
      }));
    } catch (err) {
      setSaveStatus(prev => ({
        subreddits: {
          ...prev.subreddits,
          [key]: ({
            type: 'error',
            message: 'Failed to add to project',
            saving: false,
            saved: false
          } as { type: 'success' | 'error'; message: string; saving: boolean; saved: boolean; })
        }
      }));

      setTimeout(() => clearSaveStatus(key), 3000);
    }
  };

  const handleSaveAll = async () => {
    if (savingAll) return;
    setSavingAll(true);
    setShowCreateProject(true);
  };

  const handleCreateProject = async (projectData: { 
    name: string; 
    description: string | null; 
    image_url: string | null 
  }) => {
    setSaveStatus({ subreddits: {} });
    setShowCreateProject(false);
    
    try {
      // Create new project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: projectData.name,
          description: projectData.description,
          image_url: projectData.image_url,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (projectError) throw projectError;
      if (!project) throw new Error('Failed to create project');

      // Save all subreddits
      // Save subreddits sequentially to avoid overwhelming the API
      const savedSubreddits = [];
      for (const freq of frequencies) {
        const subreddit = await saveSubreddit(freq.name);
        
        // Add to project
        await supabase
          .from('project_subreddits')
          .insert({
            project_id: project.id,
            subreddit_id: subreddit.id
          });

        savedSubreddits.push(subreddit);
      }

      setSaveStatus({
        subreddits: {
          all: {
            type: 'success',
            message: `Saved ${savedSubreddits.length} subreddits to new project`,
            saving: false,
            saved: true
          }
        }
      });

      // Navigate to new project
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setSaveStatus({
        subreddits: {
          all: {
            type: 'error',
            message: 'Failed to save subreddits to project',
            saving: false,
            saved: false
          }
        }
      });
    } finally {
      setSavingAll(false);
      setShowCreateProject(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  const getSubredditIcon = (freq: SubredditFrequency) => {
    // Use community icon first if available
    if (freq.community_icon) {
      return freq.community_icon;
    }
    
    // Fallback to icon_img if available
    if (freq.icon_img) {
      return freq.icon_img;
    }
    
    // Final fallback to generated placeholder
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${freq.name}&backgroundColor=111111&radius=12`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="max-w-5xl container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">SpyGlass</h1>
          <p className="text-gray-400">
            Analyze other Reddit users' marketing strategies
          </p>
        </div>
      </div>

      <div className="bg-[#0f0f0f] rounded-lg p-6 mb-8">
        <form onSubmit={handleAnalyze} className="flex gap-4">
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter Reddit username (e.g., username, u/username, or profile URL)"
            className="flex-1 text-sm md:text-base bg-gray-900 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#C69B7B] focus:outline-none"
            disabled={loading}
          />
          <button 
            type="submit" 
            className="primary flex items-center gap-2 whitespace-nowrap text-sm md:text-base"
            disabled={loading}
          >
            <Telescope size={16} />
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 text-red-400 rounded-lg flex items-center gap-2">
          <AlertTriangle size={20} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="fixed top-4 right-4 z-50 pointer-events-none">
        {Object.entries(saveStatus.subreddits)
          .filter(([_, status]) => !!status && !status.saving)
          .slice(0, 1)
          .map(([key, status]) => {
            const s = status!; // non-null as filtered
            return (
              <div 
                key={key}
                className={`p-4 ${
                  s.type === 'success' 
                    ? 'bg-green-900/30 text-green-400' 
                    : 'bg-red-900/30 text-red-400'
                } rounded-lg flex items-center gap-2 backdrop-blur-sm shadow-lg animate-fade-in`}
              >
                {s.type === 'success' ? (
                  <Check size={20} className="shrink-0" />
                ) : (
                  <AlertTriangle size={20} className="shrink-0" />
                )}
                <p>
                  {key !== 'all' ? (
                    <>
                      <span className="font-medium">r/{key}:</span>{' '}
                      {s.message}
                    </>
                  ) : (
                    s.message
                  )}
                </p>
              </div>
            );
          })}
      </div>

      {progress && (
        <div className="bg-[#111111] p-4 rounded-lg">
          <ProgressBar 
            progress={progress.progress}
            status={progress.status}
            indeterminate={progress.indeterminate}
          />
        </div>
      )}

      {frequencies.length > 0 && (
        <div className="bg-[#111111] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[#222222] flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Found {frequencies.length} frequently posted subreddits
            </div>
            <button
              onClick={handleSaveAll}
              className="primary flex items-center gap-2 h-9 px-4 text-sm"
              disabled={savingAll}
            >
              <FolderPlus size={16} />
              {savingAll ? 'Saving...' : 'Save All to New Project'}
            </button>
          </div>

          <div className="divide-y divide-[#222222]">
            {frequencies.map((freq) => (
              <div key={freq.name}>
                <div className="p-4 hover:bg-[#1A1A1A] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] overflow-hidden flex-shrink-0">
                        <img 
                          src={getSubredditIcon(freq)}
                          alt={freq.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${freq.name}&backgroundColor=111111&radius=12`;
                          }}
                        />
                      </div>
                      <div>
                        <a 
                          href={`https://reddit.com/r/${freq.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[15px] hover:text-[#C69B7B] transition-colors inline-flex items-center gap-2"
                        >
                          r/{freq.name}
                          <ExternalLink size={14} className="text-gray-400" />
                        </a>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                          <div className="flex items-center gap-1">
                            <Users size={14} />
                            <span>{formatNumber(freq.subscribers)}</span>
                          </div>
                          {freq.active_users > 0 && (
                            <>
                              <span className="text-gray-600">•</span>
                              <div className="flex items-center gap-1 text-emerald-400">
                                <Activity size={14} />
                                <span>{formatNumber(freq.active_users)} online</span>
                              </div>
                            </>
                          )}
                          <span className="text-gray-600">•</span>
                          <span>{freq.count} posts</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveSubreddit(freq.name)}
                        className={`secondary flex items-center gap-2 py-2 px-3 text-sm whitespace-nowrap disabled:opacity-50 ${
                          saveStatus.subreddits['save_' + freq.name]?.saved ? 'saved' : ''
                        }`}
                        title={saveStatus.subreddits['save_' + freq.name]?.saved ? 'Saved to List' : 'Save to List'}
                        disabled={!user || savingAll || saveStatus.subreddits['save_' + freq.name]?.saving}
                      >
                        <div className="w-5 flex justify-center">
                          {saveStatus.subreddits['save_' + freq.name]?.saving ? (
                            <div className="animate-spin text-lg">⚬</div>
                          ) : saveStatus.subreddits['save_' + freq.name]?.saved ? (
                            <Check size={16} />
                          ) : (
                            <Bookmark size={16} />
                          )}
                        </div>
                        <span className="text-center">
                          {saveStatus.subreddits['save_' + freq.name]?.saving ? 'Saving' : 'Save'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleAddToProject(freq.name)}
                        className="secondary flex items-center gap-2 py-2 px-3 text-sm whitespace-nowrap disabled:opacity-50"
                        title={saveStatus.subreddits['add_' + freq.name]?.saved ? 'Added to Project' : 'Add to Project'}
                        disabled={!user || savingAll || saveStatus.subreddits['add_' + freq.name]?.saving}
                      >
                        <div className="w-5 flex justify-center">
                          <FolderPlus size={16} />
                        </div>
                        <span className="text-center">Add to Project</span>
                      </button>
                      <button
                        onClick={() => setExpandedSubreddit(
                          expandedSubreddit === freq.name ? null : freq.name
                        )}
                        className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                        disabled={savingAll || saveStatus.subreddits['save_' + freq.name]?.saving}
                      >
                        {expandedSubreddit === freq.name ? (
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {expandedSubreddit === freq.name && (
                  <div className="border-t border-[#222222] bg-[#0A0A0A] divide-y divide-[#222222]">
                    {freq.lastPosts.map((post) => (
                      <div key={post.id} className="p-4 hover:bg-[#111111] transition-colors">
                        <div className="flex items-start gap-4">
                          {(post.preview_url || post.thumbnail) ? (
                            <img 
                              src={post.preview_url || post.thumbnail}
                              alt=""
                              className="w-20 h-20 rounded-md object-cover bg-[#111111]"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = getSubredditIcon(freq);
                              }}
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-md bg-[#111111] flex items-center justify-center">
                              <img 
                                src={getSubredditIcon(freq)}
                                alt=""
                                className="w-12 h-12 object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${freq.name}&backgroundColor=111111`;
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[15px] font-medium hover:text-[#C69B7B] transition-colors line-clamp-2 mb-2"
                            >
                              {post.title}
                            </a>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <div className="flex items-center gap-1">
                                <Users size={14} />
                                <span>{post.score} points</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageCircle size={14} />
                                <span>{post.num_comments} comments</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                <span>{formatDate(post.created_utc)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedSubreddit && (
        <AddToProjectModal
          isOpen={true}
          onClose={() => setSelectedSubreddit(null)}
          subredditId={selectedSubreddit.id}
          subredditName={selectedSubreddit.name}
        />
      )}

      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onSubmit={handleCreateProject}
        defaultName={`${username}'s Subreddits`}
        defaultDescription={`Subreddits analyzed from u/${username}'s posting history`}
      />
    </div>
  );
}

export default SpyGlass;