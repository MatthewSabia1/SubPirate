// Constants
const SUPABASE_URL = '__SUPABASE_URL__'; // Will be replaced during build
const SUPABASE_KEY = '__SUPABASE_KEY__'; // Will be replaced during build
const APP_URL = '__APP_URL__'; // Will be replaced during build

console.log('Background script initialized');
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_KEY:', SUPABASE_KEY);
console.log('APP_URL:', APP_URL);

// Store environment variables in extension storage
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed - saving config values to storage');
  chrome.storage.local.set({
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
    appUrl: APP_URL
  }, () => {
    console.log('Configuration saved to storage');
  });
});

// Also set values when the background script loads (for reliability)
chrome.storage.local.set({
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_KEY,
  appUrl: APP_URL
}, () => {
  console.log('Configuration saved to storage on background script load');
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
    // Store authentication data in extension storage
    chrome.storage.local.set({ 
      session: data.session,
      profile: data.profile
    }, () => {
      console.log('Authentication data saved to storage');
      
      // Notify any open popup about successful authentication
      chrome.runtime.sendMessage({ 
        action: 'auth-success', 
        data: {
          session: data.session,
          profile: data.profile
        }
      });
    });
  } catch (error) {
    console.error('Error in handleAuthCallback:', error);
  }
}

// Handle logout
function handleLogout() {
  chrome.storage.local.remove(['session', 'profile'], () => {
    console.log('User logged out, session data removed');
    
    // Notify any open popup about logout
    chrome.runtime.sendMessage({ action: 'auth-logout' });
  });
}

// Debug function to check configuration
function checkConfiguration() {
  chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'appUrl'], (result) => {
    console.log('Current configuration:', result);
  });
}

// Run debug check at startup
checkConfiguration();
