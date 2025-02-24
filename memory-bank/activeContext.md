# Active Context

## Current Focus
- Data structure consistency fixes across subreddit analysis components
- Standardizing property naming between AI service and frontend components
- Improving error handling and validation
- Improving error handling and validation in Reddit API integration
- Standardizing error handling patterns across the application
- Maintaining consistent error reporting
- Enhancing subreddit analysis visualization with interactive heatmap
- Improving analysis data persistence and retrieval
- Optimizing re-analysis functionality in saved subreddits
- Implementing smooth hover effects and transitions
- Maintaining consistent data structure between frontend and database
- Refining the subreddit analysis system's prompts to be more sophisticated in its blackhat marketing approach
- Improving the marketing friendliness score calculation by making it more nuanced
- Fixing issues with the subreddit analysis system
- Removing engagement metrics from marketing friendliness scoring
- Improving title template generation
- Making AI output more consistent and focused

## Recent Changes
- Renamed `postingGuidelines` to `postingLimits` across the application for consistency
- Updated OpenRouter API schema to match frontend data structure
- Enhanced validation checks in AnalysisCard component
- Improved error handling in save operations
- Added proper typing for analysis data structure
- Enhanced `getUserPosts` function:
  - Removed error masking for better debugging
  - Added specific error types and messages
  - Improved error context and status codes
  - Better handling of API-specific errors
- Error Handling Structure:
  - Hierarchical error handling approach
  - Clear separation of concerns
  - Specific error messages with context
  - Proper error propagation
- Error Types:
  - Enhanced RedditAPIError usage
  - Added HTTP status codes
  - Improved error messages
  - Better error context
- Updated the SYSTEM_PROMPT and ANALYSIS_PROMPT in `src/features/subreddit-analysis/lib/prompts.ts`
- Changed approach from blindly disregarding rules to analyzing them for exploitation
- Added sophisticated analysis areas:
  1. Rule Analysis for finding exploitable gaps
  2. Detection Pattern analysis
  3. Circumvention Tactics
  4. Risk Assessment
  5. Stealth Techniques
- Focus on plausible deniability and avoiding mod scrutiny
- Improved prompt structure for better strategic analysis

### Data Structure Updates
```typescript
interface AnalysisData {
  postingLimits: {
    frequency: number;
    bestTimeToPost: string[];
    contentRestrictions: string[];
  };
  contentStrategy: {
    recommendedTypes: string[];
    topics: string[];
    dos: string[];
    donts: string[];
  };
  // ... other properties
}
```

### Components Updated
1. `AnalysisCard.tsx`
   - Updated interface definitions
   - Enhanced validation checks
   - Fixed property access paths
   - Improved save operation mapping

2. `SubredditAnalysis.tsx`
   - Updated data mapping for Supabase
   - Fixed property access in UI rendering
   - Added proper error handling

3. `openrouter.ts`
   - Updated JSON schema to match new structure
   - Improved error handling with retries
   - Enhanced response validation

## Active Decisions
- Using `postingLimits` as the standard property name for posting-related data
- Maintaining consistent property paths across components
- Implementing comprehensive validation checks
- Following TypeScript best practices for type safety
- Using specific error types for better error handling
- Including context in error messages
- Proper error propagation
- Maintaining error handling consistency
- Decided to make the AI analyze rules thoroughly instead of disregarding them
- Focused on sophisticated circumvention rather than brute force rule breaking
- Emphasized stealth and plausible deniability in marketing strategies
- Maintained aggressive marketing goals while adding more nuanced approach

## Next Steps
1. Monitor error rates after deployment
2. Consider adding data migration for existing saved analyses
3. Update documentation to reflect new data structure
4. Consider adding schema validation at API boundaries
5. Apply consistent error handling pattern to other API methods
6. Monitor error reporting effectiveness
7. Consider adding error tracking analytics
8. Update documentation with new error handling patterns

## Current Considerations
- Backward compatibility with existing saved analyses
- Error handling for edge cases
- Performance impact of additional validation
- User experience during data loading and validation
- Need to monitor if the new prompts result in more practical and implementable strategies
- Should watch for balance between aggressiveness and detection avoidance
- May need to fine-tune risk assessment calculations based on user feedback
- Consider adding more specific guidance on automod pattern analysis

## Dependencies
- Supabase database schema
- OpenRouter API integration
- Frontend component structure
- TypeScript type system

## Recent Insights
- Consistent property naming improves maintainability
- Strong typing prevents runtime errors
- Proper validation improves user experience
- Centralized error handling reduces code duplication

## Current Focus
Working on enhancing the subreddit analysis system, specifically:
1. Improving type safety and error handling
2. Enhancing database compatibility
3. Strengthening analysis robustness
4. Improving user interface and interactions

