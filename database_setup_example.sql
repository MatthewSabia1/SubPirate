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
  description text NOT NULL,
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
SELECT 
    ss.id,
    ss.user_id,
    ss.created_at,
    s.id AS subreddit_id,
    s.name,
    s.subscriber_count,
    s.active_users,
    s.marketing_friendly_score,
    s.allowed_content,
    s.icon_img,
    s.community_icon,
    s.analysis_data
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
  analysis_data jsonb NULL,
  CONSTRAINT subreddits_pkey PRIMARY KEY (id),
  CONSTRAINT subreddits_name_key UNIQUE (name)
) TABLESPACE pg_default;

CREATE TABLE public.subscription_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
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
  cancel_at_period_end boolean NULL DEFAULT false,
  cancel_at timestamp with time zone NULL,
  canceled_at timestamp with time zone NULL,
  current_period_start timestamp with time zone NULL,
  current_period_end timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  ended_at timestamp with time zone NULL,
  trial_start timestamp with time zone NULL,
  trial_end timestamp with time zone NULL,
  tier_id uuid NULL,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_key UNIQUE (user_id),
  CONSTRAINT subscriptions_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Row Level Security Policies

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own project subreddits" ON public.project_subreddits FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE (public.projects.id = public.project_subreddits.project_id) AND (public.projects.user_id = auth.uid())));
CREATE POLICY "Users can create project subreddits" ON public.project_subreddits FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE (public.projects.id = public.project_subreddits.project_id) AND (public.projects.user_id = auth.uid())));
CREATE POLICY "Users can delete project subreddits" ON public.project_subreddits FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE (public.projects.id = public.project_subreddits.project_id) AND (public.projects.user_id = auth.uid())));

CREATE POLICY "Users can view own reddit accounts" ON public.reddit_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create reddit accounts" ON public.reddit_accounts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reddit accounts" ON public.reddit_accounts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own reddit accounts" ON public.reddit_accounts FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can view subreddits" ON public.subreddits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create subreddits" ON public.subreddits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update subreddits" ON public.subreddits FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Add any additional policies as needed