import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// These environment variables are set in .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Determine if we're in production based on the hostname
const isProduction = window.location.hostname === 'subpirate.com';
console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);

// Configure Supabase client with environment-specific settings
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    // For debugging auth issues
    debug: !isProduction,
  },
  global: {
    fetch: (...args) => fetch(...args),
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to debug auth state
export async function debugAuthState() {
  const { data, error } = await supabase.auth.getSession();
  console.log('Current session:', data?.session ? 'Exists' : 'None');
  if (data?.session) {
    console.log('User logged in:', data.session.user.email);
  }
  return { data, error };
}

// Helper function to parse hash parameters - for debugging
export function getHashParameters(hash: string) {
  const hashWithoutPrefix = hash.startsWith('#') ? hash.substring(1) : hash;
  const params = new URLSearchParams(hashWithoutPrefix);
  const result: Record<string, string> = {};
  
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  
  return result;
}