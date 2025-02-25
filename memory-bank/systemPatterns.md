# System Patterns

## Architecture Overview

### Frontend Architecture
```mermaid
flowchart TD
    Pages --> Components
    Components --> Features
    Features --> Services
    Services --> APIs
    Components --> SharedUI[Shared UI Components]
    Features --> Utils[Utility Functions]
```

### Data Flow
```mermaid
flowchart LR
    User --> Frontend
    Frontend --> RedditAPI[Reddit API]
    Frontend --> OpenRouterAPI[OpenRouter API]
    Frontend --> Supabase
    Frontend --> StripeAPI[Stripe API]
    RedditAPI --> Analysis
    OpenRouterAPI --> Analysis
    Analysis --> Supabase
    StripeAPI --> Webhook[Webhook Server]
    Webhook --> Supabase
```

### Subscription Flow
```mermaid
flowchart TD
    User[User] --> PricingPage[Pricing Page]
    PricingPage --> SelectPlan[Select Plan]
    SelectPlan --> CreateSession[Create Checkout Session]
    CreateSession --> StripeCheckout[Stripe Checkout]
    StripeCheckout --> Success{Success?}
    Success -->|Yes| RedirectApp[Redirect to App]
    Success -->|No| RedirectPricing[Return to Pricing]
    StripeCheckout --> WebhookEvents[Webhook Events]
    WebhookEvents --> UpdateStatus[Update Subscription Status]
    UpdateStatus --> DatabaseUpdate[Update Database]
```

## Component Structure

### Core Components
1. **Analysis Components**
   - SubredditAnalysis
   - AnalysisCard
   - ProgressBar
   - ContentTypeIndicators

2. **Project Components**
   - ProjectList
   - ProjectSubreddits
   - ProjectSettings
   - ShareProject

3. **Shared Components**
   - SavedList
   - AddToProject
   - FilterSort
   - Icons

4. **Subscription Components**
   - Pricing
   - PricingCard
   - TestModeIndicator
   - SubscriptionStatus

## Design Patterns

### 1. Component Patterns
- Presentational/Container separation
- Compound components for complex UIs
- Render props for flexible components
- Custom hooks for shared logic

### 2. State Management
- React Query for API data
- Local state for UI elements
- Supabase realtime for sync
- Context for theme/auth

### 3. Error Handling
- Boundary components
- Graceful degradation
- User-friendly messages
- Detailed logging
- Enhanced error diagnostics in test mode

### 4. Performance Patterns
- Code splitting
- Lazy loading
- Memoization
- Debounced API calls

### 5. Stripe Integration Patterns
- Test/Production mode separation
- Fallback price IDs for reliability
- Forced test mode during development
- Visual indicators for test environment
- Webhook server for event handling
- Comprehensive logging for debugging

### 6. Database Patterns
- Idempotent migrations for safety
  - Use IF EXISTS/IF NOT EXISTS clauses
  - DROP before CREATE for functions/triggers
  - Explicit permission grants for security
  - Security definer functions when needed
  - Row-level security policies for data protection
- Transaction-based operations for atomicity
- Proper indexing for performance
- Clear and consistent schema design
- Explicit foreign key constraints
- Regular database maintenance

### 7. User Usage Tracking Pattern
```mermaid
flowchart TD
    UserAction[User Action] --> CheckTier[Check Subscription Tier]
    CheckTier --> LimitCheck{Check Usage Limits}
    LimitCheck -->|Within Limits| IncrementCounter[Increment Usage Counter]
    LimitCheck -->|Exceeded| ShowUpgrade[Show Upgrade Prompt]
    IncrementCounter --> PerformAction[Perform Action]
    ShowUpgrade --> UpgradePath[Upgrade Path]
    
    subgraph UsageTracking[Usage Tracking System]
        IncrementCounter --> IncrementFunction[increment_usage_stat]
        IncrementFunction --> UpdateDB[Update user_usage_stats]
        GetLimits[get_user_usage_stats] --> ReadDB[Read user_usage_stats]
    end
    
    CheckTier --> GetLimits
```

This pattern ensures usage tracking is:
1. **Reliable**: SQL functions handle database consistency
2. **Secure**: Row-level security enforces data access
3. **Scalable**: Indexed tables for fast access
4. **Maintainable**: Clear separation of concerns
5. **Resilient**: Error handling at multiple levels

