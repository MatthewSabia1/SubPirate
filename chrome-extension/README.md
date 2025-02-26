# SubPirate Chrome Extension

A Chrome extension that allows SubPirate users to interact with the SubPirate app directly from Reddit, making it easy to save, analyze, and manage subreddits for marketing research.

## Features

- Save subreddits to your SubPirate account while browsing Reddit
- Analyze subreddits with a single click
- Add subreddits to existing projects
- Seamless authentication with your existing SubPirate account
- Beautiful UI matching the SubPirate application style

## Installation

### Developer Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd chrome-extension
   npm install
   ```
3. Create a `.env.extension` file (use `.env.extension.example` as a template)
4. Build the extension:
   ```bash
   npm run build
   ```
5. Open Chrome and navigate to `chrome://extensions/`
6. Enable "Developer mode" by toggling the switch in the top right corner
7. Click "Load unpacked" and select the `chrome-extension/dist` directory
8. The extension should now appear in your Chrome toolbar

### Production Build

To create a production-ready build:

1. Configure your production environment variables in `.env.extension`:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   APP_URL=https://your-production-app-url.com
   ```

2. Run the production build:
   ```bash
   npm run build:prod
   ```

3. Package the extension:
   ```bash
   npm run package
   ```

4. The packaged extension will be available as `subpirate-extension.zip` in the root directory

## Server Integration

To enable the extension to communicate with your SubPirate app:

1. Import the extension routes in your server code:
   ```javascript
   import { setupExtensionRoutes } from './chrome-extension/server/integration';
   
   // Initialize your Express app
   const app = express();
   
   // Set up extension routes
   setupExtensionRoutes(app);
   ```

## Security Considerations

The extension uses the following security best practices:

1. **Environment Variables**: Sensitive data like API keys are injected at build time
2. **Authentication**: Uses the same authentication system as the main SubPirate app
3. **CORS Protection**: The extension only communicates with the authorized SubPirate API
4. **Limited Permissions**: Only requests the minimum permissions needed to function

## Troubleshooting

If you encounter issues:

1. Check that the Supabase URL and key are correct in your `.env.extension` file
2. Ensure that the APP_URL points to the correct SubPirate application URL
3. Check the browser console for any error messages
4. Try reinstalling the extension if all else fails

## Development

To modify the extension:

1. Edit files in the `src` directory
2. Run `npm run build` to rebuild the extension
3. The extension will automatically reload in Chrome if you have it loaded from the `dist` directory

## License

Proprietary - All rights reserved
