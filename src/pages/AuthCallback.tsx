import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Extract hash or code from URL if needed
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (data?.session) {
          // Successful auth, redirect to dashboard
          navigate('/dashboard', { replace: true });
        } else {
          // No session found, redirect to login
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Error in auth callback:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

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