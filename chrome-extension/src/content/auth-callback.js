// SubPirate Authentication Callback Content Script
// This script runs on the main SubPirate app domain and captures authentication data

console.log('SubPirate auth callback content script loaded');

// Listen for the window message event that contains auth data
window.addEventListener('message', function(event) {
  // Only accept messages from the same origin as our app
  if (event.origin !== window.location.origin) return;
  
  // Check if the message contains authentication data
  if (event.data && event.data.type === 'subpirate-auth-callback' && event.data.session) {
    console.log('Received authentication data from SubPirate app');
    
    // Send the authentication data to the extension's background script
    chrome.runtime.sendMessage({
      action: 'authCallback',
      data: {
        session: event.data.session,
        profile: event.data.profile || null
      }
    }, response => {
      console.log('Auth data sent to extension background script:', response);
    });
  }
}, false);

// Notify the main app that the extension script is loaded and ready
window.postMessage({ type: 'subpirate-extension-loaded' }, window.location.origin);

// Listen for direct auth callbacks in the URL (alternative method)
document.addEventListener('DOMContentLoaded', function() {
  // Check if URL contains auth parameters
  if (window.location.href.includes('extension-auth-success=true')) {
    console.log('Detected auth success in URL');
    
    // Extract auth data from the DOM or a global variable
    // This depends on how your main app exposes the data
    const extractAuthData = () => {
      // Wait for the auth data to be available in the page
      if (window.subpirateAuthData) {
        return {
          session: window.subpirateAuthData.session,
          profile: window.subpirateAuthData.profile
        };
      }
      
      // Try to find auth data in a DOM element (customize this selector)
      const authDataElement = document.getElementById('auth-data') || 
                              document.querySelector('[data-auth-data]');
      
      if (authDataElement) {
        try {
          return JSON.parse(authDataElement.textContent || authDataElement.getAttribute('data-auth-data'));
        } catch (e) {
          console.error('Error parsing auth data:', e);
        }
      }
      
      return null;
    };
    
    // Poll for auth data to become available
    const checkInterval = setInterval(() => {
      const authData = extractAuthData();
      if (authData && authData.session) {
        clearInterval(checkInterval);
        
        // Send the authentication data to the extension's background script
        chrome.runtime.sendMessage({
          action: 'authCallback',
          data: authData
        }, response => {
          console.log('Auth data sent to extension background script:', response);
          
          // Show a success message to the user
          const successMessage = document.createElement('div');
          successMessage.style.position = 'fixed';
          successMessage.style.top = '20px';
          successMessage.style.right = '20px';
          successMessage.style.padding = '10px 15px';
          successMessage.style.backgroundColor = '#4CAF50';
          successMessage.style.color = 'white';
          successMessage.style.borderRadius = '4px';
          successMessage.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
          successMessage.style.zIndex = '10000';
          successMessage.textContent = 'SubPirate extension authenticated successfully!';
          
          document.body.appendChild(successMessage);
          
          // Remove the message after 5 seconds
          setTimeout(() => {
            if (successMessage.parentNode) {
              successMessage.parentNode.removeChild(successMessage);
            }
          }, 5000);
        });
      }
    }, 500);
    
    // Stop checking after 10 seconds to avoid infinite polling
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 10000);
  }
});
