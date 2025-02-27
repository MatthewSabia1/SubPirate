// Content script running on Reddit pages

// Extract current subreddit information
function extractSubredditInfo() {
  const url = window.location.href;
  const urlObj = new URL(url);
  
  if (urlObj.hostname.includes('reddit.com')) {
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length > 0 && pathParts[0] === 'r') {
      const subredditName = pathParts[1];
      
      // Get additional information if available
      let subscribers = '';
      let description = '';
      
      // Try to find the subscriber count - rewritten to avoid :contains selector
      try {
        // Look for subscriber count in the sidebar
        const sidebarDivs = document.querySelectorAll('[data-testid="subreddit-sidebar"] div');
        for (const div of sidebarDivs) {
          if (div.textContent && div.textContent.includes('members')) {
            subscribers = div.textContent;
            break;
          }
        }
        
        // Alternative approach: look for specific elements that might contain subscriber info
        if (!subscribers) {
          const statElements = document.querySelectorAll('div[class*="members"], div[class*="subscriber"]');
          for (const el of statElements) {
            if (el.textContent && el.textContent.includes('members')) {
              subscribers = el.textContent;
              break;
            }
          }
        }
      } catch (err) {
        console.warn('Error finding subscriber count:', err);
      }
      
      // Try to find the description - look for either specific data-testid or potential description elements
      try {
        const descriptionElement = document.querySelector('[data-testid="subreddit-sidebar"] [data-testid="community-description"]');
        if (descriptionElement) {
          description = descriptionElement.textContent;
        } else {
          // Try alternative selectors that might contain the description
          const potentialDescElements = document.querySelectorAll('div[class*="description"], div[class*="community-details"]');
          for (const el of potentialDescElements) {
            if (el.textContent && el.textContent.length > 30) {
              description = el.textContent;
              break;
            }
          }
        }
      } catch (err) {
        console.warn('Error finding description:', err);
      }
      
      return {
        name: subredditName,
        url: `https://www.reddit.com/r/${subredditName}`,
        subscribers,
        description
      };
    }
  }
  
  return null;
}

// Send information to background script
function sendSubredditInfo() {
  const info = extractSubredditInfo();
  if (info) {
    chrome.runtime.sendMessage({
      type: 'SUBREDDIT_INFO',
      subreddit: info
    });
  }
}

// Add UI buttons to the subreddit page
function addSubredditButtons() {
  const info = extractSubredditInfo();
  if (!info) return;
  
  // Check if we've already added buttons
  if (document.querySelector('.subpirate-btn')) return;
  
  // Find a good place to insert our buttons
  const headerActions = document.querySelector('[data-testid="subreddit-header"] [data-testid="post-subtitle"]');
  
  if (headerActions) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'subpirate-buttons';
    buttonContainer.style.cssText = `
      display: inline-flex;
      gap: 8px;
      margin-left: 16px;
      vertical-align: middle;
    `;
    
    // Create "Save to SubPirate" button
    const saveButton = document.createElement('button');
    saveButton.className = 'subpirate-btn';
    saveButton.textContent = '🏴‍☠️ Save to SubPirate';
    saveButton.style.cssText = `
      background-color: #0f0f0f;
      color: white;
      border: 1px solid #222222;
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      transition: all 0.2s ease;
    `;
    
    saveButton.addEventListener('mouseenter', () => {
      saveButton.style.borderColor = '#333333';
      saveButton.style.transform = 'translateY(-2px)';
    });
    
    saveButton.addEventListener('mouseleave', () => {
      saveButton.style.borderColor = '#222222';
      saveButton.style.transform = 'translateY(0)';
    });
    
    saveButton.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'SAVE_SUBREDDIT',
        subreddit: info.name
      });
      
      // Provide visual feedback
      saveButton.textContent = '✓ Saved!';
      saveButton.style.backgroundColor = '#C69B7B';
      saveButton.style.color = '#000000';
      setTimeout(() => {
        saveButton.textContent = '🏴‍☠️ Save to SubPirate';
        saveButton.style.backgroundColor = '#0f0f0f';
        saveButton.style.color = 'white';
      }, 2000);
    });
    
    buttonContainer.appendChild(saveButton);
    
    // Create "Analyze in SubPirate" button
    const analyzeButton = document.createElement('button');
    analyzeButton.className = 'subpirate-btn';
    analyzeButton.textContent = '🔍 Analyze';
    analyzeButton.style.cssText = `
      background-color: #C69B7B;
      color: #000000;
      border: none;
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      box-shadow: 0 4px 14px rgba(198, 155, 123, 0.25);
      transition: all 0.2s ease;
    `;
    
    analyzeButton.addEventListener('mouseenter', () => {
      analyzeButton.style.backgroundColor = '#B38A6A';
      analyzeButton.style.transform = 'translateY(-2px)';
    });
    
    analyzeButton.addEventListener('mouseleave', () => {
      analyzeButton.style.backgroundColor = '#C69B7B';
      analyzeButton.style.transform = 'translateY(0)';
    });
    
    analyzeButton.addEventListener('click', () => {
      window.open(`https://subpirate.app/analyze?subreddit=${info.name}`, '_blank');
    });
    
    buttonContainer.appendChild(analyzeButton);
    
    // Insert after the first child
    if (headerActions.firstChild) {
      headerActions.insertBefore(buttonContainer, headerActions.firstChild.nextSibling);
    } else {
      headerActions.appendChild(buttonContainer);
    }
  }
}

// Initialize and run on page load
function initialize() {
  sendSubredditInfo();
  
  // Add buttons with a delay to ensure the DOM is fully loaded
  setTimeout(addSubredditButtons, 1000);
}

// Run the script
initialize();

// Also run when navigating between Reddit pages via pushState
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    initialize();
  }
}).observe(document, {subtree: true, childList: true});

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SUBREDDIT_INFO') {
    const info = extractSubredditInfo();
    sendResponse({ subreddit: info });
  }
  return true;
}); 