### Recent Improvements

#### SpyGlass UI Enhancement (Latest)
1. Card Interaction Improvements:
   - Made entire subreddit cards clickable for better UX
   - Removed dedicated expand button in favor of full-card click
   - Added proper cursor feedback with `cursor-pointer`
   - Preserved action button functionality with event stopPropagation

2. Event Handling:
   - Added `stopPropagation` to external links and action buttons
   - Ensured action buttons remain independently clickable
   - Replaced expand button with status indicator
   - Improved click target areas for better accessibility

3. Visual Feedback:
   - Added hover states to entire cards
   - Maintained chevron indicators for expansion state
   - Preserved consistent spacing and alignment
   - Enhanced visual hierarchy

4. Code Organization:
   - Improved event handler isolation
   - Enhanced type safety in click handlers
   - Better separation of concerns between card and action areas
   - Maintained consistent styling patterns

### Previous Improvements
- Enhanced type safety in OpenRouter integration
- Improved database schema compatibility
- Strengthened analysis output validation
- Increased post analysis sample size to 50 posts

### Code Quality Enhancements
- Replaced any types with unknown for safer type handling
- Added proper type validation for API responses
- Improved error handling for API timeouts and failures
- Enhanced data transformation reliability

### UI Improvements
- Enhanced subreddit data display in project views to show online users count alongside total subscribers
- Implemented consistent display format between saved list and project views for community stats
- Added debug logging to track subreddit data refresh and updates

### Data Management
- Improved subreddit data refresh functionality to properly update both database and UI state
- Added comprehensive error handling for subreddit data updates
- Enhanced data transformation for project subreddits to properly handle all fields

## Recent Changes

### Analysis System Improvements
1. Type Safety:
   - Introduced unknown type for initial API responses
   - Added proper type validation for parsed results
   - Enhanced error handling with specific types
   - Improved database schema compatibility

2. Analysis Robustness:
   - Increased analysis sample to 50 top posts
   - Enhanced content type detection
   - Improved posting pattern analysis
   - Added fallbacks for missing data

3. Data Validation:
   - Added comprehensive output validation
   - Enhanced error recovery
   - Improved default values
   - Strengthened type checking

### Analytics Dashboard Implementation
1. Added Analytics component:
   - Comprehensive data visualization
   - Real-time data fetching
   - Interactive date range selection
   - Export functionality

2. Chart Integration:
   - Added Chart.js with custom styling
   - Implemented multiple chart types
   - Added responsive layouts
   - Enhanced data presentation

3. Data Management:
   - Added Supabase queries for analytics
   - Implemented data aggregation
   - Added real-time updates
   - Enhanced error handling

### API Usage Tracking Enhancements
- Implemented MD5 hashing for endpoint tracking to ensure consistent storage and lookup
- Added automatic endpoint hashing via database trigger
- Created atomic increment function for thread-safe request counting
- Fixed unique constraint issues in the reddit_api_usage table
- Enhanced error handling for API rate limiting and usage tracking

### Database Optimizations
- Added endpoint_hash column for efficient lookups and consistent storage
- Implemented proper constraints and indexes for API usage tracking
- Created database-level functions for atomic operations
- Improved data integrity with proper unique constraints

### Recent Changes
1. Updated ProjectSubreddits component to display online users count in the same format as SavedList
2. Enhanced refreshSubredditData function to:
   - Update both subscriber_count and active_users in database
   - Update local state with latest data
   - Add debug logging for tracking data updates
3. Maintained consistent styling between project and saved list views

### Projects Page Layout Update (Latest)
- Standardized the Projects page layout to match the SavedList component styling
- Key changes to `src/pages/Projects.tsx`:
  1. Container styling:
     - Added `max-w-[1200px]` for consistent width constraint
     - Added `mx-auto` for horizontal centering
     - Implemented responsive padding with `px-4 md:px-8`
  2. Loading state optimization:
     - Simplified loading state container structure
     - Removed unnecessary padding wrapper
  3. Responsive design improvements:
     - Maintained consistent spacing across different screen sizes
     - Preserved existing responsive behavior for project cards

## Active Decisions

### 1. Type Safety
- Use unknown for initial API responses
- Validate all parsed data
- Provide specific error types
- Maintain strict type checking

### 2. Analysis Quality
- Analyze top 50 posts for better insights
- Validate all analysis components
- Provide meaningful defaults
- Ensure database compatibility

### 3. Error Handling
- Implement specific error messages
- Add retry logic for API failures
- Provide graceful degradation
- Maintain data consistency

## Next Steps

### Immediate Tasks
1. Test analysis improvements
2. Monitor error handling
3. Validate database integration
4. Check type safety coverage

