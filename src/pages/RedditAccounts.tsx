import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, Trash2, MessageCircle, Star, Activity, ExternalLink, Upload, X, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { redditApi, SubredditPost } from '../lib/redditApi';
import { syncRedditAccountPosts } from '../lib/redditSync';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

interface RedditAccount {
  id: string;
  username: string;
  karma_score?: number;
  total_posts?: number;
  posts_today?: number;
  avatar_url?: string;
  last_post_check: string;
  last_karma_check: string;
  refreshing?: boolean;
  posts?: {
    recent: SubredditPost[];
    top: SubredditPost[];
  };
}

function RedditAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<RedditAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<RedditAccount | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState<string | null>(null);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recent' | 'top'>('recent');
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Refresh single account data
  const refreshAccountData = async (account: RedditAccount) => {
    try {
      setAccounts(prev => prev.map(a => 
        a.id === account.id ? { ...a, refreshing: true } : a
      ));

      const posts = await redditApi.getUserPosts(account.username);
      const postKarma = posts.length > 0 ? posts[0].post_karma || 0 : 0;
      
      // Get posts count from our database
      const { data: postsData } = await supabase
        .from('reddit_posts')
        .select('id')
        .eq('reddit_account_id', account.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const postsToday = postsData?.length || 0;

      // Update account stats in database
      const { error: updateError } = await supabase
        .from('reddit_accounts')
        .update({
          karma_score: postKarma,
          total_posts: posts.length,
          posts_today: postsToday,
          last_karma_check: new Date().toISOString()
        })
        .eq('id', account.id);

      if (updateError) throw updateError;

      setAccounts(prev => prev.map(a => 
        a.id === account.id ? {
          ...a,
          karma_score: postKarma,
          total_posts: posts.length,
          posts_today: postsToday,
          last_karma_check: new Date().toISOString(),
          refreshing: false
        } : a
      ));
    } catch (err) {
      console.error(`Error refreshing data for ${account.username}:`, err);
      setAccounts(prev => prev.map(a => 
        a.id === account.id ? { ...a, refreshing: false } : a
      ));
    }
  };

  async function getRedditProfilePic(username: string): Promise<string | null> {
    try {
      const response = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data?.data?.icon_img?.split('?')[0] || null;
    } catch (error) {
      console.error("Error fetching Reddit profile picture:", error);
      return null;
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);
  
  // Refresh all accounts when component mounts
  useEffect(() => {
    if (accounts.length > 0) {
      accounts.forEach(account => {
        syncRedditAccountPosts(account.id).then(() => {
          refreshAccountData(account);
        });
      });
    }
  }, [accounts.length]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('reddit_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch additional data for each account
      const accountsWithData = await Promise.all(
        (data || []).map(async (account) => {
          try {
            // Check if we need to update karma and posts (every hour)
            const lastCheck = new Date(account.last_karma_check || 0);
            const hoursSinceLastCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);

            if (hoursSinceLastCheck >= 1) {
              const posts = await redditApi.getUserPosts(account.username);
              const postsToday = posts.filter(post => {
                const postDate = new Date(post.created_utc * 1000);
                const today = new Date();
                return postDate.toDateString() === today.toDateString();
              }).length;

              // Get post karma from user data
              const postKarma = posts.length > 0 ? posts[0].post_karma || 0 : 0;

              // Update account stats in database
              const { error: updateError } = await supabase
                .from('reddit_accounts')
                .update({
                  karma_score: postKarma,
                  total_posts: posts.length,
                  posts_today: postsToday,
                  last_karma_check: new Date().toISOString()
                })
                .eq('id', account.id);

              if (updateError) throw updateError;

              return {
                ...account,
                karma_score: postKarma,
                total_posts: posts.length,
                posts_today: postsToday,
                last_karma_check: new Date().toISOString()
              };
            }

            return account;
          } catch (err) {
            console.error(`Error fetching data for ${account.username}:`, err);
            return account;
          }
        })
      );

      setAccounts(accountsWithData);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load Reddit accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || connecting || !user) return;

    setConnecting(true);
    setAddError(null);

    try {
      const cleanUsername = redditApi.parseUsername(newUsername.trim());
      if (!cleanUsername) {
        throw new Error('Please enter a valid Reddit username');
      }

      // Check if account already exists
      const { data: existing } = await supabase
        .from('reddit_accounts')
        .select('id')
        .eq('username', cleanUsername)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        throw new Error('This Reddit account is already connected');
      }

      // Verify account exists and get initial stats
      const posts = await redditApi.getUserPosts(cleanUsername);
      const profilePic = await getRedditProfilePic(cleanUsername);
      const postKarma = posts.length > 0 ? posts[0].post_karma || 0 : 0;
      
      const postsToday = posts.filter(post => {
        const postDate = new Date(post.created_utc * 1000);
        const today = new Date();
        return postDate.toDateString() === today.toDateString();
      }).length;

      // Add account to database
      const { error: insertError } = await supabase
        .from('reddit_accounts')
        .insert({
          username: cleanUsername,
          user_id: user.id,
          karma_score: postKarma,
          total_posts: posts.length,
          posts_today: postsToday,
          avatar_url: profilePic,
          last_post_check: new Date().toISOString(),
          last_karma_check: new Date().toISOString()
        });

      if (insertError) throw insertError;

      setNewUsername('');
      fetchAccounts();
    } catch (err) {
      console.error('Error adding account:', err);
      setAddError(err instanceof Error ? err.message : 'Failed to add Reddit account');
    } finally {
      setConnecting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccount) return;

    try {
      // Delete avatar if exists
      if (deleteAccount.avatar_url) {
        const avatarPath = deleteAccount.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('user_images')
          .remove([avatarPath]);
      }

      // Delete account
      const { error } = await supabase
        .from('reddit_accounts')
        .delete()
        .eq('id', deleteAccount.id);

      if (error) throw error;
      setAccounts(prev => prev.filter(a => a.id !== deleteAccount.id));
      setDeleteAccount(null);
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete Reddit account');
    }
  };

  const handleAvatarUpload = async (accountId: string, file: File) => {
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB');
      return;
    }

    setUploadingAvatar(accountId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/reddit_accounts/${accountId}/${Date.now()}.${fileExt}`;

      const account = accounts.find(a => a.id === accountId);
      if (account?.avatar_url) {
        const oldPath = account.avatar_url.split('/user_images/')[1];
        await supabase.storage
          .from('user_images')
          .remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('user_images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user_images')
        .getPublicUrl(fileName);

      // Update account
      const { error: updateError } = await supabase
        .from('reddit_accounts')
        .update({ avatar_url: publicUrl })
        .eq('id', accountId);

      if (updateError) throw updateError;

      // Update local state
      setAccounts(prev => prev.map(a => 
        a.id === accountId ? { ...a, avatar_url: publicUrl } : a
      ));
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Failed to upload avatar');
    } finally {
      setUploadingAvatar(null);
    }
  };

  const handleRemoveAvatar = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account?.avatar_url) return;

    try {
      const filePath = account.avatar_url.split('/user_images/')[1];
      await supabase.storage
        .from('user_images')
        .remove([filePath]);

      // Update account
      const { error: updateError } = await supabase
        .from('reddit_accounts')
        .update({ avatar_url: null })
        .eq('id', accountId);

      if (updateError) throw updateError;

      // Update local state
      setAccounts(prev => prev.map(a => 
        a.id === accountId ? { ...a, avatar_url: null } : a
      ));
    } catch (err) {
      console.error('Error removing avatar:', err);
      setError('Failed to remove avatar');
    }
  };

  const loadAccountPosts = async (account: RedditAccount) => {
    if (account.posts) return;
    
    setLoadingPosts(true);
    try {
      const [recentPosts, topPosts] = await Promise.all([
        redditApi.getUserPosts(account.username, 'new'),
        redditApi.getUserPosts(account.username, 'top')
      ]);

      setAccounts(prev => prev.map(a => 
        a.id === account.id ? {
          ...a,
          posts: {
            recent: recentPosts,
            top: topPosts
          }
        } : a
      ));
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const toggleAccountExpansion = async (accountId: string) => {
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
      setActiveTab('recent');
      return;
    }

    setExpandedAccount(accountId);
    setActiveTab('recent');
    const account = accounts.find(a => a.id === accountId);
    if (account && !account.posts) {
      await loadAccountPosts(account);
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

  const getAccountAvatar = (username: string) => {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${username}&backgroundColor=111111`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading Reddit accounts...</div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-[1200px] mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">Reddit Accounts</h1>
            <p className="text-gray-400">
              Connect and manage your Reddit accounts
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-900/30 text-red-400 rounded-lg flex items-center gap-2">
            <AlertTriangle size={20} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Add Account Form */}
        <div className="bg-[#0f0f0f] rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-1">Add Reddit Account</h2>
          <p className="text-gray-400 text-sm mb-6">
            Enter a Reddit username to connect it to your account
          </p>

          {addError && (
            <div className="mb-6 p-3 bg-red-900/30 text-red-400 rounded-md text-sm flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <p>{addError}</p>
            </div>
          )}

          <form onSubmit={handleAddAccount} className="flex gap-4">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter username or profile URL"
              className="flex-1 text-sm md:text-base"
              disabled={connecting}
            />
            <button 
              type="submit" 
              className="primary flex items-center gap-2 whitespace-nowrap text-sm md:text-base"
              disabled={connecting || !newUsername.trim()}
            >
              <Users size={20} />
              <span className="hidden md:inline">{connecting ? 'Connecting...' : 'Connect Account'}</span>
              <span className="md:hidden">{connecting ? 'Connecting...' : 'Connect'}</span>
            </button>
          </form>
        </div>

        {/* Accounts List */}
        <div className="bg-[#0f0f0f] rounded-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-[auto_1fr_120px_120px_120px_80px] gap-4 p-4 border-b border-[#222222] text-sm text-gray-400">
            <div className="pl-2">Account</div>
            <div></div>
            <div className="text-center">Karma</div>
            <div className="text-center">Total Posts</div>
            <div className="text-center">Posts Today</div>
            <div className="text-right pr-2">Actions</div>
          </div>

          <div className="divide-y divide-[#222222]">
            {accounts.map((account) => (
              <div 
                key={account.id}
                className="md:grid md:grid-cols-[auto_1fr_120px_120px_120px_80px] gap-4 p-4 hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="relative group">
                  <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] overflow-hidden">
                    <img 
                      src={account.avatar_url || getAccountAvatar(account.username)}
                      alt={`u/${account.username}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = getAccountAvatar(account.username);
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAvatarUpload(account.id, file);
                          }}
                          disabled={uploadingAvatar === account.id}
                        />
                        <Upload 
                          size={16} 
                          className="text-white hover:text-[#C69B7B] transition-colors"
                        />
                      </label>
                      {account.avatar_url && (
                        <button
                          onClick={() => handleRemoveAvatar(account.id)}
                          className="text-white hover:text-red-400 transition-colors"
                          disabled={uploadingAvatar === account.id}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {uploadingAvatar === account.id && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="animate-spin text-lg">⚬</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <a 
                    href={`https://reddit.com/user/${account.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[15px] hover:text-[#C69B7B] transition-colors inline-flex items-center gap-2 mb-1"
                  >
                    u/{account.username}
                    <ExternalLink size={14} className="text-gray-400" />
                  </a>
                  <div className="flex items-center gap-4 md:hidden mt-2">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star size={14} />
                      <span className="text-sm">{account.karma_score || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <MessageCircle size={14} />
                      <span className="text-sm">{account.total_posts || '—'}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${account.posts_today > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                      <Activity size={14} />
                      <span className="text-sm">{account.posts_today || '0'}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-center gap-1 text-amber-400">
                  <Star size={16} />
                  <span>{account.karma_score || '—'}</span>
                </div>

                <div className="hidden md:flex items-center justify-center gap-1 text-gray-400">
                  <MessageCircle size={16} />
                  <span>{account.total_posts || '—'}</span>
                </div>

                <div className={`hidden md:flex items-center justify-center gap-1 ${account.posts_today > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                  <Activity size={16} />
                  <span>{account.posts_today || '0'}</span>
                </div>

                <div className="absolute md:static top-4 right-4">
                  <button
                    onClick={() => toggleAccountExpansion(account.id)}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                    title={expandedAccount === account.id ? "Hide Posts" : "Show Posts"}
                  >
                    {expandedAccount === account.id ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteAccount(account)}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                    title="Remove Account"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {/* Expanded Posts Section */}
                {expandedAccount === account.id && (
                  <div className="col-span-6 border-t border-[#222222] bg-[#0f0f0f] mt-4 -mx-4 px-4">
                    {/* Tabs */}
                    <div className="flex gap-4 py-4">
                      <button
                        onClick={() => setActiveTab('recent')}
                        className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
                          activeTab === 'recent'
                            ? 'bg-[#C69B7B] text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Most Recent
                      </button>
                      <button
                        onClick={() => setActiveTab('top')}
                        className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
                          activeTab === 'top'
                            ? 'bg-[#C69B7B] text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Top Posts
                      </button>
                    </div>

                    {/* Posts List */}
                    {loadingPosts ? (
                      <div className="py-8 text-center text-gray-400">
                        Loading posts...
                      </div>
                    ) : account.posts ? (
                      <div className="divide-y divide-[#222222]">
                        {account.posts[activeTab].map((post) => (
                          <div key={post.id} className="py-4 hover:bg-[#111111] transition-colors">
                            <div className="flex items-start gap-4">
                              {(post.preview_url || post.thumbnail) ? (
                                <img 
                                  src={post.preview_url || post.thumbnail}
                                  alt=""
                                  className="w-20 h-20 rounded-md object-cover bg-[#111111]"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = account.avatar_url || getAccountAvatar(account.username);
                                  }}
                                />
                              ) : (
                                <div className="w-20 h-20 rounded-md bg-[#111111] flex items-center justify-center">
                                  <img 
                                    src={account.avatar_url || getAccountAvatar(account.username)}
                                    alt=""
                                    className="w-12 h-12"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = getAccountAvatar(account.username);
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
                    ) : (
                      <div className="py-8 text-center text-gray-400">
                        Failed to load posts
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {accounts.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                No Reddit accounts connected yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteAccount}
        onClose={() => setDeleteAccount(null)}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-1">Remove Reddit Account</h2>
          <p className="text-gray-400 text-sm mb-6">
            Are you sure you want to remove u/{deleteAccount?.username}? This action cannot be undone.
          </p>

          <div className="flex gap-2">
            <button 
              onClick={handleDeleteAccount}
              className="primary flex-1 text-sm md:text-base"
            >
              Remove Account
            </button>
            <button 
              onClick={() => setDeleteAccount(null)}
              className="secondary text-sm md:text-base"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default RedditAccounts;