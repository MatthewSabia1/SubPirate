// Include the Supabase JavaScript client
// This is a minimal version of the Supabase JavaScript client for browser extensions

(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.supabase = {}));
})(this, (function(exports) {
  'use strict';

  class SupabaseClient {
    constructor(supabaseUrl, supabaseKey, options) {
      this.supabaseUrl = supabaseUrl;
      this.supabaseKey = supabaseKey;
      this.auth = {
        // Get the user from a token
        getUser: async (token) => {
          try {
            const response = await fetch(`${this.supabaseUrl}/auth/v1/user`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': this.supabaseKey
              }
            });
            
            if (!response.ok) {
              throw new Error('Failed to get user');
            }
            
            const data = await response.json();
            return { data: { user: data }, error: null };
          } catch (error) {
            return { data: { user: null }, error };
          }
        },
        
        // Get the current session
        getSession: async () => {
          try {
            // Try to get session from localStorage
            const supabaseSessionStr = localStorage.getItem('supabase.auth.token');
            if (supabaseSessionStr) {
              try {
                const supabaseSession = JSON.parse(supabaseSessionStr);
                if (supabaseSession?.currentSession?.access_token) {
                  const { currentSession } = supabaseSession;
                  return { 
                    data: { 
                      session: {
                        access_token: currentSession.access_token,
                        user: currentSession.user
                      }
                    }, 
                    error: null 
                  };
                }
              } catch (e) {
                console.error('Error parsing session:', e);
              }
            }
            
            return { data: { session: null }, error: null };
          } catch (error) {
            return { data: { session: null }, error };
          }
        },
        
        // Sign out user
        signOut: async () => {
          try {
            // Clear localStorage
            localStorage.removeItem('supabase.auth.token');
            return { error: null };
          } catch (error) {
            return { error };
          }
        },
        
        // Refresh session
        refreshSession: async () => {
          try {
            const supabaseSessionStr = localStorage.getItem('supabase.auth.token');
            if (supabaseSessionStr) {
              try {
                const supabaseSession = JSON.parse(supabaseSessionStr);
                if (supabaseSession?.currentSession?.refresh_token) {
                  const { currentSession } = supabaseSession;
                  const response = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': this.supabaseKey
                    },
                    body: JSON.stringify({ refresh_token: currentSession.refresh_token })
                  });
                  
                  if (!response.ok) {
                    throw new Error('Failed to refresh token');
                  }
                  
                  const data = await response.json();
                  
                  // Update session in localStorage
                  supabaseSession.currentSession = {
                    ...currentSession,
                    access_token: data.access_token,
                    refresh_token: data.refresh_token
                  };
                  localStorage.setItem('supabase.auth.token', JSON.stringify(supabaseSession));
                  
                  return { 
                    data: { 
                      session: {
                        access_token: data.access_token,
                        user: currentSession.user
                      }
                    }, 
                    error: null 
                  };
                }
              } catch (e) {
                console.error('Error refreshing session:', e);
              }
            }
            
            return { data: { session: null }, error: new Error('No refresh token available') };
          } catch (error) {
            return { data: { session: null }, error };
          }
        }
      };
    }
  }

  // Create and export the createClient function
  exports.createClient = function(supabaseUrl, supabaseKey, options = {}) {
    return new SupabaseClient(supabaseUrl, supabaseKey, options);
  };
}));