### Short-term Goals
1. Enhance analysis accuracy
2. Improve performance
3. Add more validation
4. Expand test coverage

### Next Steps
1. Monitor the effectiveness of the subreddit data refresh mechanism
2. Consider adding a manual refresh button for subreddit stats
3. Look for other areas where data display consistency can be improved

### Current Considerations
- Need to ensure data freshness without overwhelming the Reddit API
- Balance between real-time updates and performance
- Maintaining consistent user experience across different views

## Known Issues
- None currently - recent fixes have addressed:
  - Type safety concerns
  - Analysis robustness
  - Database compatibility
  - Error handling

## Current Questions
1. What additional metrics should we add?
2. How to optimize chart performance?
3. What export formats to support?
4. How to handle real-time updates efficiently?

## Recent Learnings
1. Chart.js configuration options
2. Data aggregation strategies
3. Real-time update patterns
4. Performance optimization techniques

## Active Experiments
1. Chart.js configuration strategies
2. Data processing approaches
3. Real-time update techniques
4. Performance optimizations

### Heatmap Enhancement (Latest)
1. Interactive Visualization:
   - Added interactive heatmap showing post activity by day and hour
   - Implemented smooth hover effects with neighbor cell highlighting
   - Added tooltip with post details on hover
   - Created portal-based tooltip system for better positioning

2. Data Processing:
   - Increased post analysis from 100 to 500 posts for better data representation
   - Implemented efficient post data batching
   - Enhanced data normalization for visualization
   - Added fallback strategies for sparse data

3. Visual Design:
   - Implemented modern flat design aesthetic
   - Added subtle transitions and animations
   - Created consistent color scheme for engagement levels
   - Enhanced accessibility with clear visual feedback

4. Technical Improvements:
   - Optimized render performance
   - Added proper TypeScript types
   - Implemented efficient data caching
   - Enhanced error handling

### Analysis System Updates
1. Data Structure:
   - Updated analysis data interface to include heatmap data
   - Enhanced post processing for better engagement metrics
   - Improved data persistence in Supabase
   - Added proper type validation

2. Re-analysis Feature:
   - Implemented re-analysis functionality for saved subreddits
   - Added proper error handling and loading states
   - Enhanced data refresh mechanism
   - Improved UI feedback during analysis

3. Database Integration:
   - Updated Supabase schema for new analysis data
   - Enhanced data synchronization
   - Improved cache management
   - Added proper error recovery

## Active Decisions
1. Using portal for tooltip rendering to avoid containment issues
2. Processing 500 posts for better data representation
3. Implementing flat design aesthetic for modern look
4. Using efficient data batching for API calls
5. Maintaining consistent data structure across components

## Next Steps
1. Monitor performance with increased post processing
2. Consider adding data migration for existing analyses
3. Implement additional heatmap customization options
4. Enhance tooltip content and interaction
5. Add export functionality for heatmap data

## Current Considerations
- Performance impact of processing more posts
- User experience during re-analysis
- Data consistency across components
- Tooltip positioning edge cases
- Mobile responsiveness of heatmap

## Dependencies
- Supabase database schema
- Reddit API integration
- React portal system
- TypeScript type system

## Recent Insights
- Portal-based tooltips provide better positioning control
- Processing more posts gives better activity insights
- Flat design aesthetic improves modern feel
- Efficient data batching reduces API load

## Code Structure
```typescript
interface Post {
  title: string;
  score: number;
  num_comments: number;
  created_utc: number;
}

interface HeatmapProps {
  posts: Post[];
}

// Key components:
- HeatmapChart.tsx: Main visualization component
- AnalysisCard.tsx: Container for analysis display
- SavedList.tsx: Management of saved subreddits
```

## Current Status
- ✓ Heatmap visualization implemented
- ✓ Re-analysis functionality working
- ✓ Data persistence improved
- ✓ Tooltip system enhanced
- ✓ Performance optimized
- ✓ Error handling improved

### Analysis System Overhaul (Latest)
- Removed all engagement metrics from analysis input and scoring
- Focused analysis purely on marketing potential based on rules and content requirements
- Added better title template generation based on rule analysis
- Lowered AI temperature to 0.3 for more consistent results
- Updated system prompt to be more focused and explicit
- Added validation and transformation of AI output

Key components modified:
1. OpenRouter Service (`src/lib/openRouter.ts`):
   - Updated system prompt to focus only on rules and content requirements
   - Removed all engagement-related calculations
   - Added better title template generation based on rule analysis
   - Simplified scoring to only consider rule restrictions
   - Added validation and transformation of AI output

