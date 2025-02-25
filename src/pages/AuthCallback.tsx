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
        console.log("AuthCallback mounted, handling authentication...");
        
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
          
          // Extract the token ourselves
          const hashParams = new URLSearchParams(currentHash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const expiresIn = hashParams.get('expires_in');
          const tokenType = hashParams.get('token_type');
          
          if (accessToken) {
            console.log("Access token found in URL, attempting to set session manually");
            
            try {
              // Force Supabase to process the URL
              const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
              
              if (sessionData?.session) {
                console.log("Session established via getSession");
                navigate('/dashboard', { replace: true });
                return;
              } else {
                // If still no session, try to manually set the session using the tokens
                if (accessToken && refreshToken) {
                  console.log("Attempting to manually set session with tokens");
                  try {
                    const { data, error } = await supabase.auth.setSession({
                      access_token: accessToken,
                      refresh_token: refreshToken
                    });
                    
                    if (error) {
                      console.error("Error setting session manually:", error);
                    } else if (data?.session) {
                      console.log("Session established manually");
                      navigate('/dashboard', { replace: true });
                      return;
                    }
                  } catch (err) {
                    console.error("Error in manual session setting:", err);
                  }
                }
                
                // One more attempt with getSession after a delay
                console.log("No session yet, waiting a bit longer...");
                await new Promise(resolve => setTimeout(resolve, 2000));
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
        } else {
          console.log("No hash fragment detected, checking for existing session");
        }

        // Check if we already have a session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          throw error;
        }

        if (data?.session) {
          console.log("Session found, redirecting to dashboard");
          navigate('/dashboard', { replace: true });
          return;
        }
        
        // If we get here, we have failed to establish a session
        console.log("Failed to establish a session after multiple attempts");
        setError("Authentication failed. Please try again.");
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
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

    // Handle possible timeout - if no auth event after 15 seconds, go to login
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log("Auth timeout reached");
        setLoading(false);
        setError("Authentication timed out. Please try again.");
        navigate('/login', { replace: true });
      }
    }, 15000);

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