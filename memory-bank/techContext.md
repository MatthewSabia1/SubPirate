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

### Tables

#### projects
```sql
create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  user_id uuid references auth.users(id) on delete cascade
);
```

#### subreddits
```sql
create table subreddits (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  subscriber_count integer not null,
  active_users integer not null,
  marketing_friendly_score integer not null,
  allowed_content text[] not null,
  posting_requirements jsonb not null,
  posting_frequency jsonb not null,
  best_practices text[] not null,
  rules_summary text,
  title_template text,
  last_analyzed_at timestamp with time zone not null,
  analysis_data jsonb not null
);
```

#### project_subreddits
```sql
create table project_subreddits (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  subreddit_id uuid references subreddits(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(project_id, subreddit_id)
);
```

#### saved_subreddits
```sql
create table saved_subreddits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  subreddit_id uuid references subreddits(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, subreddit_id)
);
```

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