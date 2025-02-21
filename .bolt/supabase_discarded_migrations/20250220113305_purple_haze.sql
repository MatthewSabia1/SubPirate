/*
  # Add post tracking for Reddit accounts

  1. New Tables
    - `reddit_posts` - Tracks posts made by connected Reddit accounts
      - `id` (uuid, primary key)
      - `reddit_account_id` (uuid, references reddit_accounts)
      - `subreddit_id` (uuid, references subreddits)
      - `post_id` (text) - Reddit's post ID
      - `created_at` (timestamptz)

  2. Changes
    - Add post tracking columns to `reddit_accounts`
      - `total_posts_24h` (integer)
      - `last_post_sync` (timestamptz)

  3. Security
    - Enable RLS on new table
    - Add policies for post tracking
*/

-- Add post tracking columns to reddit_accounts
ALTER TABLE reddit_accounts
ADD COLUMN total_posts_24h integer DEFAULT 0,
ADD COLUMN last_post_sync timestamptz DEFAULT now();

-- Create reddit_posts table
CREATE TABLE reddit_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reddit_account_id uuid REFERENCES reddit_accounts(id) ON DELETE CASCADE NOT NULL,
  subreddit_id uuid REFERENCES subreddits(id) ON DELETE CASCADE NOT NULL,
  post_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reddit_account_id, post_id)
);

-- Enable RLS
ALTER TABLE reddit_posts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own reddit posts"
  ON reddit_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reddit_accounts
      WHERE id = reddit_posts.reddit_account_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reddit posts"
  ON reddit_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reddit_accounts
      WHERE id = reddit_posts.reddit_account_id
      AND user_id = auth.uid()
    )
  );

-- Create function to update post counts
CREATE OR REPLACE FUNCTION update_account_post_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update total posts in last 24 hours
  UPDATE reddit_accounts
  SET 
    total_posts_24h = (
      SELECT COUNT(*)
      FROM reddit_posts
      WHERE reddit_account_id = NEW.reddit_account_id
      AND created_at > now() - interval '24 hours'
    ),
    last_post_sync = now()
  WHERE id = NEW.reddit_account_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for post count updates
CREATE TRIGGER on_reddit_post_created
  AFTER INSERT ON reddit_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_account_post_count();