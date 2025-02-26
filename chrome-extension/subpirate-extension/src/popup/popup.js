// Constants
const SUPABASE_URL = ''; // Will be populated from environment
const SUPABASE_KEY = ''; // Will be populated from environment
const APP_URL = ''; // Will be populated from environment

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

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load environment variables from extension storage
  chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'appUrl'], (result) => {
    if (result.supabaseUrl && result.supabaseKey && result.appUrl) {
      SUPABASE_URL = result.supabaseUrl;
      SUPABASE_KEY = result.supabaseKey;
      APP_URL = result.appUrl;
      
      // Initialize the extension
      init();
    } else {
      showStatus('Configuration error. Please contact support.', 'error');
    }
  });
});

async function init() {
  // Check authentication status
  await checkAuthStatus();
  
  // Get current subreddit
  getCurrentTab();
  
  // Set up event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Auth buttons
  loginButton.addEventListener('click', handleLogin);
  logoutButton.addEventListener('click', handleLogout);
  
  // Action buttons
  saveSubredditButton.addEventListener('click', handleSaveSubreddit);
  analyzeSubredditButton.addEventListener('click', handleAnalyzeSubreddit);
  addToProjectButton.addEventListener('click', handleAddToProject);
  confirmAddToProjectButton.addEventListener('click', handleConfirmAddToProject);
}

// Authentication Functions
async function checkAuthStatus() {
  try {
    // Get current session from storage
    chrome.storage.local.get(['session', 'profile'], (result) => {
      if (result.session && new Date(result.session.expires_at) > new Date()) {
        isAuthenticated = true;
        userProfile = result.profile;
        updateUIForAuthenticatedUser();
        
        // If authenticated, load projects
        fetchProjects();
      } else {
        isAuthenticated = false;
        updateUIForUnauthenticatedUser();
      }
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    isAuthenticated = false;
    updateUIForUnauthenticatedUser();
  }
}

function updateUIForAuthenticatedUser() {
  loginSection.classList.add('hidden');
  actionsSection.classList.remove('hidden');
  userSection.classList.remove('hidden');
  
  if (userProfile && userProfile.display_name) {
    userName.textContent = userProfile.display_name;
  } else if (userProfile && userProfile.email) {
    userName.textContent = userProfile.email.split('@')[0];
  } else {
    userName.textContent = 'User';
  }
}

function updateUIForUnauthenticatedUser() {
  loginSection.classList.remove('hidden');
  actionsSection.classList.add('hidden');
  userSection.classList.add('hidden');
}

async function handleLogin() {
  try {
    showStatus('Redirecting to login...', 'loading');
    
    // Open a new tab to the main app's login page
    chrome.tabs.create({ url: `${APP_URL}/login?extension=true` });
    
    // Will need to finish this flow in the background script
    // which will capture the authentication callback
  } catch (error) {
    console.error('Login error:', error);
    showStatus('Login failed. Please try again.', 'error');
  }
}

async function handleLogout() {
  try {
    showStatus('Signing out...', 'loading');
    
    // Clear local storage
    chrome.storage.local.remove(['session', 'profile'], () => {
      isAuthenticated = false;
      userProfile = null;
      updateUIForUnauthenticatedUser();
      showStatus('Signed out successfully', 'success');
    });
    
    // Send message to background to also clear any server-side session
    chrome.runtime.sendMessage({ action: 'logout' });
  } catch (error) {
    console.error('Logout error:', error);
    showStatus('Logout failed. Please try again.', 'error');
  }
}

// Subreddit Actions
async function handleSaveSubreddit() {
  if (!currentSubreddit) {
    showStatus('No subreddit detected', 'error');
    return;
  }
  
  try {
    showStatus(`Saving r/${currentSubreddit}...`, 'loading');
    
    const response = await fetch(`${APP_URL}/api/extension/save-subreddit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getSessionToken()}`
      },
      body: JSON.stringify({ subreddit: currentSubreddit })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save subreddit: ${response.status}`);
    }
    
    const result = await response.json();
    showStatus(`r/${currentSubreddit} saved successfully!`, 'success');
  } catch (error) {
    console.error('Error saving subreddit:', error);
    showStatus('Failed to save subreddit', 'error');
  }
}

async function handleAnalyzeSubreddit() {
  if (!currentSubreddit) {
    showStatus('No subreddit detected', 'error');
    return;
  }
  
  try {
    showStatus(`Starting analysis for r/${currentSubreddit}...`, 'loading');
    
    const response = await fetch(`${APP_URL}/api/extension/analyze-subreddit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getSessionToken()}`
      },
      body: JSON.stringify({ subreddit: currentSubreddit })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to start analysis: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Open the analysis page in a new tab
    chrome.tabs.create({ url: `${APP_URL}/analysis/${currentSubreddit}` });
    
    showStatus(`Analysis started for r/${currentSubreddit}`, 'success');
  } catch (error) {
    console.error('Error analyzing subreddit:', error);
    showStatus('Failed to start analysis', 'error');
  }
}

async function handleAddToProject() {
  if (!currentSubreddit) {
    showStatus('No subreddit detected', 'error');
    return;
  }
  
  if (projects.length === 0) {
    await fetchProjects();
  }
  
  if (projects.length === 0) {
    showStatus('No projects found. Create a project first.', 'error');
    return;
  }
  
  // Show project selector
  projectSelector.classList.remove('hidden');
}

async function handleConfirmAddToProject() {
  const selectedProjectId = projectList.value;
  
  if (!selectedProjectId) {
    showStatus('Please select a project', 'error');
    return;
  }
  
  try {
    showStatus(`Adding r/${currentSubreddit} to project...`, 'loading');
    
    const response = await fetch(`${APP_URL}/api/extension/add-to-project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getSessionToken()}`
      },
      body: JSON.stringify({ 
        subreddit: currentSubreddit,
        projectId: selectedProjectId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add to project: ${response.status}`);
    }
    
    const result = await response.json();
    showStatus(`Added r/${currentSubreddit} to project!`, 'success');
    
    // Hide project selector
    projectSelector.classList.add('hidden');
  } catch (error) {
    console.error('Error adding to project:', error);
    showStatus('Failed to add to project', 'error');
  }
}

// Helper Functions
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  
  // Add loading spinner if loading
  if (type === 'loading') {
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    statusMessage.prepend(spinner);
  }
  
  statusMessage.classList.remove('hidden');
  
  // Auto-hide success and info messages after 5 seconds
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 5000);
  }
}

function getSessionToken() {
  // Get JWT token from storage
  let token = '';
  chrome.storage.local.get(['session'], (result) => {
    if (result.session && result.session.access_token) {
      token = result.session.access_token;
    }
  });
  return token;
}

function getCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const url = tabs[0].url;
      currentSubreddit = extractSubredditFromUrl(url);
      
      if (currentSubreddit) {
        subredditNameElement.textContent = `r/${currentSubreddit}`;
      } else {
        subredditNameElement.textContent = 'Not a subreddit page';
      }
    }
  });
}

function extractSubredditFromUrl(url) {
  if (!url) return null;
  
  // Match patterns like reddit.com/r/subreddit or old.reddit.com/r/subreddit
  const match = url.match(/(?:reddit\.com|old\.reddit\.com)\/r\/([^\/\?]+)/i);
  
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  
  return null;
}

async function fetchProjects() {
  try {
    const response = await fetch(`${APP_URL}/api/extension/projects`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getSessionToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }
    
    const result = await response.json();
    projects = result.projects || [];
    
    // Populate project dropdown
    projectList.innerHTML = '<option value="">Select a project...</option>';
    
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      projectList.appendChild(option);
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
  }
}