## Technical Decisions

### 1. Framework Choices
- **React**: Component-based UI
- **TypeScript**: Type safety
- **Tailwind**: Styling
- **Supabase**: Backend
- **Express**: Webhook server

### 2. API Integration
- **Reddit API**: Direct REST calls
- **OpenRouter**: AI analysis
- **Supabase**: Real-time data
- **Stripe API**: Subscription management
   - Test mode during development
   - Webhook events for state management

### 3. Data Storage
- **Supabase Tables**:
  - projects
  - subreddits
  - project_subreddits
  - saved_subreddits
  - user_settings
  - subscriptions
  - payment_history

### 4. Authentication
- Supabase Auth
- JWT tokens
- Role-based access
- Subscription-based feature access

### 5. Environment Separation
- Development with forced test mode
- Test environment with test API keys
- Production with live API keys
- Clear visual indicators per environment

## Testing Strategies

### 1. Unit Testing
- Component tests
- Utility function tests
- Mock API responses

### 2. Integration Testing
- User flow tests
- API integration tests
- Database interactions

### 3. Subscription Testing
- Mock Stripe events
- Webhook verification tests
- Success/failure flow tests
- Using Stripe CLI for local webhook testing
### Directory Structure
```
src/
├── components/
│   ├── analysis/
│   ├── project/
│   └── shared/
├── features/
│   ├── subreddit-analysis/
│   └── project-management/
├── lib/
│   ├── api/
│   ├── utils/
│   └── hooks/
├── pages/
└── styles/
```

### Feature Organization
- Services
- Components
- Types
- Utils
- Hooks

## Implementation Guidelines

### 1. Component Guidelines
- Single responsibility
- Prop type definitions
- Error boundaries
- Loading states

### 2. State Management
- Minimize prop drilling
- Centralize API logic
- Cache management
- Optimistic updates

### 3. Styling Approach
- Tailwind utilities
- CSS variables
- Responsive design
- Dark theme

### 4. Testing Strategy
- Unit tests for utils
- Component testing
- Integration tests
- E2E workflows

### 1. Type Safety Guidelines
- Use `unknown` for external data
- Implement type guards
- Validate parsed data
- Handle edge cases

### 2. Analysis Guidelines
- Sample sufficient data
- Validate inputs
- Provide fallbacks
- Handle errors gracefully

### 3. Database Guidelines
- Match schema types
- Handle nullables
- Validate before save
- Type-safe queries

## UI Patterns

### Card Interaction Pattern
```tsx
<div 
  onClick={handleCardClick}
  className="p-4 hover:bg-[#1A1A1A] transition-colors cursor-pointer"
>
  <div className="flex items-center justify-between">
    {/* Card Content */}
    <div className="flex items-center gap-4">
      {/* Main Content */}
    </div>
    
    {/* Action Buttons */}
    <div onClick={e => e.stopPropagation()}>
      {/* Independent Actions */}
    </div>
  </div>
</div>
```

Key characteristics:
1. Full Card Clickability:
   - Entire card surface is clickable
   - Clear visual feedback on hover
   - Proper cursor indication
   - Accessible click targets

2. Action Independence:
   - Action buttons stop event propagation
   - Preserve independent functionality
   - Clear visual separation
   - Maintain hover states

3. Visual Hierarchy:
   - Card-level hover effects
   - Action-specific states
   - Status indicators
   - Consistent spacing

4. Implementation:
   - Event bubbling control
   - Type-safe handlers
   - Proper event isolation
   - Accessibility support

### Data Display Consistency
1. Community Stats Format
   - Total subscribers: Gray text with Users icon
   - Online users: Emerald text with Activity icon
   - Consistent spacing and layout across views
   - Conditional rendering for online count when > 0

2. Component Structure
   - Grid-based layouts for data tables
   - Consistent column widths and spacing
   - Unified action button styling
   - Standardized icon usage

### Data Refresh Patterns
1. Automatic Updates
   - Periodic refresh of subreddit data
   - Database synchronization
   - Local state management
   - Error handling and recovery

2. Data Transformation
   - Consistent handling of API responses
   - Proper type casting and validation
   - Unified formatting functions
   - Error boundary implementation

