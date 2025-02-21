import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Grid, User, ChevronDown, Globe, FolderKanban, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useClickOutside } from '../hooks/useClickOutside';

interface RedditPost {
  id: string;
  post_id: string;
  created_at: string;
  reddit_accounts: { username: string };
  subreddits: { name: string };
}

interface DayPost {
  date: Date;
  posts: RedditPost[];
}

type ViewType = 'month' | 'week' | 'day';

interface Filter {
  accounts: string[];
  subreddits: string[];
  projects: string[];
}

interface FilterOption {
  id: string;
  name: string;
  image?: string;
}

const PostItem = React.memo(({ post }: { post: RedditPost }) => (
  <div className="bg-[#1A1A1A] p-3 rounded-lg shadow-sm hover:shadow-md hover:bg-[#252525] transition-all duration-200 flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <img
        src={`https://api.dicebear.com/7.x/initials/svg?seed=${post.reddit_accounts.username}&backgroundColor=333333`}
        alt={post.reddit_accounts.username}
        className="w-8 h-8 rounded-full"
      />
      <div className="flex-1">
        <span className="text-sm font-semibold text-gray-200 truncate block">u/{post.reddit_accounts.username}</span>
        <span className="text-sm text-[#C69B7B] truncate block">r/{post.subreddits.name}</span>
      </div>
    </div>
    <div className="text-xs italic text-gray-500">{new Date(post.created_at).toLocaleTimeString()}</div>
  </div>
));

