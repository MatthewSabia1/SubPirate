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
      pathname: window.location.pathname
    });
    
    if (hasAuthParams) {
      console.log('Auth params detected in URL');
      
      // Store the hash for the callback component to use
      try {
        sessionStorage.setItem('supabase-auth-hash', hash);
        
        // Redirect to the callback handler
        if (window.location.hostname === 'subpirate.com') {
          // In production, use absolute URL to ensure correct handling
          window.location.href = 'https://subpirate.com/auth/callback' + hash;
        } else {
          // In development, use relative path
          navigate('/auth/callback' + hash);
        }
      } catch (error) {
        console.error('Error handling auth redirect:', error);
      }
    }
    
    // Check if we have a session in the URL (detectSessionInUrl)
    const checkForSession = async () => {
      // Let Supabase check for session in URL if present
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error checking for session:', error);
        return;
      }
      
      if (data?.session) {
        console.log('Session detected from URL, redirecting to dashboard');
        navigate('/dashboard');
      }
    };
    
    checkForSession();
  }, [navigate]);
} 