## Component Architecture

### Shared Components
1. Data Display Components
   - Community stats display
   - Action buttons
   - Status indicators
   - Loading states

2. Data Management
   - Refresh mechanisms
   - State synchronization
   - Error handling
   - Cache management

### Code Organization
1. Component Structure
   - Consistent prop interfaces
   - Shared utility functions
   - Common styling patterns
   - Reusable hooks

2. State Management
   - Local component state
   - Database synchronization
   - Cache handling
   - Error state management

## Analysis System Architecture

### Core Components

#### 1. OpenRouter Service (`src/lib/openRouter.ts`)
- Primary interface for AI analysis
- Handles API communication
- Manages retries and error handling
- Validates and transforms AI output

Latest patterns:
```typescript
interface SubredditAnalysisInput {
  name: string;
  title: string;
  description: string;
  rules: {
    title: string;
    description: string;
    priority: number;
    marketingImpact: 'high' | 'medium' | 'low';
  }[];
  content_categories: string[];
  posting_requirements: {
    karma_required: boolean;
    account_age_required: boolean;
    manual_approval: boolean;
  };
  allowed_content_types: string[];
}
```

#### 2. Analysis Worker (`src/workers/analysis.worker.ts`)
- Handles analysis in background thread
- Prepares input data
- Manages analysis lifecycle
- Reports progress and results

### Analysis Patterns

#### Rule Analysis Pattern
1. Text Analysis:
   ```typescript
   function determineMarketingImpact(rule: { title: string; description: string }): 'high' | 'medium' | 'low' {
     const text = `${rule.title} ${rule.description}`.toLowerCase();
     
     const highImpactKeywords = [
       'spam', 'promotion', 'advertising', 'marketing', 'self-promotion',
       'commercial', 'business', 'selling', 'merchandise', 'affiliate'
     ];
     
     const mediumImpactKeywords = [
       'quality', 'format', 'title', 'flair', 'tags',
       'submission', 'guidelines', 'requirements', 'posting'
     ];
     
     if (highImpactKeywords.some(keyword => text.includes(keyword))) {
       return 'high';
     }
     
     if (mediumImpactKeywords.some(keyword => text.includes(keyword))) {
       return 'medium';
     }
     
     return 'low';
   }
   ```

2. Content Type Detection:
   ```typescript
   function determineAllowedContentTypes(info: SubredditInfo, posts: SubredditPost[]): string[] {
     const types = new Set<string>();
     
     // Rule analysis
     const rulesText = info.rules
       .map(rule => `${rule.title} ${rule.description}`)
       .join(' ')
       .toLowerCase();

     // Default content types
     if (!rulesText.includes('no text posts')) types.add('text');
     if (!rulesText.includes('no image')) types.add('image');
     if (!rulesText.includes('no video')) types.add('video');
     if (!rulesText.includes('no link')) types.add('link');

     // Validation against posts
     posts.forEach(post => {
       if (post.selftext) types.add('text');
       if (post.url.match(/\.(jpg|jpeg|png|gif)$/i)) types.add('image');
       if (post.url.match(/\.(mp4|webm)$/i)) types.add('video');
       if (post.url.match(/^https?:\/\//) && !post.url.match(/\.(jpg|jpeg|png|gif|mp4|webm)$/i)) {
         types.add('link');
       }
     });

     return Array.from(types);
   }
   ```

#### Title Template Pattern
```typescript
function extractTitlePatterns(rules: any[]): string[] {
  const patterns = new Set<string>();
  const ruleText = Array.isArray(rules) ? rules.join(' ').toLowerCase() : '';

  if (ruleText.includes('[') && ruleText.includes(']')) {
    patterns.add('[Category/Topic] Your Title');
  }
  
  if (ruleText.includes('flair')) {
    patterns.add('Title with Required Flair');
  }

  if (patterns.size === 0) {
    patterns.add('Descriptive Title');
    patterns.add('Question Format Title?');
    patterns.add('[Topic] - Description');
  }

  return Array.from(patterns);
}
```

