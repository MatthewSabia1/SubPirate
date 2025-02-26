// This script helps configure the Chrome extension with proper environment variables
// You'll need to run this before loading the extension in Chrome

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('config-form');
  const saveButton = document.getElementById('save-button');
  const statusMessage = document.getElementById('status-message');
  
  // Load current config if available
  chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'appUrl'], (result) => {
    if (result.supabaseUrl) {
      document.getElementById('supabase-url').value = result.supabaseUrl;
    }
    if (result.supabaseKey) {
      document.getElementById('supabase-key').value = result.supabaseKey;
    }
    if (result.appUrl) {
      document.getElementById('app-url').value = result.appUrl;
    }
  });
  
  // Handle form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const supabaseUrl = document.getElementById('supabase-url').value.trim();
    const supabaseKey = document.getElementById('supabase-key').value.trim();
    const appUrl = document.getElementById('app-url').value.trim();
    
    // Validate inputs
    if (!supabaseUrl || !supabaseKey || !appUrl) {
      showStatus('All fields are required', 'error');
      return;
    }
    
    // Save to chrome.storage.local
    chrome.storage.local.set({
      supabaseUrl,
      supabaseKey,
      appUrl
    }, () => {
      showStatus('Configuration saved successfully!', 'success');
      
      // Also update the background.js file values
      updateBackgroundScript(supabaseUrl, supabaseKey, appUrl);
    });
  });
  
  function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    statusMessage.style.display = 'block';
    
    // Hide after 5 seconds if success or info
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, 5000);
    }
  }
  
  async function updateBackgroundScript(supabaseUrl, supabaseKey, appUrl) {
    try {
      // Read the background.js file
      const response = await fetch('/src/background/background.js');
      let content = await response.text();
      
      // Replace the constants
      content = content.replace(/const SUPABASE_URL = .*?;/, `const SUPABASE_URL = '${supabaseUrl}';`);
      content = content.replace(/const SUPABASE_KEY = .*?;/, `const SUPABASE_KEY = '${supabaseKey}';`);
      content = content.replace(/const APP_URL = .*?;/, `const APP_URL = '${appUrl}';`);
      
      // Create a download link (we can't directly write to the file from the browser)
      const blob = new Blob([content], { type: 'text/javascript' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = 'background.js';
      downloadLink.textContent = 'Download updated background.js';
      downloadLink.className = 'download-link';
      
      const downloadContainer = document.getElementById('download-container');
      downloadContainer.innerHTML = '';
      downloadContainer.appendChild(downloadLink);
      
      showStatus('Please download and replace the background.js file', 'info');
    } catch (error) {
      console.error('Error updating background script:', error);
      showStatus('Error updating background.js', 'error');
    }
  }
});
