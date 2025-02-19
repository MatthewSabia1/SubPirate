/*
  # Initial Schema Setup for SubPirate

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - References auth.users
      - `display_name` (text) - User's display name
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `projects`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References profiles
      - `name` (text) - Project name
      - `description` (text) - Project description
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `subreddits`
      - `id` (uuid, primary key)
      - `name` (text) - Subreddit name without r/ prefix
      - `subscriber_count` (integer)
      - `active_users` (integer)
      - `marketing_friendly_score` (integer)
      - `posting_requirements` (jsonb)
      - `posting_frequency` (jsonb)
      - `allowed_content` (text[])
      - `best_practices` (text[])
      - `rules_summary` (text)
      - `title_template` (text)
      - `last_analyzed_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `project_subreddits`
      - `id` (uuid, primary key)
      - `project_id` (uuid) - References projects
      - `subreddit_id` (uuid) - References subreddits
      - `created_at` (timestamp)
    
    - `reddit_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References profiles
      - `username` (text)
      - `last_post_check` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `subreddit_posts`
      - `id` (uuid, primary key)
      - `reddit_account_id` (uuid) - References reddit_accounts
      - `subreddit_id` (uuid) - References subreddits
      - `posted_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to:
      - Read and update their own profile
      - CRUD operations on their projects
      - Read and create subreddits (shared resource)
      - CRUD operations on their project_subreddits
      - CRUD operations on their reddit_accounts
      - CRUD operations on their subreddit_posts
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subreddits table
CREATE TABLE subreddits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  subscriber_count integer DEFAULT 0,
  active_users integer DEFAULT 0,
  marketing_friendly_score integer DEFAULT 0,
  posting_requirements jsonb DEFAULT '{}',
  posting_frequency jsonb DEFAULT '{}',
  allowed_content text[] DEFAULT '{}',
  best_practices text[] DEFAULT '{}',
  rules_summary text,
  title_template text,
  last_analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_subreddits table
CREATE TABLE project_subreddits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  subreddit_id uuid REFERENCES subreddits(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, subreddit_id)
);

-- Create reddit_accounts table
CREATE TABLE reddit_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  username text NOT NULL,
  last_post_check timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, username)
);

-- Create subreddit_posts table
CREATE TABLE subreddit_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reddit_account_id uuid REFERENCES reddit_accounts(id) ON DELETE CASCADE NOT NULL,
  subreddit_id uuid REFERENCES subreddits(id) ON DELETE CASCADE NOT NULL,
  posted_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subreddits ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_subreddits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reddit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subreddit_posts ENABLE ROW LEVEL SECURITY;

-- Create policies

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Subreddits policies (shared resource)
CREATE POLICY "Anyone can view subreddits"
  ON subreddits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can create subreddits"
  ON subreddits FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Project subreddits policies
CREATE POLICY "Users can view own project subreddits"
  ON project_subreddits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_subreddits.project_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create project subreddits"
  ON project_subreddits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_subreddits.project_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project subreddits"
  ON project_subreddits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_subreddits.project_id
      AND user_id = auth.uid()
    )
  );

-- Reddit accounts policies
CREATE POLICY "Users can view own reddit accounts"
  ON reddit_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reddit accounts"
  ON reddit_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reddit accounts"
  ON reddit_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reddit accounts"
  ON reddit_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Subreddit posts policies
CREATE POLICY "Users can view own subreddit posts"
  ON subreddit_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reddit_accounts
      WHERE id = subreddit_posts.reddit_account_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create subreddit posts"
  ON subreddit_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reddit_accounts
      WHERE id = subreddit_posts.reddit_account_id
      AND user_id = auth.uid()
    )
  );

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();