#### Marketing Score Pattern
```typescript
function calculateMarketingScore(rules: any[]): number {
  let score = 75; // Base score
  
  // Count restrictive rules
  const highImpactRules = rules.filter((r: any) => r.marketingImpact === 'high').length;
  const mediumImpactRules = rules.filter((r: any) => r.marketingImpact === 'medium').length;
  
  // Deduct points for restrictive rules
  score -= (highImpactRules * 10);
  score -= (mediumImpactRules * 5);
  
  return Math.max(0, Math.min(100, score));
}
```

### AI Integration Pattern

#### System Prompt Pattern
```typescript
const systemPrompt = `You are an expert Reddit marketing analyst. Your task is to analyze subreddit rules and content requirements to determine marketing potential. Focus ONLY on:

1. Rule Analysis:
   - How restrictive are the rules regarding marketing/promotion?
   - What content types are allowed/prohibited?
   - Are there specific formatting requirements?

2. Title Requirements:
   - Required formats (e.g. [Tags], specific prefixes)
   - Prohibited patterns
   - Length restrictions
   - Example templates that comply with rules

3. Content Restrictions:
   - Allowed media types
   - Required content elements
   - Prohibited content types
   - Quality requirements

DO NOT consider engagement metrics, subscriber counts, or activity levels. Base your analysis purely on how permissive or restrictive the subreddit's rules and requirements are for marketing activities.`;
```

#### Output Validation Pattern
```typescript
function validateAndTransformOutput(result: unknown): AIAnalysisOutput {
  let parsedResult: any = result;
  
  try {
    // Handle markdown-formatted results
    if (typeof parsedResult === 'string') {
      const markdownMatch = parsedResult.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (markdownMatch) {
        parsedResult = JSON.parse(markdownMatch[1].trim());
      }
    }

    // Transform and validate output
    const output: AIAnalysisOutput = {
      postingLimits: {
        frequency: parsedResult?.postingLimits?.frequency || 1,
        bestTimeToPost: ['Morning', 'Afternoon', 'Evening'],
        contentRestrictions: Array.isArray(parsedResult?.postingLimits?.contentRestrictions)
          ? parsedResult.postingLimits.contentRestrictions
          : ['Follow subreddit rules']
      },
      // ... rest of validation logic
    };

    return output;
  } catch (error) {
    throw new AIAnalysisError('Failed to validate AI response');
  }
}
```

## Layout Patterns

### Page Container Pattern
The application now follows a consistent page container pattern across major list views:

```tsx
<div className="max-w-[1200px] mx-auto px-4 md:px-8">
  {/* Page content */}
</div>
```

Key characteristics:
1. Maximum width constraint (1200px)
2. Centered horizontally using auto margins
3. Responsive padding:
   - Mobile: 16px (px-4)
   - Desktop: 32px (px-8)

Currently implemented in:
- SavedList component (`src/pages/SavedList.tsx`)
- Projects page (`src/pages/Projects.tsx`)

This pattern ensures:
- Consistent content width across pages
- Proper content alignment
- Responsive behavior on different screen sizes
- Improved readability on wide screens

### Card List Pattern
For lists of items (projects, saved subreddits), we use:
```tsx
<div className="bg-[#111111] rounded-lg overflow-hidden">
  <div className="divide-y divide-[#222222]">
    {/* List items */}
  </div>
</div>
```

Features:
- Dark background (#111111)
- Rounded corners
- Dividers between items (#222222)
- Overflow handling 

## Data Structure Patterns

### Subreddit Analysis Data
The application follows a consistent data structure pattern for subreddit analysis:

```typescript
interface AnalysisData {
  // Basic Information
  subreddit: string;
  subscribers: number;
  activeUsers: number;
  rules?: any[];

  // Marketing Analysis
  marketingFriendliness: {
    score: number;
    reasons: string[];
    recommendations: string[];
  };

  // Posting Strategy
  postingLimits: {
    frequency: number;
    bestTimeToPost: string[];
    contentRestrictions: string[];
  };

  // Content Strategy
  contentStrategy: {
    recommendedTypes: string[];
    topics: string[];
    dos: string[];
    donts: string[];
  };

  // Analysis Results
  strategicAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
  };

  // Optional Components
  titleTemplates?: {
    patterns: string[];
    examples: string[];
    effectiveness: number;
  };
  gamePlan?: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}
