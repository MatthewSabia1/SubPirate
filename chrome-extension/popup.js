// DOM elements
const loginView = document.getElementById('login-view');
const loadingView = document.getElementById('loading-view');
const noSubredditView = document.getElementById('no-subreddit-view');
const mainView = document.getElementById('main-view');
const userSection = document.getElementById('user-section');
const subredditName = document.getElementById('subreddit-name');
const userEmail = document.getElementById('user-email');
const userAvatar = document.getElementById('user-avatar');
const statusMessage = document.getElementById('status-message');
const googleLoginBtn = document.getElementById('google-login-btn');
const loginBtn = document.getElementById('login-btn');
const saveBtn = document.getElementById('save-btn');
const saveBtnText = document.getElementById('save-btn-text');
const analyzeBtn = document.getElementById('analyze-btn');
const logoutBtn = document.getElementById('logout-btn');
const openDashboardBtn = document.getElementById('open-dashboard-btn');
const projectSelect = document.getElementById('project-select');
const addToProjectBtn = document.getElementById('add-to-project-btn');

// API base URL
const API_BASE_URL = 'https://api.subpirate.app';
const WEBAPP_URL = 'https://subpirate.app';

// Supabase client initialization
const SUPABASE_URL = 'https://dkhkjdedoztwzkqloiaz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRraGtqZGVkb3p0d3prcWxvaWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTM0MDk5NzUsImV4cCI6MjAwODk4NTk3NX0.H0-bFwUPUwDvKdKb6RmDGH7cGHb0lxWYQu9Iji4kPw0';

// Create Supabase client if supabase.js is loaded
let supabase;
try {
  supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase client initialized');
} catch (e) {
  console.error('Failed to initialize Supabase client:', e);
}

// Google Auth client details
const GOOGLE_CLIENT_ID = '801564898245-o9gmmqc8ku83342mm9nq7u1dkhs0n5v8.apps.googleusercontent.com';

// Show the appropriate view
function showView(view) {
  // Hide all views
  loginView.classList.add('hidden');
  loadingView.classList.add('hidden');
  noSubredditView.classList.add('hidden');
  mainView.classList.add('hidden');
  
  // Show the requested view
  view.classList.remove('hidden');
}

// Show loading state
function showLoading() {
  showView(loadingView);
}

// Show status message
function showStatus(message, type = '') {
  statusMessage.textContent = message;
  statusMessage.className = 'status';
  if (type) {
    statusMessage.classList.add(type);
  }
  
  // Clear status after 4 seconds
  setTimeout(() => {
    statusMessage.textContent = '';
    statusMessage.className = 'status';
  }, 4000);
}

// Check if user is authenticated
async function checkAuth() {
  showLoading();
  
  try {
    // First check in chrome.storage
    const { token, user } = await new Promise(resolve => {
      chrome.storage.local.get(['token', 'user'], (result) => {
        resolve(result);
      });
    });

    console.log('Auth check - token exists:', !!token, 'user exists:', !!user);

    // Check if we have both token and user data
    if (token && user && user.email) {
      // User is authenticated from storage, verify the token if Supabase is available
      try {
        if (supabase) {
          const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
          
          if (error || !supabaseUser) {
            console.error('Token invalid or expired:', error);
            // Token is invalid, try to refresh
            const refreshed = await handleAuthError();
            if (!refreshed) {
              // If refresh failed, show login view
              showView(loginView);
              return;
            }
          }
        }
        
        // Token is valid or we couldn't verify it, update UI
        userEmail.textContent = user.email || 'User';
        if (user.user_metadata && user.user_metadata.avatar_url) {
          userAvatar.src = user.user_metadata.avatar_url;
        } else if (user.avatar_url) {
          userAvatar.src = user.avatar_url;
        } else {
          userAvatar.src = 'images/default-avatar.svg';
        }
        userSection.classList.remove('hidden');
        
        // Get current tab to check if it's a subreddit
        getCurrentSubreddit();
      } catch (err) {
        console.error('Error verifying token:', err);
        showView(loginView);
      }
    } else {
      // No auth data in storage, check for active Supabase session if available
      try {
        if (supabase) {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error checking Supabase session:', error);
            showView(loginView);
            return;
          }
          
          if (session && session.user) {
            // We have a valid session, save it to storage
            const userData = session.user;
            await saveAuthToStorage(session.access_token, userData);
            
            userEmail.textContent = userData.email || 'User';
            if (userData.user_metadata && userData.user_metadata.avatar_url) {
              userAvatar.src = userData.user_metadata.avatar_url;
            } else {
              userAvatar.src = 'images/default-avatar.svg';
            }
            userSection.classList.remove('hidden');
            
            // Get current tab
            getCurrentSubreddit();
            return;
          }
        }
        // No active session or Supabase not available
        showView(loginView);
      } catch (err) {
        console.error('Error checking authentication:', err);
        showView(loginView);
      }
    }
  } catch (err) {
    console.error('Error checking authentication:', err);
    showView(loginView);
  }
}