2. Analysis Worker (`src/workers/analysis.worker.ts`):
   - Removed all engagement metrics
   - Added proper type definitions
   - Focused input data on marketing-relevant information only
   - Improved content type detection

### Scoring System Changes
New scoring system based purely on rule restrictions:
- Base score: 75 points
- High impact rules (marketing/promotion related): -10 points each
- Medium impact rules (formatting/quality): -5 points each
- No engagement metrics influence
- Score capped between 0 and 100

### Title Template Generation
New system for generating title templates:
1. Analyzes rules for required formats
2. Detects tag requirements (e.g. [Category])
3. Identifies flair requirements
4. Provides default templates if no specific requirements found

### Content Type Detection
Improved content type detection:
1. Analyzes rules for content restrictions
2. Checks for explicit prohibitions
3. Validates against recent posts
4. Supports: text, image, video, link

## Active Decisions

### Analysis Focus
- Decision: Remove all engagement metrics from analysis
- Rationale: Engagement metrics were influencing marketing friendliness scores, leading to inaccurate results
- Impact: Scores now reflect purely how permissive or restrictive the subreddit is for marketing activities

### AI Configuration
- Temperature: Lowered to 0.3
- Rationale: More consistent and focused output
- Impact: Better title templates and more reliable analysis

### Error Handling
- Added better validation of AI output
- Improved error messages
- Added retry logic for API failures

## Next Steps
1. Monitor the effectiveness of the new scoring system
2. Gather feedback on title template quality
3. Consider adding more rule analysis patterns
4. Consider adding automated tests for the analysis system

## Known Issues
1. Some subreddits may still show unexpected scores
2. Title templates might need further refinement
3. Content type detection could be improved

## Recent Decisions Log
1. Removed engagement metrics completely
2. Simplified scoring to focus on rule restrictions
3. Added better title template generation
4. Lowered AI temperature for consistency

## Current Focus: Stripe Integration and Pricing Updates

### Recent Changes (February 24, 2025)

We have successfully updated the subscription pricing structure in both Stripe and our local database. The following changes have been implemented:

#### Pricing Tiers
- Starter: $19.99 (1999 cents) - `price_1QvyvlCtsTY6FiiZizercIly`
- Creator: $39.99 (3999 cents) - `price_1QvyvTCtsTY6FiiZ4xK1M82X`
- Pro: $47.99 (4799 cents) - `price_1QvyvaCtsTY6FiiZfyf3jfH2`
- Agency: $97.99 (9799 cents) - `price_1QvyvhCtsTY6FiiZpHBontp5`

#### Database Schema Updates
1. Created subscription_status ENUM type with states:
   - trialing
   - active
   - canceled
   - incomplete
   - incomplete_expired
   - past_due
   - unpaid
   - paused

2. Established tables:
   - `stripe_prices`: Stores Stripe price information
   - `subscriptions`: Manages user subscription details
   - `customer_subscriptions`: Links customers to their subscriptions

#### Migration Status
- Successfully executed migration `20250224103847_update_subscription_prices.sql`
- All price records confirmed updated in database
- Foreign key constraints properly established
- Dependencies handled with CASCADE operations

### Active Decisions
1. Using text type for Stripe IDs throughout the schema
2. Maintaining direct price ID references from Stripe
3. Supporting both subscription and customer_subscription models

### Next Steps
1. Verify subscription updates for existing customers
2. Implement subscription upgrade/downgrade logic
3. Set up webhook handlers for subscription events
4. Add subscription status monitoring
5. Implement usage tracking for subscription limits

### Stripe Integration Implementation
- Successfully implemented Stripe checkout flow with test mode products and prices
- Added dynamic pricing table that reflects Stripe products
- Implemented success message in Dashboard after successful subscription
- Configured proper test mode API keys and environment variables
- Verified end-to-end subscription flow working in test mode

### Recent Changes
1. Updated `src/pages/Pricing.tsx`:
   - Added dynamic price fetching from Stripe
   - Implemented checkout session creation
   - Added proper error handling for missing prices
   - Updated success URL to redirect to root with success parameter

2. Updated `src/pages/Dashboard.tsx`:
   - Added success message component for post-subscription
   - Implemented auto-hiding message after 5 seconds
   - Added URL cleanup to remove success parameter

### Next Steps
1. Implement subscription status checks
2. Add feature flags based on subscription tier
3. Set up webhook handling for subscription events
4. Add subscription management UI in user settings

### Active Decisions
- Using Stripe Checkout for payment processing
- Maintaining test/live mode separation in Stripe configuration
- Using root path (/) as dashboard landing page
- Implementing simple success message for good UX

### Current Status
- Basic Stripe integration complete and working in test mode
- Successfully processing test subscriptions
- Proper error handling for edge cases
- Clean user experience with feedback messages