```

### Data Flow
1. OpenRouter AI Service
   - Generates analysis with consistent schema
   - Validates against TypeScript interface
   - Returns structured data

2. Frontend Components
   - Use consistent property paths
   - Implement validation checks
   - Handle optional properties safely

3. Database Storage
   - Maps to Supabase schema
   - Preserves complete analysis data
   - Handles data versioning

### Validation Patterns
```typescript
// Component-level validation
if (!analysis?.postingLimits?.contentRestrictions || 
    !analysis?.marketingFriendliness?.score || 
    !analysis?.contentStrategy?.recommendedTypes) {
  // Handle incomplete data
}

// Database-level validation
interface SavedSubreddit {
  id: string;
  name: string;
  subscriber_count: number;
  active_users: number;
  marketing_friendly_score: number;
  allowed_content: string[];
  posting_requirements: {
    restrictions: string[];
    recommendations: string[];
  };
  posting_frequency: {
    timing: Array<{ hour: number; timezone: string }>;
    postTypes: string[];
  };
  best_practices: string[];
  analysis_data: AnalysisData;
}
```

### Error Handling Patterns
1. API Service Errors
   - Retry logic for transient failures
   - Specific error messages for different scenarios
   - Graceful degradation

2. Data Validation Errors
   - Early validation in components
   - User-friendly error messages
   - Recovery options when possible

3. Save Operation Errors
   - Transaction-like operations
   - Rollback on failure
   - User feedback and retry options

## Component Patterns

### Analysis Display
- Consistent grid layout
- Section-based organization
- Progressive disclosure
- Error boundaries

### Data Input/Output
- Type-safe interfaces
- Validation before save
- Optimistic updates
- Error recovery

## Best Practices

### Data Structure
1. Use consistent property naming
2. Implement proper TypeScript interfaces
3. Handle optional properties explicitly
4. Validate data at boundaries

### Error Handling
1. Implement retry logic
2. Provide specific error messages
3. Handle edge cases gracefully
4. Log errors for debugging

### Component Design
1. Use TypeScript for type safety
2. Implement proper validation
3. Handle loading states
4. Provide error feedback

### Database Operations
1. Use transactions when needed
2. Validate data before save
3. Handle conflicts properly
4. Maintain data integrity 

## Prompt System Architecture
- Location: `src/features/subreddit-analysis/lib/prompts.ts`
- Two main components:
  1. SYSTEM_PROMPT: Core instruction set for the AI
  2. ANALYSIS_PROMPT: Task-specific instructions

### Prompt Design Patterns
1. Rule Analysis Pattern
   - Thorough examination of rules
   - Identification of exploitable gaps
   - Loophole detection
   
2. Risk Assessment Pattern
   - Risk-reward calculation
   - Detection probability analysis
   - Ban risk evaluation
   
3. Stealth Pattern
   - Plausible deniability maintenance
   - Organic content blending
   - Mod scrutiny avoidance

4. Circumvention Pattern
   - Restriction bypass strategies
   - Automod pattern analysis
   - Detection avoidance techniques

### AI Response Structure
- JSON Schema conformant
- Includes:
  - Marketing friendliness score
  - Rule exploitation strategies
  - Risk assessments
  - Tactical recommendations
  - Stealth techniques

## Key Technical Decisions
1. Sophisticated Rule Analysis
   - Analyze rather than disregard rules
   - Focus on exploitation over violation
   - Maintain plausible deniability

2. Risk-Based Approach
   - Calculate risk-reward ratios
   - Assess detection probabilities
   - Evaluate mod response patterns

3. Stealth-First Design
   - Blend with organic content
   - Avoid obvious patterns
   - Maintain legitimate appearance 

## Stripe Integration Architecture

### Subscription Flow
```mermaid
flowchart LR
    User --> Checkout[Stripe Checkout]
    Checkout --> StripeAPI[Stripe API]
    StripeAPI --> Webhook[Webhook Endpoint]
    Webhook --> Database[Supabase Database]
    User --> Portal[Customer Portal]
    Portal --> StripeAPI
    User --> App[Application]
    App --> Database