// Handle authentication errors (e.g., expired token)
async function handleAuthError() {
  try {
    if (!supabase) {
      // Can't refresh without Supabase, force re-login
      await logout();
      return false;
    }
    
    // Try to refresh the session
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error || !session) {
      // Couldn't refresh, log out
      await logout();
      return false;
    }
    
    // Save the refreshed session
    await saveAuthToStorage(session.access_token, session.user);
    
    // Update UI with refreshed user data
    userEmail.textContent = session.user.email || 'User';
    if (session.user.user_metadata && session.user.user_metadata.avatar_url) {
      userAvatar.src = session.user.user_metadata.avatar_url;
    } else {
      userAvatar.src = 'images/default-avatar.svg';
    }
    userSection.classList.remove('hidden');
    
    // Get current tab
    getCurrentSubreddit();
    
    return true;
  } catch (err) {
    console.error('Error refreshing session:', err);
    await logout();
    return false;
  }
}

// Save auth data to Chrome storage
async function saveAuthToStorage(token, user) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ token, user }, resolve);
  });
}

// Google Sign In handler
async function handleGoogleSignIn() {
  try {
    showLoading();
    
    // Generate the redirect URL using current extension ID
    const extensionId = chrome.runtime.id;
    const redirectUri = `chrome-extension://${extensionId}/auth-callback.html`;
    
    console.log('Using redirect URI:', redirectUri);
    
    // Direct Supabase OAuth login - this is the most reliable method
    const supabaseAuthUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUri)}`;
    
    console.log('Opening Supabase auth URL:', supabaseAuthUrl);
    chrome.tabs.create({ url: supabaseAuthUrl });
    
  } catch (err) {
    console.error('Error initiating Google sign in:', err);
    showView(loginView);
    showStatus('Error signing in with Google. Please try again.', 'error');
  }
}

// Handle the regular sign in flow
function handleRegularSignIn() {
  // Generate the redirect URL using current extension ID
  const extensionId = chrome.runtime.id;
  const redirectUri = `chrome-extension://${extensionId}/auth-callback.html`;
  
  // Open the Supabase hosted auth UI 
  const supabaseAuthUrl = `${SUPABASE_URL}/auth/v1/authorize?redirect_to=${encodeURIComponent(redirectUri)}`;
  console.log('Opening Supabase auth URL:', supabaseAuthUrl);
  chrome.tabs.create({ url: supabaseAuthUrl });
}

// Logout function
async function logout() {
  try {
    // Clear storage first to prevent UI flicker
    await new Promise(resolve => {
      chrome.storage.local.remove(['token', 'user'], resolve);
    });
    
    // Sign out from Supabase if available
    if (supabase) {
      await supabase.auth.signOut();
    }
    
    // Update UI
    showView(loginView);
    userSection.classList.add('hidden');
    
  } catch (err) {
    console.error('Error during logout:', err);
    // Force UI reset even if error
    showView(loginView);
    userSection.classList.add('hidden');
  }
}

// Get current subreddit from active tab
async function getCurrentSubreddit() {
  try {
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    
    const currentTab = tabs[0];
    if (!currentTab || !currentTab.url) {
      showView(noSubredditView);
      return;
    }
    
    const url = new URL(currentTab.url);
    if (url.hostname.includes('reddit.com')) {
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0 && pathParts[0] === 'r') {
        const currentSubreddit = pathParts[1];
        subredditName.textContent = `r/${currentSubreddit}`;
        
        // Check if this subreddit is already saved
        await checkIfSubredditSaved(currentSubreddit);
        
        showView(mainView);
        loadProjects();
      } else {
        showView(noSubredditView);
      }
    } else {
      showView(noSubredditView);
    }
  } catch (err) {
    console.error('Error getting current tab:', err);
    showView(noSubredditView);
  }
}