function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<DayPost[]>([]);
  const [accounts, setAccounts] = useState<FilterOption[]>([]);
  const [subreddits, setSubreddits] = useState<FilterOption[]>([]);
  const [projects, setProjects] = useState<FilterOption[]>([]);
  const [openDropdown, setOpenDropdown] = useState<keyof Filter | null>(null);
  const dropdownRef = useClickOutside(() => setOpenDropdown(null));
  const [filters, setFilters] = useState<Filter>(() => {
    const savedFilters = localStorage.getItem('calendarFilters');
    return savedFilters ? JSON.parse(savedFilters) : { accounts: [], subreddits: [], projects: [] };
  });
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchSubreddits();
      fetchProjects();
      fetchPosts();
    }
  }, [user, currentDate, view, filters]);

  useEffect(() => {
    localStorage.setItem('calendarFilters', JSON.stringify(filters));
  }, [filters]);

  // Fetch Functions
  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, image_url')
        .eq('user_id', user?.id);
      if (error) throw error;
      setAccounts((data || []).map(profile => ({
        id: profile.id,
        name: profile.display_name || 'Unnamed User',
        image: profile.image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.display_name}&backgroundColor=111111`
      })));
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const fetchSubreddits = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_subreddits_with_icons')
        .select('id, name, icon_img, community_icon')
        .order('name');
      if (error) throw error;
      setSubreddits((data || []).map(subreddit => ({
        id: subreddit.id,
        name: subreddit.name,
        image: subreddit.community_icon || subreddit.icon_img || `https://api.dicebear.com/7.x/shapes/svg?seed=${subreddit.name}&backgroundColor=111111`
      })));
    } catch (err) {
      console.error('Error fetching subreddits:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, image_url')
        .eq('user_id', user?.id)
        .order('name');
      if (error) throw error;
      setProjects((data || []).map(project => ({
        id: project.id,
        name: project.name,
        image: project.image_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${project.name}&backgroundColor=111111`
      })));
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let startDate = new Date(currentDate);
      let endDate = new Date(currentDate);
      switch (view) {
        case 'month':
          startDate.setDate(1);
          endDate.setMonth(endDate.getMonth() + 1, 0);
          break;
        case 'week':
          startDate.setDate(currentDate.getDate() - currentDate.getDay());
          endDate.setDate(startDate.getDate() + 6);
          break;
        case 'day':
          endDate.setDate(currentDate.getDate() + 1);
          break;
      }

      let query = supabase
        .from('reddit_posts')
        .select('id, post_id, created_at, reddit_accounts (username), subreddits (name)')
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (filters.accounts.length > 0) query = query.in('reddit_accounts.username', filters.accounts);
      if (filters.subreddits.length > 0) query = query.in('subreddits.name', filters.subreddits);
      if (filters.projects.length > 0) {
        const { data: projectSubreddits } = await supabase
          .from('project_subreddits')
          .select('subreddit_id')
          .in('project_id', filters.projects);
        query = query.in('subreddits.id', projectSubreddits?.map(ps => ps.subreddit_id) || []);
      }

      const { data, error } = await query;
      if (error) throw error;

      const postsByDate = (data || []).reduce<DayPost[]>((acc, post) => {
        const date = new Date(post.created_at);
        date.setHours(0, 0, 0, 0);
        const existingDay = acc.find(day => day.date.getTime() === date.getTime());
        if (existingDay) existingDay.posts.push(post as RedditPost);
        else acc.push({ date, posts: [post as RedditPost] });
        return acc;
      }, []);

      setPosts(postsByDate);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  // Navigation and Filter Functions
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'month': newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1)); break;
      case 'week': newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7)); break;
      case 'day': newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1)); break;
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const clearFilters = () => setFilters({ accounts: [], subreddits: [], projects: [] });

  const toggleFilter = (type: keyof Filter, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value) ? prev[type].filter(v => v !== value) : [...prev[type], value]
    }));
  };

  // Calendar Utilities
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    const daysFromPrevMonth = firstDay.getDay();
    const prevMonth = new Date(year, month, 0);
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) days.push(new Date(year, month - 1, prevMonth.getDate() - i));
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) days.push(new Date(year, month + 1, i));
    return days;
  };

  const getDaysInWeek = (date: Date) => {
    const days: Date[] = [];
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - date.getDay());
    for (let i = 0; i < 7; i++) days.push(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i));
    return days;
  };

  const getPostsForDate = (date: Date) => {
    const dayPosts = posts.find(p => p.date.toDateString() === date.toDateString());
    return dayPosts?.posts || [];
  };

  const toggleDayExpansion = (date: Date) => {
    const dateStr = date.toISOString();
    setExpandedDay(expandedDay === dateStr ? null : dateStr);
  };

  // Render Functions
  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="grid grid-cols-7 gap-px bg-[#222222]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-[#111111] p-2 text-center text-sm text-gray-300 font-semibold sticky top-0 z-10">
            {day}
          </div>
        ))}
        {days.map(date => {
          const isToday = date.toDateString() === today.toDateString();
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const dayPosts = getPostsForDate(date);
          const isExpanded = expandedDay === date.toISOString();
          const postsByAccount = dayPosts.reduce<Record<string, number>>((acc, post) => {
            const username = post.reddit_accounts.username;
            acc[username] = (acc[username] || 0) + 1;
            return acc;
          }, {});

          return (
            <div
              key={date.toISOString()}
              onClick={() => toggleDayExpansion(date)}
              className={`bg-[#111111] p-2 min-h-[120px] cursor-pointer transition-all duration-200 hover:bg-[#1A1A1A] ${
                isCurrentMonth ? 'text-white' : 'text-gray-600'
              } ${isToday ? 'shadow-inner ring-2 ring-[#C69B7B] ring-inset' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{date.getDate()}</span>
                {dayPosts.length > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center text-xs bg-[#2B543A] text-white rounded-full">
                    {dayPosts.length}
                  </span>
                )}
              </div>
              {!isExpanded && (
                <div className="space-y-2">
                  {Object.entries(postsByAccount).slice(0, 2).map(([username, count]) => (
                    <div key={username} className="flex items-center justify-between bg-[#1A1A1A] p-1.5 rounded-md shadow-sm">
                      <span className="text-xs text-gray-200 truncate">u/{username}</span>
                      <span className="text-xs text-[#2B543A]">{count}</span>
                    </div>
                  ))}
                  {Object.keys(postsByAccount).length > 2 && (
                    <span className="text-xs text-gray-400">+{Object.keys(postsByAccount).length - 2} more</span>
                  )}
                </div>
              )}
              {isExpanded && (
                <div className="space-y-2 mt-2">
                  <div className="text-sm font-medium text-gray-300 border-b border-[#333333] pb-1">
                    Posts for {date.toLocaleDateString()}
                  </div>
                  {dayPosts.map(post => <PostItem key={post.id} post={post} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const days = getDaysInWeek(currentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="grid grid-cols-8 gap-px bg-[#222222]">
        <div className="bg-[#111111] p-2"></div>
        {days.map(date => (
          <div
            key={date.toISOString()}
            className={`bg-[#1A1A1A] p-2 text-center text-sm font-semibold sticky top-0 z-10 ${
              date.toDateString() === today.toDateString() ? 'ring-2 ring-[#C69B7B] ring-inset' : ''
            }`}
          >
            <div className="text-gray-300">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}</div>
            <div className="text-white">{date.getDate()}</div>
          </div>
        ))}
        {Array.from({ length: 24 }).map((_, hour) => (
          <React.Fragment key={hour}>
            <div className="bg-[#1A1A1A] p-2 text-right text-sm text-gray-400 w-20">
              {hour.toString().padStart(2, '0')}:00
            </div>
            {days.map(date => {
              const dayPosts = getPostsForDate(date).filter(post => new Date(post.created_at).getHours() === hour);
              return (
                <div
                  key={`${date.toISOString()}-${hour}`}
                  className="bg-[#111111] p-2 min-h-[40px] overflow-y-auto hover:bg-[#1A1A1A] transition-all duration-200"
                >
                  {dayPosts.map(post => <PostItem key={post.id} post={post} />)}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderDayView = () => {
    const dayPosts = getPostsForDate(currentDate);
    const postsByHour: Record<number, RedditPost[]> = {};
    dayPosts.forEach(post => {
      const hour = new Date(post.created_at).getHours();
      if (!postsByHour[hour]) postsByHour[hour] = [];
      postsByHour[hour].push(post);
    });

    return (
      <div className="space-y-2">
        {Array.from({ length: 24 }).map((_, hour) => (
          <div key={hour} className="flex border-t border-[#222222] bg-[#111111]">
            <div className="w-24 flex-shrink-0 bg-[#1A1A1A] p-4 text-sm text-gray-400 text-right">
              {hour.toString().padStart(2, '0')}:00
            </div>
            <div className="flex-1 p-4">
              {(postsByHour[hour] || []).length > 0 ? (
                postsByHour[hour].map(post => <PostItem key={post.id} post={post} />)
              ) : (
                <span className="text-gray-600 text-sm">No posts</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const hasPosts = posts.some(day => day.posts.length > 0);
  const selectedFilterCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  const getDateTitle = () => {
    if (view === 'month') return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleString('default', { month: 'short', day: 'numeric' })} – ${end.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Calendar</h1>
          <p className="text-gray-300 text-sm mt-1 mb-2">View and manage your Reddit posting schedule</p>
        </div>
        <div className="flex-1 bg-[#0A0A0A] p-4 rounded-lg shadow-sm" ref={dropdownRef}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'accounts' ? null : 'accounts')}
                className="flex items-center gap-2 px-4 py-2 bg-[#111111] rounded-md hover:bg-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
                aria-label="Filter by Reddit Accounts"
                aria-expanded={openDropdown === 'accounts'}
              >
                <User size={16} className="text-gray-400" />
                <span className="text-sm">Reddit Accounts</span>
                {filters.accounts.length > 0 && (
                  <span className="bg-[#2B543A] text-white text-xs px-2 py-0.5 rounded-full">{filters.accounts.length}</span>
                )}
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {openDropdown === 'accounts' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#111111] rounded-lg shadow-md border border-[#333333] p-3 max-h-60 overflow-y-auto z-50">
                  {accounts.length > 0 ? (
                    accounts.map(account => (
                      <button
                        key={account.id}
                        onClick={() => toggleFilter('accounts', account.id)}
                        className={`flex items-center gap-2 w-full p-2 rounded hover:bg-[#1A1A1A] transition-all duration-200 ${
                          filters.accounts.includes(account.id) ? 'bg-[#1A1A1A]' : ''
                        }`}
                      >
                        <img src={account.image} alt={account.name} className="w-6 h-6 rounded-full" />
                        <span className="text-sm truncate">{account.name}</span>
                        {filters.accounts.includes(account.id) && <Check size={16} className="ml-auto text-[#C69B7B]" />}
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-gray-400 text-sm">No accounts found</div>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'subreddits' ? null : 'subreddits')}
                className="flex items-center gap-2 px-4 py-2 bg-[#111111] rounded-md hover:bg-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
                aria-label="Filter by Subreddits"
                aria-expanded={openDropdown === 'subreddits'}
              >
                <Globe size={16} className="text-gray-400" />
                <span className="text-sm">Subreddits</span>
                {filters.subreddits.length > 0 && (
                  <span className="bg-[#2B543A] text-white text-xs px-2 py-0.5 rounded-full">{filters.subreddits.length}</span>
                )}
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {openDropdown === 'subreddits' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#111111] rounded-lg shadow-md border border-[#333333] p-3 max-h-60 overflow-y-auto z-50">
                  {subreddits.length > 0 ? (
                    subreddits.map(subreddit => (
                      <button
                        key={subreddit.id}
                        onClick={() => toggleFilter('subreddits', subreddit.id)}
                        className={`flex items-center gap-2 w-full p-2 rounded hover:bg-[#1A1A1A] transition-all duration-200 ${
                          filters.subreddits.includes(subreddit.id) ? 'bg-[#1A1A1A]' : ''
                        }`}
                      >
                        <img src={subreddit.image} alt={subreddit.name} className="w-6 h-6 rounded-md" />
                        <span className="text-sm truncate">r/{subreddit.name}</span>
                        {filters.subreddits.includes(subreddit.id) && <Check size={16} className="ml-auto text-[#C69B7B]" />}
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-gray-400 text-sm">No subreddits found</div>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'projects' ? null : 'projects')}
                className="flex items-center gap-2 px-4 py-2 bg-[#111111] rounded-md hover:bg-[#1A1A1A] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
                aria-label="Filter by Projects"
                aria-expanded={openDropdown === 'projects'}
              >
                <FolderKanban size={16} className="text-gray-400" />
                <span className="text-sm">Projects</span>
                {filters.projects.length > 0 && (
                  <span className="bg-[#2B543A] text-white text-xs px-2 py-0.5 rounded-full">{filters.projects.length}</span>
                )}
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {openDropdown === 'projects' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#111111] rounded-lg shadow-md border border-[#333333] p-3 max-h-60 overflow-y-auto z-50">
                  {projects.length > 0 ? (
                    projects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => toggleFilter('projects', project.id)}
                        className={`flex items-center gap-2 w-full p-2 rounded hover:bg-[#1A1A1A] transition-all duration-200 ${
                          filters.projects.includes(project.id) ? 'bg-[#1A1A1A]' : ''
                        }`}
                      >
                        <img src={project.image} alt={project.name} className="w-6 h-6 rounded-md" />
                        <span className="text-sm truncate">{project.name}</span>
                        {filters.projects.includes(project.id) && <Check size={16} className="ml-auto text-[#C69B7B]" />}
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-gray-400 text-sm">No projects found</div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-[#C69B7B] text-[#C69B7B] rounded-md hover:bg-[#C69B7B] hover:text-white transition-all duration-200 disabled:opacity-50 disabled:hover:bg-transparent"
              disabled={selectedFilterCount === 0}
              aria-label="Clear all filters"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 text-red-300 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="bg-[#111111] rounded-lg shadow-lg border border-[#222222] overflow-hidden">
        <div className="p-4 border-b border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">{getDateTitle()}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 bg-[#1A1A1A] border border-[#333333] hover:bg-[#252525] rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
                aria-label="Previous"
              >
                <ChevronLeft size={20} className="text-gray-300" />
              </button>
              <button
                onClick={goToToday}
                className="px-6 py-2 bg-[#1A1A1A] border border-[#333333] hover:bg-[#252525] rounded-md text-base text-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
                aria-label="Go to today"
              >
                Today
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 bg-[#1A1A1A] border border-[#333333] hover:bg-[#252525] rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
                aria-label="Next"
              >
                <ChevronRight size={20} className="text-gray-300" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-md">
            <button
              onClick={() => setView('month')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B] ${
                view === 'month' ? 'bg-[#C69B7B] text-white' : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#252525]'
              }`}
              aria-label="Month view"
              aria-pressed={view === 'month'}
            >
              <Grid size={16} />
              <span className="hidden sm:inline">Month</span>
            </button>
            <button
              onClick={() => setView('week')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B] ${
                view === 'week' ? 'bg-[#C69B7B] text-white' : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#252525]'
              }`}
              aria-label="Week view"
              aria-pressed={view === 'week'}
            >
              <CalendarIcon size={16} />
              <span className="hidden sm:inline">Week</span>
            </button>
            <button
              onClick={() => setView('day')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C69B7B] ${
                view === 'day' ? 'bg-[#C69B7B] text-white' : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#252525]'
              }`}
              aria-label="Day view"
              aria-pressed={view === 'day'}
            >
              <List size={16} />
              <span className="hidden sm:inline">Day</span>
            </button>
          </div>
        </div>
        <div className="p-2 min-h-[600px] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#C69B7B]"></div>
            </div>
          ) : hasPosts ? (
            <>
              {view === 'month' && renderMonthView()}
              {view === 'week' && renderWeekView()}
              {view === 'day' && renderDayView()}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 flex-col gap-2">
              <AlertCircle size={24} />
              <p>No posts found for the selected filters and date range.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Calendar;