-- Database Schema: Public

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  display_name text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  email text NULL,
  image_url text NULL,
  subscription_id uuid NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
) TABLESPACE pg_default;

CREATE TABLE public.project_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.project_role NOT NULL DEFAULT 'read'::project_role,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT project_members_pkey PRIMARY KEY (id),
  CONSTRAINT project_members_project_id_user_id_key UNIQUE (project_id, user_id),
  CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE TABLE public.project_subreddits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  subreddit_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  last_post_at timestamp with time zone NULL,
  CONSTRAINT project_subreddits_pkey PRIMARY KEY (id),
  CONSTRAINT project_subreddits_project_id_subreddit_id_key UNIQUE (project_id, subreddit_id),
  CONSTRAINT project_subreddits_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT project_subreddits_subreddit_id_fkey FOREIGN KEY (subreddit_id) REFERENCES subreddits(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  image_url text NULL,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE TABLE public.reddit_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  last_post_check timestamp with time zone NULL DEFAULT now(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  karma_score integer NULL DEFAULT 0,
  avatar_url text NULL,
  total_posts integer NULL DEFAULT 0,
  posts_today integer NULL DEFAULT 0,
  last_karma_check timestamp with time zone NULL DEFAULT now(),
  total_posts_24h integer NULL DEFAULT 0,
  last_post_sync timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT reddit_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT reddit_accounts_user_id_username_key UNIQUE (user_id, username),
  CONSTRAINT reddit_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE TABLE public.reddit_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reddit_account_id uuid NOT NULL,
  subreddit_id uuid NOT NULL,
  post_id text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT reddit_posts_pkey PRIMARY KEY (id),
  CONSTRAINT reddit_posts_reddit_account_id_post_id_key UNIQUE (reddit_account_id, post_id),
  CONSTRAINT reddit_posts_reddit_account_id_fkey FOREIGN KEY (reddit_account_id) REFERENCES reddit_accounts(id) ON DELETE CASCADE,
  CONSTRAINT reddit_posts_subreddit_id_fkey FOREIGN KEY (subreddit_id) REFERENCES subreddits(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE TABLE public.saved_subreddits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subreddit_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  last_post_at timestamp with time zone NULL,
  CONSTRAINT saved_subreddits_pkey PRIMARY KEY (id),
  CONSTRAINT saved_subreddits_user_id_subreddit_id_key UNIQUE (user_id, subreddit_id),
  CONSTRAINT saved_subreddits_subreddit_id_fkey FOREIGN KEY (subreddit_id) REFERENCES subreddits(id) ON DELETE CASCADE,
  CONSTRAINT saved_subreddits_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE VIEW public.saved_subreddits_with_icons AS 
SELECT ss.id,
    ss.user_id,
    ss.created_at,
    s.id AS subreddit_id,
    s.name,
    s.subscriber_count,
    s.active_users,
    s.marketing_friendly_score,
    s.allowed_content,
    s.icon_img,
    s.community_icon
FROM saved_subreddits ss
JOIN subreddits s ON ss.subreddit_id = s.id;

CREATE TABLE public.stripe_events (
  id text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  processed_at timestamp with time zone NULL,
  data jsonb NULL,
  CONSTRAINT stripe_events_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS stripe_events_type_idx ON public.stripe_events USING btree (type) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS stripe_events_status_idx ON public.stripe_events USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS stripe_events_created_at_idx ON public.stripe_events USING btree (created_at) TABLESPACE pg_default;

CREATE TABLE public.subreddit_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reddit_account_id uuid NOT NULL,
  subreddit_id uuid NOT NULL,
  posted_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT subreddit_posts_pkey PRIMARY KEY (id),
  CONSTRAINT subreddit_posts_reddit_account_id_fkey FOREIGN KEY (reddit_account_id) REFERENCES reddit_accounts(id) ON DELETE CASCADE,
  CONSTRAINT subreddit_posts_subreddit_id_fkey FOREIGN KEY (subreddit_id) REFERENCES subreddits(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE TABLE public.subreddits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subscriber_count integer NULL DEFAULT 0,
  active_users integer NULL DEFAULT 0,
  marketing_friendly_score integer NULL DEFAULT 0,
  posting_requirements jsonb NULL DEFAULT '{}'::jsonb,
  posting_frequency jsonb NULL DEFAULT '{}'::jsonb,
  allowed_content text[] NULL DEFAULT '{}'::text[],
  best_practices text[] NULL DEFAULT '{}'::text[],
  rules_summary text NULL,
  title_template text NULL,
  last_analyzed_at timestamp with time zone NULL DEFAULT now(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  icon_img text NULL,
  community_icon text NULL,
  total_posts_24h integer NULL DEFAULT 0,
  last_post_sync timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT subreddits_pkey PRIMARY KEY (id),
  CONSTRAINT subreddits_name_key UNIQUE (name)
) TABLESPACE pg_default;

CREATE TABLE public.subscription_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NULL,
  stripe_price_id text NOT NULL,
  price integer NOT NULL,
  interval text NOT NULL,
  features text[] NOT NULL DEFAULT '{}'::text[],
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT subscription_tiers_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_tiers_stripe_price_id_key UNIQUE (stripe_price_id)
) TABLESPACE pg_default;

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_customer_id text NULL,
  stripe_subscription_id text NULL,
  status public.subscription_status NOT NULL,
  price_id text NULL,
  quantity integer NULL DEFAULT 1,
  cancel_at_period