// Check if the current subreddit is already saved
async function checkIfSubredditSaved(subredditName) {
  try {
    // Get token from storage
    const { token } = await new Promise(resolve => {
      chrome.storage.local.get(['token'], result => resolve(result));
    });
    
    if (!token) return;
    
    const response = await fetch(`${API_BASE_URL}/api/saved/check?name=${subredditName}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.isSaved) {
      saveBtnText.textContent = 'Remove from Saved List';
      saveBtn.classList.add('saved');
    } else {
      saveBtnText.textContent = 'Save to Saved List';
      saveBtn.classList.remove('saved');
    }
  } catch (err) {
    console.error('Error checking if subreddit is saved:', err);
    // Default to "Save" if there's an error
    saveBtnText.textContent = 'Save to Saved List';
    saveBtn.classList.remove('saved');
  }
}

// Load user's projects
async function loadProjects() {
  try {
    const { token } = await new Promise(resolve => {
      chrome.storage.local.get(['token'], result => resolve(result));
    });
    
    if (!token) return;
    
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Clear existing options except the first one
    while (projectSelect.options.length > 1) {
      projectSelect.remove(1);
    }
    
    // Add projects as options
    data.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      projectSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Error loading projects:', err);
    showStatus('Error loading projects. Please try again.', 'error');
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Show login view by default until auth is confirmed
  showView(loginView);
  // Then check authentication
  checkAuth();
  
  // Add console output for debugging
  console.log('Popup initialized');
});

// Handle Google login button click
googleLoginBtn.addEventListener('click', () => {
  console.log('Google login button clicked');
  handleGoogleSignIn();
});

// Handle regular login button click
loginBtn.addEventListener('click', () => {
  console.log('Regular login button clicked');
  handleRegularSignIn();
});

// Handle open dashboard button click
openDashboardBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEBAPP_URL}/dashboard` });
});

// Handle save button click
saveBtn.addEventListener('click', async () => {
  try {
    showLoading();
    
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    
    const currentTab = tabs[0];
    const url = new URL(currentTab.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const subreddit = pathParts[1];
    
    const { token } = await new Promise(resolve => {
      chrome.storage.local.get(['token'], result => resolve(result));
    });
    
    if (!token) {
      showView(loginView);
      return;
    }
    
    // Check if we're saving or removing
    const isSaving = saveBtnText.textContent === 'Save to Saved List';
    const endpoint = isSaving 
      ? `${API_BASE_URL}/api/saved/subreddits` 
      : `${API_BASE_URL}/api/saved/subreddits/remove`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: subreddit })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    showView(mainView);
    
    if (isSaving) {
      saveBtnText.textContent = 'Remove from Saved List';
      saveBtn.classList.add('saved');
      showStatus('Subreddit saved successfully!', 'success');
    } else {
      saveBtnText.textContent = 'Save to Saved List';
      saveBtn.classList.remove('saved');
      showStatus('Subreddit removed from saved list', 'success');
    }
  } catch (err) {
    console.error('Error toggling save:', err);
    showView(mainView);
    showStatus('Error saving subreddit', 'error');
  }
});

// Handle analyze button click
analyzeBtn.addEventListener('click', async () => {
  try {
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    
    const currentTab = tabs[0];
    const url = new URL(currentTab.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const subreddit = pathParts[1];
    
    chrome.tabs.create({ url: `${WEBAPP_URL}/analyze?subreddit=${subreddit}` });
  } catch (err) {
    console.error('Error opening analyze page:', err);
    showStatus('Error opening analyze page', 'error');
  }
});

// Handle add to project button click
addToProjectBtn.addEventListener('click', async () => {
  if (projectSelect.value === '') {
    showStatus('Please select a project', 'error');
    return;
  }
  
  try {
    showLoading();
    
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    
    const currentTab = tabs[0];
    const url = new URL(currentTab.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const subreddit = pathParts[1];
    
    const { token } = await new Promise(resolve => {
      chrome.storage.local.get(['token'], result => resolve(result));
    });
    
    if (!token) {
      showView(loginView);
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectSelect.value}/subreddits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: subreddit })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    showView(mainView);
    showStatus('Subreddit added to project', 'success');
  } catch (err) {
    console.error('Error adding subreddit to project:', err);
    showView(mainView);
    showStatus('Error adding subreddit to project', 'error');
  }
});

// Handle logout button click
logoutBtn.addEventListener('click', () => {
  logout();
});