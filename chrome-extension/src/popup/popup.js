// Constants - Direct assignment for debugging
let SUPABASE_URL = 'https://pdgnyhkngewmneujsheq.supabase.co';
let SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZ255aGtuZ2V3bW5ldWpzaGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4ODU3NjYsImV4cCI6MjA1NTQ2MTc2Nn0.C0AtQq3841gVmK4k6mDOUdZE0jpJ5fWGEHTM8DNnt-g';
let APP_URL = 'http://localhost:5173';

// DOM Elements
const loginSection = document.getElementById('login-section');
const actionsSection = document.getElementById('actions-section');
const userSection = document.getElementById('user-section');
const statusMessage = document.getElementById('status-message');
const subredditNameElement = document.getElementById('subreddit-name');
const userName = document.getElementById('user-name');
const projectSelector = document.getElementById('project-selector');
const projectList = document.getElementById('project-list');

// Buttons
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const saveSubredditButton = document.getElementById('save-subreddit');
const analyzeSubredditButton = document.getElementById('analyze-subreddit');
const addToProjectButton = document.getElementById('add-to-project');
const confirmAddToProjectButton = document.getElementById('confirm-add-to-project');

// State
let currentSubreddit = '';
let isAuthenticated = false;
let userProfile = null;
let projects = [];

// Initialize the extension
function init() {
  console.log('Initializing extension');
  
  // Set up event listeners
  setupEventListeners();
  
  // Check authentication status
  checkAuth();
  
  // Detect current subreddit
  detectSubreddit();
}

// Set up event listeners for buttons
function setupEventListeners() {
  console.log('Setting up event listeners');
  
  // Login button
  if (loginButton) {
    loginButton.addEventListener('click', handleLogin);
  }
  
  // Logout button
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }
  
  // Save subreddit button
  if (saveSubredditButton) {
    saveSubredditButton.addEventListener('click', handleSaveSubreddit);
  }
  
  // Analyze subreddit button
  if (analyzeSubredditButton) {
    analyzeSubredditButton.addEventListener('click', handleAnalyzeSubreddit);
  }
  
  // Add to project button
  if (addToProjectButton) {
    addToProjectButton.addEventListener('click', () => {
      // Show project selector
      projectSelector.classList.remove('hidden');
      // Fetch projects
      fetchProjects();
    });
  }
  
  // Confirm add to project button
  if (confirmAddToProjectButton) {
    confirmAddToProjectButton.addEventListener('click', handleAddToProject);
  }
}

// Check if user is authenticated
function checkAuth() {
  console.log('Checking authentication status');
  
  chrome.storage.local.get(['session', 'profile'], (result) => {
    if (result.session && result.profile) {
      isAuthenticated = true;
      userProfile = result.profile;
      showAuthenticatedUI();
    } else {
      isAuthenticated = false;
      userProfile = null;
      showUnauthenticatedUI();
    }
  });
}

// Detect current subreddit from active tab
function detectSubreddit() {
  console.log('Detecting current subreddit');
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    
    const url = tabs[0].url;
    const subredditMatch = url.match(/reddit\.com\/r\/([^/]+)/i);
    
    if (subredditMatch && subredditMatch[1]) {
      currentSubreddit = subredditMatch[1];
      showSubredditInfo();
    } else {
      showStatus('Not a subreddit page', 'warn');
    }
  });
}

// Show subreddit information
function showSubredditInfo() {
  if (subredditNameElement) {
    subredditNameElement.textContent = currentSubreddit;
  }
  
  showStatus(`Current subreddit: r/${currentSubreddit}`, 'info');
}

// Show authenticated UI
function showAuthenticatedUI() {
  if (loginSection) loginSection.classList.add('hidden');
  if (actionsSection) actionsSection.classList.remove('hidden');
  if (userSection) userSection.classList.remove('hidden');
  
  if (userName && userProfile) {
    userName.textContent = userProfile.email || 'User';
  }
}

// Show unauthenticated UI
function showUnauthenticatedUI() {
  if (loginSection) loginSection.classList.remove('hidden');
  if (actionsSection) actionsSection.classList.add('hidden');
  if (userSection) userSection.classList.add('hidden');
}

// Create a Supabase client for authentication
function createSupabaseClient() {
  // If we don't have the Supabase library, we need to handle this differently
  showStatus('Connecting to Supabase...', 'info');
  
  // This is a simplified version of what the Supabase client would do
  // In a real implementation, you'd include the Supabase library
  return {
    auth: {
      signInWithPassword: async (credentials) => {
        try {
          showStatus('Signing in...', 'info');
          
          // Make a direct fetch request to Supabase
          const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error_description || 'Authentication failed');
          }
          
          const data = await response.json();
          
          // Get user profile
          const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
              'Authorization': `Bearer ${data.access_token}`,
              'apikey': SUPABASE_KEY
            }
          });
          
          if (!userResponse.ok) {
            throw new Error('Failed to get user profile');
          }
          
          const userData = await userResponse.json();
          
          return {
            data: {
              session: {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: Date.now() + data.expires_in * 1000
              },
              user: userData
            },
            error: null
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return {
            data: { session: null, user: null },
            error: error.message
          };
        }
      }
    }
  };
}

