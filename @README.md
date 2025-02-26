# SubPirate

A comprehensive Reddit marketing analysis tool that helps users discover, analyze, and manage marketing opportunities across different subreddits.

## Recent Updates

### Stripe Production Setup
- Production-ready Stripe integration with environment detection
- Automatic switching between test and production modes based on domain and build environment
- Comprehensive verification tools for production readiness
- Enhanced webhook handling with environment-specific secrets
- Detailed production setup guide in docs/stripe-production-setup.md

### NSFW Content Support
- Full support for all Reddit content types
- Enhanced image handling system
- No content filtering
- Improved fallback system for thumbnails and previews

### Image Loading System
- Progressive image loading with multiple fallbacks
- Support for Reddit's special thumbnail values
- Enhanced error handling and recovery
- Automatic placeholder generation

### Calendar Improvements
- Better post display in calendar view
- Enhanced modal image handling
- Improved post details fetching
- Comprehensive error logging

## Features

### Subscriptions & Payments
- Seamless Stripe integration for handling subscriptions
- Multiple subscription tiers with feature access control
- Automatic subscription status verification
- Webhook-based event processing
- Development and production environment separation

### Content Display
- Display all Reddit content types without filtering
- Robust image loading with multiple fallbacks
- Support for NSFW content and thumbnails
- Comprehensive error handling

### Calendar View
- View and manage Reddit posts
- Multiple view options (month, week, day)
- Post filtering and sorting
- Detailed post information

### Project Management
- Organize marketing campaigns
- Team collaboration
- Performance tracking
- Content planning

## Technical Details

### Environment Detection
```typescript
// Automatic environment detection for Stripe
const isDevelopmentHost = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.includes('.vercel.app'));

const isProduction = 
  process.env.NODE_ENV === 'production' && 
  !isDevelopmentHost;

// Use appropriate API keys based on environment
const stripeKey = isProduction 
  ? process.env.VITE_STRIPE_SECRET_KEY 
  : process.env.VITE_STRIPE_TEST_SECRET_KEY;
```

### Image Handling
```typescript
// Image loading priority
1. High-quality preview image
2. Thumbnail
3. Media embed thumbnail
4. Generated placeholder
```

### Error Recovery
```typescript
// Progressive fallback system
1. Try primary image source
2. Attempt fallback sources
3. Use generated placeholder
4. Log errors for debugging
```

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/subpirate.git
```

2. Install dependencies
```bash
cd subpirate
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server
```bash
npm run dev
```

## Configuration

### Environment Variables
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Reddit API Configuration
VITE_REDDIT_APP_ID=your_reddit_app_id
VITE_REDDIT_APP_SECRET=your_reddit_app_secret

# Stripe Configuration - Development/Test
VITE_STRIPE_TEST_SECRET_KEY=sk_test_...
VITE_STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_TEST_WEBHOOK_SECRET=whsec_...

# Stripe Configuration - Production
VITE_STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_BASE_URL=https://subpirate.com
```

### Reddit API Setup
1. Create a Reddit application at https://www.reddit.com/prefs/apps
2. Set up OAuth2 credentials
3. Configure redirect URI

### Stripe Setup
1. Create a Stripe account at https://stripe.com
2. Set up products and prices in the Stripe Dashboard
3. Configure webhooks for subscription event handling
4. Run the verification script before production deployment:
```bash
npm run stripe:verify
```

## Development

### Stripe Development Tools
```bash
npm run stripe:sync      # Sync Stripe products with local database
npm run stripe:verify    # Verify Stripe production setup
npm run stripe:webhook   # Set up webhook endpoint
npm run dev:webhook      # Run dev server with webhook forwarding
```

### Running Tests
```bash
npm run test        # Run unit tests
npm run test:e2e    # Run end-to-end tests
```

### Building for Production
```bash
npm run build
```

### Deploying to Production
1. Configure environment variables in Vercel
2. Verify Stripe production setup
3. Build and deploy the application
4. Test the production environment with a small purchase

### Linting
```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers directly.

## Acknowledgments

- Reddit API for providing the data
- Supabase for backend services
- OpenRouter AI for analysis capabilities
- Stripe for payment processing 