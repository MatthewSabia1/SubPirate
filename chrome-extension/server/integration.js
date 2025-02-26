// SubPirate Chrome Extension Server Integration
// Add this code to server.js or your main server file

import { 
  verifyExtensionAuth, 
  saveSubreddit, 
  analyzeSubreddit, 
  getProjects, 
  addToProject 
} from './api-routes';

/**
 * Integration with existing Express server
 * Add this code to your server.js file
 */
export function setupExtensionRoutes(app) {
  // Extension API endpoints
  app.post('/api/extension/save-subreddit', verifyExtensionAuth, saveSubreddit);
  app.post('/api/extension/analyze-subreddit', verifyExtensionAuth, analyzeSubreddit);
  app.get('/api/extension/projects', verifyExtensionAuth, getProjects);
  app.post('/api/extension/add-to-project', verifyExtensionAuth, addToProject);
  
  // Authentication endpoint for the extension
  // This route is used to pass session data from the main app to the extension
  app.get('/extension-auth', (req, res) => {
    // Render a simple page that passes the session data to the extension
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SubPirate Extension Auth</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #111111;
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          .logo {
            margin-bottom: 20px;
          }
          .card {
            background-color: #1A1A1A;
            border-radius: 8px;
            padding: 20px;
            max-width: 500px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .primary {
            color: #C69B7B;
          }
          .spinner {
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            border-top: 4px solid #C69B7B;
            width: 40px;
            height: 40px;
            margin: 20px auto;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="logo">
          <img src="/brand_assets/SubPirate_light_icon_logo.svg" alt="SubPirate" height="48">
        </div>
        <div class="card">
          <h2><span class="primary">SubPirate</span> Extension Authentication</h2>
          <p>Completing authentication with the Chrome extension...</p>
          <div class="spinner"></div>
          <p>This window will close automatically.</p>
        </div>
        
        <script>
          // Function to pass the session data to the extension
          function sendAuthDataToExtension() {
            const urlParams = new URLSearchParams(window.location.search);
            const sessionData = urlParams.get('session');
            const profileData = urlParams.get('profile');
            
            if (sessionData) {
              // Create a tab with the extension auth URL
              const url = \`extension-auth?session=\${sessionData}&profile=\${profileData || ''}\`;
              
              // The extension background script will detect this URL and extract the data
              window.location.href = url;
            } else {
              document.body.innerHTML += '<p style="color: #F44336">Error: No session data provided</p>';
            }
          }
          
          // Call the function after a short delay
          setTimeout(sendAuthDataToExtension, 1000);
        </script>
      </body>
      </html>
    `);
  });
  
  // Add an endpoint that the main app can use to generate extension auth URLs
  app.get('/api/extension-auth-url', verifyExtensionAuth, (req, res) => {
    // Get the current user's session and profile
    const session = req.session; // Assuming you have session data in the request
    const profile = req.user;
    
    // Create a URL that can be used to authenticate the extension
    const extensionAuthUrl = `/extension-auth?session=${encodeURIComponent(JSON.stringify(session))}&profile=${encodeURIComponent(JSON.stringify(profile))}`;
    
    res.status(200).json({ url: extensionAuthUrl });
  });
  
  console.log('SubPirate Chrome extension routes initialized');
}
