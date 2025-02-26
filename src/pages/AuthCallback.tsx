import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

// Constants for retry mechanism
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second

// Helper function to check if a user has an active subscription
async function checkUserSubscription(userId: string): Promise<boolean> {
  try {
    // Check if user has any active subscription in the subscriptions table
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error code
      console.error('Error checking subscription status:', error);
      // If there's an error, default to letting them continue for better UX
      return true;
    }

    // Return true if user has an active subscription
    return !!data;
  } catch (error) {
    console.error('Exception checking subscription status:', error);
    // If there's an exception, default to letting them continue for better UX
    return true;
  }
}

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retries, setRetries] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const handleAuthSuccess = async () => {
      try {
        if (retries >= MAX_RETRIES) {
          setError('Failed to authenticate after multiple attempts. Please try logging in again.');
          setLoading(false);
          return;
        }

        // If we already have a user, check their subscription status
        if (user) {
          console.log('User already authenticated:', user.id);
          
          // Check if the user has an active subscription
          const hasSubscription = await checkUserSubscription(user.id);
          
          if (!hasSubscription) {
            console.log('User has no active subscription, redirecting to subscription page');
            navigate('/subscription', { 
              replace: true,
              state: { newUser: true }
            });
            return;
          }
          
          // User has a subscription, redirect to dashboard
          setLoading(false);
          navigate('/dashboard', { replace: true });
          return;
        }

        // Check if there are any URL parameters indicating authentication
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const hash = window.location.hash;

        // If we have parameters from the URL, use them to set the session
        if (accessToken && refreshToken) {
          console.log('Setting session from URL parameters');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            throw error;
          }

          // Successful session set, fetch user and check subscription
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Check if the user has an active subscription
            const hasSubscription = await checkUserSubscription(user.id);
            
            if (!hasSubscription) {
              console.log('User has no active subscription, redirecting to subscription page');
              navigate('/subscription', { 
                replace: true,
                state: { newUser: true }
              });
              return;
            }
            
            // User has a subscription, redirect to dashboard
            setLoading(false);
            navigate('/dashboard', { replace: true });
            return;
          }
        }

        // If we have a hash, try to exchange it for a session
        if (hash && hash.includes('access_token')) {
          console.log('Processing hash for authentication');
          
          // Extract access token from hash
          const hashParams = new URLSearchParams(hash.substring(1));
          const hashAccessToken = hashParams.get('access_token');
          const hashRefreshToken = hashParams.get('refresh_token');
          
          if (hashAccessToken && hashRefreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken
            });
            
            if (error) {
              throw error;
            }
            
            // Successful session exchange, fetch user and check subscription
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
              // Check if the user has an active subscription
              const hasSubscription = await checkUserSubscription(user.id);
              
              if (!hasSubscription) {
                console.log('User has no active subscription, redirecting to subscription page');
                navigate('/subscription', { 
                  replace: true,
                  state: { newUser: true }
                });
                return;
              }
              
              // User has a subscription, redirect to dashboard
              setLoading(false);
              navigate('/dashboard', { replace: true });
              return;
            }
          }
        }

        // No authentication data found yet, wait and retry
        console.log(`Authentication data not found, retrying (${retries + 1}/${MAX_RETRIES})...`);
        setTimeout(() => {
          setRetries(retries + 1);
        }, RETRY_DELAY);
      } catch (err) {
        console.error('Authentication error:', err);
        setError('Failed to authenticate. Please try logging in again.');
        setLoading(false);
      }
    };

    handleAuthSuccess();
  }, [user, retries, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        {loading ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Completing Authentication</h1>
            <p className="mb-4">Please wait while we complete the authentication process...</p>
            <LoadingSpinner size={12} />
          </>
        ) : error ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4">Authentication Complete</h1>
            <p className="mb-4">You are now authenticated! Redirecting to the dashboard...</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
} 