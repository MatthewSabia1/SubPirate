import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

/**
 * Custom hook to handle authentication redirects.
 * This is particularly useful for handling OAuth redirects in production environments.
 */
export function useRedirectHandler() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Wrap all the logic in try/catch to prevent crashing the app
    try {
      console.log('Initializing redirect handler');
      
      // Check if we have a hash in the URL that contains auth tokens
      const hash = window.location.hash;
      const hasAuthParams = hash && (
        hash.includes('access_token') || 
        hash.includes('id_token') || 
        hash.includes('refresh_token') || 
        hash.includes('error_description')
      );
      
      console.log('Redirect handler check', { 
        hash: hash ? 'present' : 'none',
        hasAuthParams,
        pathname: window.location.pathname,
        url: window.location.href.replace(/access_token=([^&]+)/, 'access_token=REDACTED')
      });
      
      if (hasAuthParams) {
        console.log('Auth params detected in URL');
        
        // Store the hash for the callback component to use
        try {
          sessionStorage.setItem('supabase-auth-hash', hash);
          
          // Only redirect if we're not already on the callback page
          if (!window.location.pathname.includes('/auth/callback')) {
            console.log('Redirecting to callback handler');
            const callbackUrl = window.location.hostname === 'subpirate.com'
              ? 'https://subpirate.com/auth/callback'
              : '/auth/callback';
              
            // Ensure we have a clean URL without any trailing spaces
            const cleanCallbackUrl = callbackUrl.trim();
            
            // Ensure we properly append the hash
            const redirectUrl = `${cleanCallbackUrl}${hash}`;
            
            console.log('Redirecting to:', redirectUrl.replace(/access_token=([^&]+)/, 'access_token=REDACTED'));
            
            if (window.location.hostname === 'subpirate.com') {
              // In production, use window.location.replace for a clean redirect
              window.location.replace(redirectUrl);
            } else {
              // In development, use navigate
              navigate(redirectUrl);
            }
          } else {
            console.log('Already on callback page, not redirecting');
          }
        } catch (error) {
          console.error('Error handling auth redirect:', error);
        }
      } else {
        // Only check for session if we don't have auth params
        // This prevents possible redirect loops
        const checkForSession = async () => {
          try {
            // Let Supabase check for session in URL if present
            const { data, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('Error checking for session:', error);
              return;
            }
            
            if (data?.session && window.location.pathname === '/') {
              console.log('Session detected and on root path, redirecting to dashboard');
              navigate('/dashboard');
            }
          } catch (sessionError) {
            console.error('Session check failed:', sessionError);
          }
        };
        
        checkForSession();
      }
    } catch (error) {
      // If anything fails, log it but don't break the app
      console.error('Redirect handler failed:', error);
    }
  }, [navigate]);
} 