// Direct login implementation in the popup
async function handleLogin() {
  // Create login form elements
  const loginForm = document.createElement('div');
  loginForm.className = 'login-form';
  loginForm.innerHTML = `
    <h3>Sign in to SubPirate</h3>
    <div class="form-group">
      <label for="email">Email</label>
      <input type="email" id="email" class="form-input" placeholder="your@email.com">
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" class="form-input" placeholder="Your password">
    </div>
    <div class="form-actions">
      <button id="submit-login" class="btn btn-primary">Sign In</button>
      <button id="cancel-login" class="btn btn-secondary">Cancel</button>
    </div>
    <div class="form-footer">
      <a href="${APP_URL}/signup" target="_blank">Need an account? Sign up</a>
    </div>
  `;
  
  // Replace login section content
  loginSection.innerHTML = '';
  loginSection.appendChild(loginForm);
  
  // Add event listeners for new buttons
  document.getElementById('submit-login').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      showStatus('Please enter email and password', 'error');
      return;
    }
    
    try {
      // Create Supabase client
      const supabase = createSupabaseClient();
      
      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        showStatus(error, 'error');
        return;
      }
      
      if (data.session) {
        // Store session in extension storage
        chrome.storage.local.set({
          session: data.session,
          profile: data.user
        }, () => {
          console.log('Auth data saved to storage');
          isAuthenticated = true;
          userProfile = data.user;
          showAuthenticatedUI();
          showStatus('Signed in successfully!', 'success');
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      showStatus('Login failed: ' + error.message, 'error');
    }
  });
  
  document.getElementById('cancel-login').addEventListener('click', () => {
    // Restore original login section
    loginSection.innerHTML = `
      <p class="text-center">Sign in to access SubPirate features</p>
      <button id="login-button" class="btn btn-primary">Sign In</button>
    `;
    
    // Restore event listener
    document.getElementById('login-button').addEventListener('click', handleLogin);
  });
}

// Handle logout button click
function handleLogout() {
  console.log('Logout clicked');
  
  // Clear session data from storage
  chrome.storage.local.remove(['session', 'profile'], () => {
    isAuthenticated = false;
    userProfile = null;
    showUnauthenticatedUI();
    showStatus('Logged out successfully', 'success');
  });
}

// Handle save subreddit button click
function handleSaveSubreddit() {
  console.log('Save subreddit clicked');
  
  if (!currentSubreddit) {
    showStatus('No subreddit detected', 'error');
    return;
  }
  
  showStatus('Saving subreddit...', 'info');
  // Actual save logic would go here
  showStatus(`Subreddit r/${currentSubreddit} saved!`, 'success');
}

// Handle analyze subreddit button click
function handleAnalyzeSubreddit() {
  console.log('Analyze subreddit clicked');
  
  if (!currentSubreddit) {
    showStatus('No subreddit detected', 'error');
    return;
  }
  
  const analyzeUrl = `${APP_URL}/analyze/${currentSubreddit}`;
  chrome.tabs.create({ url: analyzeUrl });
}

// Fetch user's projects
function fetchProjects() {
  console.log('Fetching projects');
  
  // Simulate fetching projects (replace with actual API call)
  setTimeout(() => {
    projects = [
      { id: 1, name: 'Project 1' },
      { id: 2, name: 'Project 2' },
      { id: 3, name: 'Project 3' }
    ];
    
    renderProjects();
  }, 500);
}

// Render projects in the project list
function renderProjects() {
  if (!projectList) return;
  
  projectList.innerHTML = '';
  
  projects.forEach(project => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.name;
    projectList.appendChild(option);
  });
}

// Handle add to project button click
function handleAddToProject() {
  console.log('Add to project confirmed');
  
  const selectedProject = projectList.value;
  
  if (!selectedProject) {
    showStatus('Please select a project', 'error');
    return;
  }
  
  const projectName = projectList.options[projectList.selectedIndex].text;
  
  showStatus(`Adding r/${currentSubreddit} to ${projectName}...`, 'info');
  
  // Simulate API call
  setTimeout(() => {
    showStatus(`Added r/${currentSubreddit} to ${projectName}!`, 'success');
    projectSelector.classList.add('hidden');
  }, 500);
}

// Show status message
function showStatus(message, type = 'info') {
  console.log(`Status: ${message} (${type})`);
  
  if (!statusMessage) return;
  
  statusMessage.textContent = message;
  statusMessage.className = ''; // Reset classes
  statusMessage.classList.add('status', `status-${type}`);
  statusMessage.classList.remove('hidden');
  
  // Clear previous timeout
  if (window.statusTimeout) {
    clearTimeout(window.statusTimeout);
  }
  
  // Auto-hide info and success messages after 5 seconds
  if (type === 'info' || type === 'success') {
    window.statusTimeout = setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 5000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded - Direct mode');
  
  // Listen for authentication events from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Popup received message:', message);
    
    if (message.action === 'auth-success') {
      console.log('Auth success message received');
      isAuthenticated = true;
      userProfile = message.data.profile;
      showAuthenticatedUI();
      showStatus('Authenticated successfully!', 'success');
    }
    
    if (message.action === 'auth-logout') {
      console.log('Auth logout message received');
      isAuthenticated = false;
      userProfile = null;
      showUnauthenticatedUI();
      showStatus('Logged out successfully', 'success');
    }
  });
  
  // Skip the variable loading from storage and use hard-coded values
  // for debugging purposes
  init();
});
