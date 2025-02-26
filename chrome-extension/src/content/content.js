// SubPirate Chrome Extension Content Script
// This script runs on Reddit pages and can interact with the page content

// Extract current subreddit from the URL when the page loads
const currentSubreddit = extractSubredditFromUrl(window.location.href);
console.log(`SubPirate extension loaded on: ${currentSubreddit ? 'r/' + currentSubreddit : 'non-subreddit page'}`);

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getCurrentSubreddit') {
    sendResponse({ subreddit: currentSubreddit });
    return true;
  }
  
  if (message.action === 'saveCurrentSubreddit') {
    // Just pass through to background script as content doesn't handle API calls
    chrome.runtime.sendMessage({ 
      action: 'saveSubreddit', 
      subreddit: currentSubreddit 
    }, sendResponse);
    return true;
  }
  
  if (message.action === 'analyzeCurrentSubreddit') {
    // Just pass through to background script
    chrome.runtime.sendMessage({ 
      action: 'analyzeSubreddit', 
      subreddit: currentSubreddit 
    }, sendResponse);
    return true;
  }
});

// Add a floating action button to the page (optional enhancement)
function addFloatingActionButton() {
  // Check if we're on a subreddit page
  if (!currentSubreddit) return;
  
  // Create the button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.position = 'fixed';
  buttonContainer.style.bottom = '20px';
  buttonContainer.style.right = '20px';
  buttonContainer.style.zIndex = '9999';
  buttonContainer.style.borderRadius = '50%';
  buttonContainer.style.width = '48px';
  buttonContainer.style.height = '48px';
  buttonContainer.style.backgroundColor = '#C69B7B';
  buttonContainer.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'center';
  buttonContainer.style.alignItems = 'center';
  buttonContainer.style.cursor = 'pointer';
  buttonContainer.style.transition = 'transform 0.2s';
  
  // Add hover effect
  buttonContainer.addEventListener('mouseenter', () => {
    buttonContainer.style.transform = 'scale(1.1)';
  });
  
  buttonContainer.addEventListener('mouseleave', () => {
    buttonContainer.style.transform = 'scale(1)';
  });
  
  // Add click handler to open extension popup
  buttonContainer.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });
  
  // Create the icon (simple text for now, could be replaced with an SVG)
  const icon = document.createElement('div');
  icon.textContent = '🏴‍☠️';
  icon.style.fontSize = '24px';
  icon.style.color = '#FFFFFF';
  
  // Assemble and add to page
  buttonContainer.appendChild(icon);
  document.body.appendChild(buttonContainer);
}

// Helper function to extract subreddit name from URL
function extractSubredditFromUrl(url) {
  if (!url) return null;
  
  // Match patterns like reddit.com/r/subreddit or old.reddit.com/r/subreddit
  const match = url.match(/(?:reddit\.com|old\.reddit\.com)\/r\/([^\/\?]+)/i);
  
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  
  return null;
}

// Initialize the content script
function init() {
  // Check if we should add the floating action button based on user preferences
  chrome.storage.local.get(['showFloatingButton'], (result) => {
    if (result.showFloatingButton !== false) { // Default to show if not set
      // Delay adding the button to ensure the page is fully loaded
      setTimeout(addFloatingActionButton, 1000);
    }
  });
}

// Run the initialization
init();
