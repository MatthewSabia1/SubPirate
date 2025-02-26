import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createBillingPortalSession } from '../lib/stripe/client';
import { getSubscriptionStatus } from '../lib/stripe/subscription';
import { supabase } from '../lib/supabase';

function Settings() {
  const { user, profile, updateProfile } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isEmailProvider, setIsEmailProvider] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      // Check if the user is using email provider or OAuth
      const provider = user.app_metadata?.provider || '';
      setIsEmailProvider(provider === 'email' || !provider);
    }
    if (profile) {
      setDisplayName(profile.display_name || '');
    }
  }, [user, profile]);

  useEffect(() => {
    async function loadSubscription() {
      try {
        const sub = await getSubscriptionStatus();
        setSubscription(sub);
      } catch (error) {
        console.error('Error loading subscription:', error);
      }
    }
    loadSubscription();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ display_name: displayName });
      // Show success message
      alert('Profile updated successfully');
    } catch (error) {
      // Handle error
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    
    // Validation checks
    if (!isEmailProvider) {
      setPasswordError('Password change is only available for email sign-in. You signed in with a third-party provider.');
      return;
    }

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }

    // More comprehensive password validation
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    // Check for uppercase, lowercase, and numbers
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /[0-9]/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setPasswordError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    setLoading(true);
    
    try {
      // First verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setPasswordError('Current password is incorrect');
        } else {
          setPasswordError(`Authentication error: ${signInError.message}`);
        }
        setLoading(false);
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Success
      setPasswordSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      
      // More specific error messages
      if (error.message.includes('auth')) {
        setPasswordError(`Authentication error: ${error.message}`);
      } else {
        setPasswordError(error.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      if (!subscription) {
        window.location.href = '/pricing';
        return;
      }

      const session = await createBillingPortalSession({
        customerId: subscription.stripe_customer_id,
        returnUrl: window.location.href,
      });
      
      window.location.href = session.url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-bold mb-8">Account Settings</h1>

      <div className="space-y-6">
        {/* Subscription Section */}
        <div className="bg-[#0f0f0f] p-6 rounded-lg text-[#ffffff]">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-xl font-semibold mb-1">Subscription</h2>
              <p className="text-gray-500 text-sm">Manage your subscription</p>
            </div>
            {subscription && (
              <span className={`px-2 py-1 text-xs rounded-md ${
                subscription.status === 'active' || subscription.status === 'trialing'
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-yellow-900/30 text-yellow-400'
              }`}>
                {subscription.status === 'trialing' ? 'Trial' : subscription.status}
              </span>
            )}
          </div>

          <div className="mt-6 space-y-6">
            {subscription ? (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-gray-500 mb-1">Plan</div>
                    <div className="text-lg">Pro Plan</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500 mb-1">Price</div>
                    <div className="text-lg">
                      ${subscription && subscription.stripe_price_id 
                        ? ((subscription.unit_amount || 0) / 100).toFixed(2)
                        : '9.99'}/month
                    </div>
                  </div>
                </div>

                {subscription.trial_end && (
                  <div>
                    <div className="text-gray-500 mb-1">Trial Ends</div>
                    <div className="text-lg">
                      {new Date(subscription.trial_end).toLocaleDateString()}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-gray-500 mb-1">Current Period Ends</div>
                  <div className="text-lg">
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </div>
                </div>

                {subscription.cancel_at_period_end && (
                  <div className="bg-yellow-900/30 text-yellow-400 p-4 rounded-lg">
                    <p className="text-sm">
                      Your subscription will end on {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <button 
                  className="secondary w-full" 
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? 'Loading...' : 'Manage Subscription'}
                </button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-gray-500 mb-4">No active subscription</p>
                <button 
                  className="primary w-full" 
                  onClick={() => window.location.href = '/pricing'}
                >
                  View Plans
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Information Section */}
        <form onSubmit={handleProfileUpdate} className="bg-[#0f0f0f] p-6 rounded-lg text-[#ffffff]">
          <h2 className="text-xl font-semibold mb-1">Profile Information</h2>
          <p className="text-gray-500 text-sm mb-6">Update your account profile settings</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm mb-2">Email</label>
              <input 
                type="email" 
                value={email}
                disabled={true} // Email cannot be changed directly
                className="opacity-70"
                placeholder="Enter your email address"
              />
              <p className="text-gray-500 text-sm mt-2">This email will be used for account-related notifications</p>
            </div>

            <div>
              <label className="block text-sm mb-2">Display Name (optional)</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
              <p className="text-gray-500 text-sm mt-2">This name will be displayed to other users</p>
            </div>

            <button type="submit" className="primary w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Change Password Section */}
        <form onSubmit={handlePasswordUpdate} className="bg-[#0f0f0f] p-6 rounded-lg text-[#ffffff]">
          <h2 className="text-xl font-semibold mb-1">Change Password</h2>
          <p className="text-gray-500 text-sm mb-6">
            {isEmailProvider 
              ? 'Update your account password' 
              : 'Password change is only available for email accounts. You signed in with a third-party provider.'}
          </p>

          {passwordError && (
            <div className="bg-red-900/30 text-red-400 p-4 rounded-lg mb-6">
              <p className="text-sm">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="bg-green-900/30 text-green-400 p-4 rounded-lg mb-6">
              <p className="text-sm">{passwordSuccess}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm mb-2">Current Password</label>
              <input 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                disabled={!isEmailProvider || loading}
                className={!isEmailProvider ? 'opacity-50' : ''}
              />
            </div>

            <div>
              <label className="block text-sm mb-2">New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                disabled={!isEmailProvider || loading}
                className={!isEmailProvider ? 'opacity-50' : ''}
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
                disabled={!isEmailProvider || loading}
                className={!isEmailProvider ? 'opacity-50' : ''}
              />
            </div>

            <button 
              type="submit" 
              className="primary w-full" 
              disabled={!isEmailProvider || loading}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;