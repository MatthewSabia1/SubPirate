# Technical Context

## Technology Stack

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query + Local State + Chart.js
- **Router**: React Router
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Charts**: Chart.js + React Chart.js 2

### Backend
- **Platform**: Supabase
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime + Chart.js Updates

### External APIs
- **Reddit API**: Direct REST integration
- **Chart.js**: Data visualization
- **DiceBear**: Avatar generation

## Development Environment

### Required Tools
- Node.js 18+
- npm/yarn
- Git
- VS Code (recommended)

### VS Code Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript support

### Environment Variables
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OPENROUTER_API_KEY=
```

## Dependencies

### Core Dependencies
```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "react-router-dom": "^6.0.0",
  "typescript": "^5.0.0",
  "@tanstack/react-query": "^4.0.0",
  "@supabase/supabase-js": "^2.0.0",
  "tailwindcss": "^3.0.0",
  "lucide-react": "^0.300.0",
  "lucide-react": "^0.300.0",
  "chart.js": "^4.4.1",
  "react-chartjs-2": "^5.2.0"
}
```

### Development Dependencies
```json
{
  "@types/react": "^18.0.0",
  "@types/react-dom": "^18.0.0",
  "@typescript-eslint/eslint-plugin": "^6.0.0",
  "@typescript-eslint/parser": "^6.0.0",
  "eslint": "^8.0.0",
  "prettier": "^3.0.0",
  "vite": "^5.0.0"
}
```

## Database Schema

### Core Tables

#### profiles
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### projects
```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text not null,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### subreddits
```sql
create table subreddits (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  subscriber_count integer default 0,
  active_users integer default 0,
  marketing_friendly_score integer default 0,
  posting_requirements jsonb default '{}',
  posting_frequency jsonb default '{}',
  allowed_content text[] default '{}',
  best_practices text[] default '{}',
  rules_summary text,
  title_template text,
  icon_img text,
  community_icon text,
  total_posts_24h integer default 0,
  analysis_data jsonb,
  last_analyzed_at timestamptz default now(),
  last_post_sync timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### reddit_accounts
```sql
create table reddit_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  username text not null,
  karma_score integer default 0,
  avatar_url text,
  total_posts integer default 0,
  posts_today integer default 0,
  total_posts_24h integer default 0,
  last_post_check timestamptz default now(),
  last_karma_check timestamptz default now(),
  last_post_sync timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, username)
);
```

### Relationship Tables

#### project_subreddits
```sql
create table project_subreddits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  subreddit_id uuid references subreddits(id) on delete cascade,
  created_at timestamptz default now(),
  last_post_at timestamptz,
  unique(project_id, subreddit_id)
);
```

#### saved_subreddits
```sql
create table saved_subreddits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  subreddit_id uuid references subreddits(id) on delete cascade,
  created_at timestamptz default now(),
  last_post_at timestamptz,
  unique(user_id, subreddit_id)
);
```

#### reddit_posts
```sql
create table reddit_posts (
  id uuid primary key default gen_random_uuid(),
  reddit_account_id uuid references reddit_accounts(id) on delete cascade,
  subreddit_id uuid references subreddits(id) on delete cascade,
  post_id text not null,
  created_at timestamptz default now(),
  unique(reddit_account_id, post_id)
);
```

### Views

#### saved_subreddits_with_icons
```sql
create view saved_subreddits_with_icons as
select 
  ss.id,
  ss.user_id,
  ss.created_at,
  s.id as subreddit_id,
  s.name,
  s.subscriber_count,
  s.active_users,
  s.marketing_friendly_score,
  s.allowed_content,
  s.icon_img,
  s.community_icon,
  s.analysis_data
from saved_subreddits ss
join subreddits s on ss.subreddit_id = s.id;
```

### Security Policies

The database implements Row Level Security (RLS) with the following key policies:

1. **Profiles**
   - Users can only view and update their own profile

2. **Projects**
   - Users can only view, create, update, and delete their own projects

3. **Reddit Accounts**
   - Users can only view, create, update, and delete their own reddit accounts

4. **Subreddits**
   - All authenticated users can view, create, and update subreddits
   - No deletion allowed to maintain data integrity

5. **Project Subreddits**
   - Users can only view, create, and delete project subreddits for their own projects

## API Integration

### Reddit API
- Direct REST calls
- No authentication required for public data
- Rate limiting considerations
- Error handling for 429/503

### OpenRouter API
- Grok model for analysis
- Strict JSON schema
- Error handling for timeouts
- Retry logic for failures

### Supabase
- Real-time subscriptions
- Row Level Security
- Optimistic updates
- Error handling

## Performance Considerations

### Frontend
- Code splitting
- Image optimization
- Lazy loading
- Debounced API calls

### API
- Request caching
- Rate limiting
- Batch operations
- Error recovery

### Database
- Indexed queries
- Efficient joins
- Connection pooling
- Query optimization 