```

### User Association Pattern
The system uses a reliable pattern to associate Stripe customers with application users:

1. **Metadata Association**: 
   - User ID is stored in Stripe customer metadata during checkout
   - Webhook handlers extract user ID from metadata
   - Database records are linked using this ID

2. **Event-Based Architecture**:
   - Stripe webhooks serve as the source of truth
   - Application reacts to webhook events
   - Database is synchronized based on event data

3. **Implementation**:
```typescript
// Storing user ID in metadata during checkout
const sessionParams = {
  customer_creation: 'always',
  customer_email: userEmail,
  customer_data: {
    metadata: {
      userId: userId
    }
  },
  subscription_data: {
    metadata: {
      userId: userId
    }
  }
};

// Extracting user ID from webhook event
const userId = event.data.object.customer?.metadata?.userId || 
               event.data.object.metadata?.userId;

// Database synchronization
if (userId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      subscription_id: subscriptionId,
      status: status,
      // Other fields...
    });
}
```

### Error Handling Pattern
The subscription system implements a robust error handling pattern:

1. **Graceful Degradation**:
   - Use of `.maybeSingle()` instead of `.single()` for queries
   - Default to free tier when subscription lookup fails
   - Fallback strategies for missing data

2. **Comprehensive Logging**:
   - Detailed error capture at each step
   - User ID included in logs for traceability
   - Structured error objects with context

3. **Query Pattern Improvements**:
   - Using wildcard `*` for select queries to avoid 406 errors
   - Simplified query structure to prevent column mismatch errors
   - Consistent error handling across subscription-related functions

### Customer Portal Integration
The system implements a standard pattern for customer portal access:

1. **Session Creation**:
   - Generate a portal session for the current user
   - Pass return URL for seamless experience
   - Handle errors with graceful fallbacks

2. **Implementation**:
```typescript
const portalSession = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: returnUrl
});
```

### Database Schema

#### Core Tables
```sql
-- Stripe prices table
CREATE TABLE public.stripe_prices (
    id text PRIMARY KEY,              -- Stripe price ID
    active boolean DEFAULT true,
    currency text DEFAULT 'usd',
    unit_amount integer,              -- Amount in cents
    type text DEFAULT 'recurring',
    recurring_interval text DEFAULT 'month',
    product_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Main subscriptions table
CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    status subscription_status NOT NULL,
    price_id text REFERENCES stripe_prices(id),
    quantity integer DEFAULT 1,
    cancel_at_period_end boolean DEFAULT false,
    cancel_at timestamptz,
    canceled_at timestamptz,
    current_period_start timestamptz,
    current_period_end timestamptz,
    created_at timestamptz DEFAULT now(),
    ended_at timestamptz,
    trial_start timestamptz,
    trial_end timestamptz
);

-- Customer subscriptions linking table
CREATE TABLE public.customer_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id uuid NOT NULL,
    stripe_price_id text REFERENCES stripe_prices(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### Key Design Decisions

1. **ID Management**
   - Using text type for all Stripe IDs
   - Using UUIDs for internal primary keys
   - Direct storage of Stripe IDs for easy reference

2. **Subscription States**
   ```sql
   CREATE TYPE subscription_status AS ENUM (
       'trialing',
       'active',
       'canceled',
       'incomplete',
       'incomplete_expired',
       'past_due',
       'unpaid',
       'paused'
   );
   ```

3. **Price Management**
   - Storing prices in cents to avoid floating-point issues
   - Maintaining Stripe price IDs as primary reference
   - Supporting both one-time and recurring prices

4. **Relationship Structure**
   - Direct user to subscription relationship
   - Flexible customer subscription linking
   - Foreign key constraints for data integrity

### Integration Patterns

1. **Price Synchronization**
   - Stripe is source of truth for prices
   - Local cache in stripe_prices table
   - Regular sync via webhooks

2. **Subscription Management**
   - Direct mapping to Stripe subscriptions
   - Status tracking via subscription_status
   - Support for trial periods

3. **Customer Management**
   - Flexible customer-subscription relationship
   - Support for multiple subscription types
   - Clean separation of concerns

### Security Considerations

1. **Data Protection**
   - No sensitive payment data stored locally
   - Only reference IDs from Stripe stored
   - All payment processing handled by Stripe

2. **Access Control**
   - Row Level Security (RLS) policies
   - User-specific subscription access
   - Protected price management 