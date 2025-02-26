# SubPirate Chrome Extension Integration Guide

This document provides instructions for integrating the SubPirate web application with the Chrome extension.

## Authentication Flow

The Chrome extension needs to receive authentication data from the main SubPirate application. Follow these steps to implement the integration:

### 1. Handle Extension Login Requests

When the extension sends a user to your app for authentication, it will include query parameters:

```
https://yourapp.com/login?extension=true&callback=[CALLBACK_URL]&state=[STATE]
```

- `extension=true`: Indicates the request came from the extension
- `callback`: URL to redirect to after successful authentication
- `state`: Random string for security verification

### 2. After Successful Authentication

After a user successfully authenticates, you need to:

1. Redirect to the callback URL with the session and profile data:

```javascript
// In your login success handler:
if (isExtensionAuth) {
  const callback = getQueryParam('callback');
  const state = getQueryParam('state');
  
  if (callback) {
    // Encode the session data for the URL
    const sessionData = encodeURIComponent(JSON.stringify(session));
    const profileData = encodeURIComponent(JSON.stringify(user));
    
    // Redirect to the extension's callback URL
    window.location.href = `${callback}?session=${sessionData}&profile=${profileData}&state=${state}`;
  }
}
```

### 3. Alternative Method: Window Messaging

If redirect doesn't work well for your authentication flow, you can use window messaging:

```javascript
// After authentication success:
if (isExtensionAuth) {
  // Send message to extension
  window.postMessage({
    type: 'subpirate-auth-callback',
    session: session,
    profile: profile
  }, '*');
  
  // Show success message to user
  showSuccessMessage('Successfully authenticated with the SubPirate extension!');
}
```

## Integration Testing

To test the integration:

1. Load the extension in Chrome developer mode
2. Click the "Sign In" button in the extension popup
3. Complete authentication on the SubPirate web app
4. Verify that the extension receives the authentication data and updates its UI

## Security Considerations

1. Always verify the `state` parameter to prevent CSRF attacks
2. Use HTTPS for all communication
3. Only include necessary user information in the profile data
4. Never send sensitive keys or tokens that shouldn't be accessible to the client

## Example Supabase Integration Code

If you're using Supabase for authentication, here's an example:

```jsx
// In your login success handler (React example)
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const isExtension = params.get('extension') === 'true';
  const callback = params.get('callback');
  const state = params.get('state');
  
  // If this is an extension auth and we have a session
  if (isExtension && callback && state && supabaseSession) {
    // Prepare session and profile data
    const sessionData = encodeURIComponent(JSON.stringify(supabaseSession));
    const profileData = encodeURIComponent(JSON.stringify(supabaseUser));
    
    // Redirect to extension callback
    window.location.href = `${callback}?session=${sessionData}&profile=${profileData}&state=${state}`;
  }
}, [supabaseSession, supabaseUser]);
```
