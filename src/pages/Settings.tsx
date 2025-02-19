import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Settings() {
  const { user, updateProfile } = useAuth();
  const [email, setEmail] = useState('matt@matthewsabia.com');
  const [displayName, setDisplayName] = useState('Matthew Sabia');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ display_name: displayName });
      // Show success message
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      // Show error message
      return;
    }
    setLoading(true);
    try {
      // Implement password update logic
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-bold mb-8">Account Settings</h1>

      <div className="space-y-6">
        {/* Subscription Section */}
        <div className="bg-[#111111] p-6 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-xl font-semibold mb-1">Subscription</h2>
              <p className="text-gray-500 text-sm">Manage your subscription</p>
            </div>
            <span className="px-2 py-1 text-xs bg-green-900/30 text-green-400 rounded-md">Active</span>
          </div>

          <div className="mt-6 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-gray-500 mb-1">Plan</div>
                <div className="text-lg">Pro Plan</div>
              </div>
              <div className="text-right">
                <div className="text-gray-500 mb-1">Price</div>
                <div className="text-lg">$9.99/month</div>
              </div>
            </div>

            <div>
              <div className="text-gray-500 mb-1">Current Period Ends</div>
              <div className="text-lg">March 20, 2025</div>
            </div>

            <button className="secondary w-full">Cancel Subscription</button>
          </div>
        </div>

        {/* Profile Information Section */}
        <form onSubmit={handleProfileUpdate} className="bg-[#111111] p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-1">Profile Information</h2>
          <p className="text-gray-500 text-sm mb-6">Update your account profile settings</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm mb-2">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-gray-500 text-sm mt-2">This email will be used for account-related notifications</p>
            </div>

            <div>
              <label className="block text-sm mb-2">Display Name (optional)</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-gray-500 text-sm mt-2">This name will be displayed to other users</p>
            </div>

            <button type="submit" className="primary w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Change Password Section */}
        <form onSubmit={handlePasswordUpdate} className="bg-[#111111] p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-1">Change Password</h2>
          <p className="text-gray-500 text-sm mb-6">Update your account password</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm mb-2">Current Password</label>
              <input 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
              />
              <p className="text-gray-500 text-sm mt-2">Password must be at least 6 characters and contain uppercase, lowercase, and numbers</p>
            </div>

            <div>
              <label className="block text-sm mb-2">Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
              />
            </div>

            <button type="submit" className="primary w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;