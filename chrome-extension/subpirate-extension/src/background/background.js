// Constants
const SUPABASE_URL = 'https://pdgnyhkngewmneujsheq.supabase.co'; // Will be replaced during build
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZ255aGtuZ2V3bW5ldWpzaGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4ODU3NjYsImV4cCI6MjA1NTQ2MTc2Nn0.C0AtQq3841gVmK4k6mDOUdZE0jpJ5fWGEHTM8DNnt-g'; // Will be replaced during build
const APP_URL = 'http://localhost:5173'; // Will be replaced during build

// Store environment variables in extension storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
    appUrl: APP_URL
  });
});

// Listen for messages from the content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'authCallback') {
    handleAuthCallback(message.data);
    sendResponse({ status: 'processing' });
    return true;
  }
  
  if (message.action === 'logout') {
    handleLogout();
    sendResponse({ status: 'success' });
    return true;
  }
});

// Handle authentication callback from the main app
async function handleAuthCallback(data) {
  try {
    if (!data || !data.session) {
      throw new Error('Invalid session data');
    }
    
    // Store the session data in extension storage
    chrome.storage.local.set({
      session: data.session,
      profile: data.profile || null
    }, () => {
      console.log('Authentication data stored successfully');
      
      // Notify any open popup
      chrome.runtime.sendMessage({ 
        action: 'authSuccess', 
        data: { 
          session: data.session,
          profile: data.profile 
        } 
      });
    });
  } catch (error) {
    console.error('Error handling auth callback:', error);
  }
}

// Handle logout
function handleLogout() {
  // Clear stored session data
  chrome.storage.local.remove(['session', 'profile'], () => {
    console.log('Session data cleared');
  });
}

// Listen for web requests to capture Supabase authentication
chrome.webRequest.onCompleted.addListener(
  function(details) {
    // This will capture Supabase auth requests if we need additional handling
    if (details.url.includes('supabase.co/auth/v1/token') && details.method === 'POST') {
      console.log('Auth request completed:', details);
    }
  },
  { urls: ['*://auth.supabase.co/*', '*://*.supabase.co/auth/v1/*'] }
);

// Function to handle deep linking from the main app
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('extension-auth')) {
    // Parse the auth data from the URL
    const url = new URL(tab.url);
    const sessionData = url.searchParams.get('session');
    const profileData = url.searchParams.get('profile');
    
    if (sessionData) {
      try {
        const session = JSON.parse(decodeURIComponent(sessionData));
        const profile = profileData ? JSON.parse(decodeURIComponent(profileData)) : null;
        
        handleAuthCallback({ session, profile });
        
        // Close the tab as it has served its purpose
        chrome.tabs.remove(tabId);
      } catch (error) {
        console.error('Error parsing extension auth data:', error);
      }
    }
  }
});
