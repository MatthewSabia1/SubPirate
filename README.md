# SubPirate

SubPirate is a sophisticated Reddit marketing analysis tool designed to identify subreddits conducive to marketing activities. It provides a comprehensive analysis of subreddit rules, posting patterns, and content engagement to determine if a subreddit is marketing-friendly.

## Recent Updates

### Subscription Requirement on Signup (NEW)
- **Mandatory subscription for new users**: All new users are now required to select and subscribe to a plan immediately after signup
- **Enhanced subscription verification**: Improved checks across multiple database tables for consistent subscription status verification
- **Robust error handling**: Added try-catch safety mechanisms throughout the authentication flow for resilient subscription verification
- **Environment-specific customer handling**: Improved handling of Stripe test vs. live mode customer IDs
- **Redirect flow improvements**: Fixed routing and redirect issues for users with active subscriptions

### Stripe Production Setup
- **Production-ready integration**: Complete Stripe integration with environment detection
- **Enhanced webhook handling**: Secure webhook processing with environment-specific configurations
- **Customer ID synchronization**: Proper handling of customer IDs between test and live environments
- **Error recovery mechanisms**: Graceful degradation for subscription verification failures

### NSFW Content Support
- Proper handling of NSFW content in all views
- Enhanced image loading system for Reddit content

### Image Loading System
- New RedditImage component for handling CORS-protected images
- Improved fallbacks for unavailable images
- Enhanced error handling for image loading

### Calendar Enhancements
- Improved post scheduling interface
- Better handling of Reddit data in calendar view

## Features

### Subscriptions & Payments
- **Mandatory subscription requirement**: New users must select a subscription plan to access the application
- **Seamless Stripe integration**: Secure payment processing with subscription management
- **Multiple subscription tiers**: Options for different user needs
- **Checkout session creation**: Easy payment process with secure handling
- **Customer portal access**: Self-service subscription management
- **Environment detection**: Automatic test/live mode detection based on domain
- **Error recovery**: Robust handling of customer ID mismatches between environments

### Subreddit Analysis
- **Marketing friendliness score**: Analyze whether a subreddit is conducive to marketing
- **Rule analysis**: Identify exploitable gaps in subreddit rules
- **Moderator activity patterns**: Evaluate mod presence and enforcement
- **Content engagement metrics**: Understand what performs well
- **Marketing strategy recommendations**: Tailored advice for marketing approach

### Content Display
- **Post data visualization**: Clean UI for viewing Reddit content
- **NSFW content support**: Proper handling of all content types
- **Image loading with fallbacks**: Reliable content display
- **Calendar view**: Schedule and organize posts

### Project Management
- **Organize by projects**: Group subreddits for targeted campaigns
- **Save and categorize**: Build a library of marketing-friendly subreddits
- **Reddit account integration**: Connect and manage multiple accounts
- **Post scheduling**: Plan your content calendar

## Technical Details

### Authentication System
- **Multi-provider auth**: Email/password, Google, GitHub
- **Secure session management**: Token-based authentication
- **Protected routes**: Access control based on authentication status
- **Subscription verification**: Route protection based on subscription status

### Database & Storage
- **Supabase backend**: PostgreSQL database with real-time capabilities
- **Relational data model**: Efficiently store user data, subreddits, and analysis results
- **Query optimization**: Fast data retrieval for responsive UI

### Frontend
- **React with TypeScript**: Type-safe component development
- **Tailwind CSS**: Responsive design with utility-first styling
- **ShadcnUI components**: Consistent UI design language
- **State management**: Context API for application state

### API Integration
- **Reddit API**: Fetch subreddit data and post content
- **OpenAI integration**: AI-powered subreddit analysis
- **Stripe API**: Payment processing and subscription management

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/subpirate.git

# Navigate to the project directory
cd subpirate

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start the development server
npm run dev
```

## Configuration

Create a `.env.local` file with the following:

```
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Reddit
VITE_REDDIT_CLIENT_ID=your_reddit_client_id
VITE_REDDIT_CLIENT_SECRET=your_reddit_client_secret
VITE_REDDIT_REDIRECT_URI=http://localhost:5173/auth/reddit/callback

# OpenAI API
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_OPENAI_MODEL=gpt-4-turbo

# Stripe Keys
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
VITE_STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or support, please contact us at support@subpirate.com. 