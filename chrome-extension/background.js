// Constants for URLs
const WEBAPP_URL = 'https://subpirate.app';
const API_BASE_URL = 'https://api.subpirate.app';

// Setup Supabase session refresh timer
let refreshTimer = null;

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type);
  
  // Handle authentication message
  if (message.type === 'AUTH_SUCCESS') {
    console.log('Background: AUTH_SUCCESS received');
    // Store the authentication token and user info
    chrome.storage.local.set({
      token: message.token,
      user: message.user
    }, () => {
      console.log('Authentication data saved in background script');
      sendResponse({ success: true });
      
      // Close any open auth tabs if needed
      if (message.closeTab && sender.tab) {
        chrome.tabs.remove(sender.tab.id);
      }
    });
    return true; // Required for async response
  }
  
  // Handle saving a subreddit from content script
  if (message.type === 'SAVE_SUBREDDIT') {
    handleSaveSubreddit(message.subreddit)
      .then((result) => sendResponse(result))
      .catch((err) => {
        console.error('Error saving subreddit:', err);
        sendResponse({ error: err.message });
      });
    return true; // Required for async response
  }
  
  // Get subreddit info from content script
  if (message.type === 'SUBREDDIT_INFO') {
    // Store the subreddit info temporarily
    chrome.storage.local.set({
      currentSubreddit: message.subreddit
    });
    return true;
  }
});

// Handle saving a subreddit from the content script
async function handleSaveSubreddit(subredditName) {
  try {
    // Get the user's token
    const { token } = await new Promise(resolve => {
      chrome.storage.local.get(['token'], result => resolve(result));
    });
    
    if (!token) {
      // User is not authenticated, open the popup to login
      chrome.action.openPopup();
      return { success: false, message: 'Please login to save subreddits' };
    }
    
    // Make API call to save the subreddit
    const response = await fetch(`${API_BASE_URL}/api/saved/subreddits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: subredditName })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return success
    return { success: true, message: 'Subreddit saved successfully!' };
  } catch (err) {
    console.error('Error saving subreddit:', err);
    return { success: false, message: err.message };
  }
}

// Setup periodic token refresh
function setupTokenRefresh() {
  // Clear any existing timer
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  
  // Set up a timer to refresh the token every 45 minutes (token typically lasts 1 hour)
  refreshTimer = setInterval(refreshToken, 45 * 60 * 1000);
}

// Refresh the authentication token
async function refreshToken() {
  try {
    // Check if we have a token to refresh
    const { token } = await new Promise(resolve => {
      chrome.storage.local.get(['token'], result => resolve(result));
    });
    
    if (!token) {
      // No token to refresh
      console.log('No token to refresh');
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      return;
    }
    
    // Instead of dynamically importing Supabase, make a direct fetch request
    // to refresh the token via the SubPirate API
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const data = await response.json();
      
      if (data.token && data.user) {
        // Save the new token and user data
        chrome.storage.local.set({
          token: data.token,
          user: data.user
        });
        
        console.log('Token refreshed successfully via API');
        return;
      }
    } catch (err) {
      console.error('Error refreshing token via API:', err);
      // Continue to fallback method
    }
    
    // Fallback: If API refresh failed, just clear the token and let the user re-authenticate
    console.log('Clearing invalid token');
    chrome.storage.local.remove(['token', 'user']);
    
  } catch (err) {
    console.error('Error in refreshToken:', err);
  }
}

// Listen for tab updates to handle authentication
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process if the tab is fully loaded and has a URL
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
    
    // Handle auth success page from the main app
    if (tab.url.includes('subpirate.app/auth/callback') || 
        tab.url.includes('subpirate.app/auth-success') ||
        tab.url.includes('subpirate.app/login?auth=success')) {
      
      console.log('Detected auth success page from main app');
      
      // Try to extract auth data from the main app
      chrome.scripting.executeScript({
        target: { tabId },
        function: extractAuthDataFromPage,
      }).then(() => {
        console.log('Script injection for auth data extraction completed');
      }).catch(err => {
        console.error('Error injecting auth script:', err);
      });
    }
    
    // Handle direct Supabase auth callback with access token
    if ((tab.url.includes('supabase') || tab.url.includes('chrome-extension')) && 
        tab.url.includes('access_token=')) {
      console.log('Detected direct Supabase auth callback with token');
      // This is handled by our auth-callback.html page
    }
  }
});

// Function to extract auth data from the page
function extractAuthDataFromPage() {
  console.log('Extracting auth data from page');
  
  // Extract token and user from localStorage
  const token = localStorage.getItem('access_token') || localStorage.getItem('supabase.auth.token');
  let userString = localStorage.getItem('user') || null;
  let user = null;
  
  console.log('Found token in localStorage:', !!token);
  
  // If we have a Supabase token, try to parse it to get the user
  if (token && token.includes('"currentSession"')) {
    try {
      const supabaseData = JSON.parse(token);
      if (supabaseData.currentSession) {
        user = supabaseData.currentSession.user;
        console.log('Found user in Supabase session:', user?.email);
      }
    } catch (e) {
      console.error('Failed to parse Supabase token', e);
    }
  } else if (userString) {
    // Direct token and user format
    try {
      user = JSON.parse(userString);
      console.log('Found user data:', user.email);
    } catch (e) {
      console.error('Failed to parse user data', e);
    }
  }
  
  if (token && user) {
    console.log('Sending auth success message to background script');
    // Send message to background script with the actual token, not the Supabase object
    const actualToken = token.includes('"currentSession"') ? 
      JSON.parse(token).currentSession.access_token : token;
      
    chrome.runtime.sendMessage({
      type: 'AUTH_SUCCESS',
      token: actualToken,
      user,
      closeTab: true
    });
    
    // Add a visual confirmation on the page
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.right = '0';
    div.style.backgroundColor = '#2ecc71';
    div.style.color = 'white';
    div.style.padding = '10px';
    div.style.textAlign = 'center';
    div.style.zIndex = '9999';
    div.textContent = 'Authentication successful! This tab will close shortly.';
    document.body.appendChild(div);
    
    return { success: true };
  } else {
    console.warn('Missing token or user data for authentication');
    return { success: false };
  }
}

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('SubPirate Extension installed');
  
  // Check for existing token and set up refresh if needed
  chrome.storage.local.get(['token'], (result) => {
    if (result.token) {
      setupTokenRefresh();
    }
  });
}); 