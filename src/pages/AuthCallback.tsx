import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthentication = async () => {
      try {
        // Check if we're coming back from an OAuth redirect with a fragment
        let currentHash = location.hash;

        // Check if we have a stored hash from the index.html script
        const storedHash = sessionStorage.getItem('supabase-auth-hash');
        if (storedHash && !currentHash) {
          console.log("Found stored hash from redirect:", storedHash);
          currentHash = storedHash;
          // Clean up
          sessionStorage.removeItem('supabase-auth-hash');
        }

        if (currentHash) {
          console.log("Hash fragment detected:", currentHash);
          // Give Supabase a moment to process the hash
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // First, check if we already have a session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (data?.session) {
          console.log("Session found, redirecting to dashboard");
          navigate('/dashboard', { replace: true });
          return;
        }

        // If no session yet, check if we have access token in the URL
        // This ensures we don't miss tokens even if event doesn't fire
        const hashParams = new URLSearchParams(currentHash.substring(1));
        const accessToken = hashParams.get('access_token');
        
        if (accessToken) {
          console.log("Access token found in URL");
          try {
            // Attempt to set the session manually if needed
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (!sessionError && sessionData?.session) {
              console.log("Session established after token detection");
              navigate('/dashboard', { replace: true });
              return;
            } else {
              // Wait a bit longer for Supabase to process the token
              console.log("No session yet, waiting a bit longer...");
              await new Promise(resolve => setTimeout(resolve, 1500));
              const { data: retryData } = await supabase.auth.getSession();
              if (retryData?.session) {
                console.log("Session established on retry");
                navigate('/dashboard', { replace: true });
                return;
              }
            }
          } catch (err) {
            console.error("Error processing URL token:", err);
          }
        }
      } catch (err) {
        console.error('Error in handleAuthentication:', err);
        setError("Authentication failed. Please try again.");
      }
    };

    handleAuthentication();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change:", event);
        
        if (event === 'SIGNED_IN' && session) {
          console.log("User signed in, redirecting to dashboard");
          setLoading(false);
          navigate('/dashboard', { replace: true });
        } else if (event === 'SIGNED_OUT') {
          console.log("User signed out");
          navigate('/login', { replace: true });
        } else if (event === 'USER_UPDATED') {
          console.log("User updated");
          // No need to redirect
        } else if (event === 'TOKEN_REFRESHED') {
          console.log("Token refreshed");
          // No need to redirect
        } else {
          // For any other event where we lack a session
          if (!session) {
            console.log("No session in event:", event);
            setLoading(false);
            setError("Authentication failed or session expired");
            setTimeout(() => {
              navigate('/login', { replace: true });
            }, 2000);
          }
        }
      }
    );

    // Handle possible timeout - if no auth event after 10 seconds, go to login
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log("Auth timeout reached");
        setLoading(false);
        setError("Authentication timed out. Please try again.");
        navigate('/login', { replace: true });
      }
    }, 10000);

    return () => {
      // Clean up the listener and timeout when the component unmounts
      authListener.subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [navigate, loading, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-8 space-y-4 bg-[#0f0f0f] rounded-lg">
        {error ? (
          <>
            <h2 className="text-xl font-semibold text-red-400">Authentication Error</h2>
            <p className="text-red-400">{error}</p>
            <p className="text-gray-400">Redirecting to login page...</p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold">Completing Authentication</h2>
            <p className="text-gray-400">Please wait while we complete the sign-in process...</p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C69B7B]"></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 