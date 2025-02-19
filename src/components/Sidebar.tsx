import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Search, 
  Telescope, 
  BookmarkCheck, 
  Calendar, 
  FolderKanban, 
  Users, 
  Settings, 
  LogOut,
  Upload,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

interface Profile {
  display_name: string | null;
  image_url: string | null;
}

function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, image_url')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `user_images/${fileName}`;

      // Delete old image if exists
      if (profile?.image_url) {
        const oldPath = profile.image_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('user_images')
          .remove([oldPath]);
      }

      // Upload new image
      const { error: uploadError } = await supabase.storage
        .from('user_images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user_images')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ image_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, image_url: publicUrl } : null);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!user || !profile?.image_url) return;

    try {
      const filePath = profile.image_url.split('/').slice(-2).join('/');
      
      // Delete from storage
      await supabase.storage
        .from('user_images')
        .remove([filePath]);

      // Update profile
      await supabase
        .from('profiles')
        .update({ image_url: null })
        .eq('id', user.id);

      setProfile(prev => prev ? { ...prev, image_url: null } : null);
    } catch (err) {
      console.error('Error removing image:', err);
      setError('Failed to remove image');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const getProfileImage = () => {
    if (profile?.image_url) return profile.image_url;
    return `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.display_name || user?.email}&backgroundColor=111111`;
  };

  return (
    <div className="sidebar">
      <div className="p-4">
        <Logo />
      </div>
      
      <nav className="mt-4">
        <Link to="/" className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}>
          <Search size={20} />
          Analyze
        </Link>
        <Link to="/spyglass" className={`sidebar-link ${location.pathname === '/spyglass' ? 'active' : ''}`}>
          <Telescope size={20} />
          SpyGlass
        </Link>
        <Link to="/saved" className={`sidebar-link ${location.pathname === '/saved' ? 'active' : ''}`}>
          <BookmarkCheck size={20} />
          Saved List
        </Link>
        <Link to="/calendar" className={`sidebar-link ${location.pathname === '/calendar' ? 'active' : ''}`}>
          <Calendar size={20} />
          Calendar
        </Link>
        <Link to="/projects" className={`sidebar-link ${location.pathname === '/projects' ? 'active' : ''}`}>
          <FolderKanban size={20} />
          Projects
        </Link>
        <Link to="/accounts" className={`sidebar-link ${location.pathname === '/accounts' ? 'active' : ''}`}>
          <Users size={20} />
          Reddit Accounts
        </Link>
      </nav>

      <div className="absolute bottom-0 left-0 w-full border-t border-[#333333]">
        <div className="p-4">
          <div className="group relative">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={getProfileImage()}
                  alt={profile?.display_name || 'Profile'}
                  className="w-10 h-10 rounded-lg bg-[#1A1A1A]"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    <Upload 
                      size={16} 
                      className="text-white hover:text-[#C69B7B] transition-colors"
                    />
                  </label>
                  {profile?.image_url && (
                    <button
                      onClick={handleRemoveImage}
                      className="text-white hover:text-red-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {profile?.display_name || 'Unnamed User'}
                </div>
                <div className="text-sm text-gray-400 truncate">
                  {user?.email}
                </div>
              </div>
            </div>
            {error && (
              <div className="absolute bottom-full left-0 w-full mb-2 p-2 bg-red-900/50 text-red-400 text-xs rounded">
                {error}
              </div>
            )}
          </div>
        </div>
        <Link to="/settings" className={`sidebar-link ${location.pathname === '/settings' ? 'active' : ''}`}>
          <Settings size={20} />
          Settings
        </Link>
        <button onClick={handleLogout} className="sidebar-link w-full text-left">
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;