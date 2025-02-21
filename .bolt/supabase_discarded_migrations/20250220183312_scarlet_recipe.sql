/*
  # Add Reddit Posts Table and Functions

  1. New Tables
    - `reddit_posts` - Stores posts made by Reddit accounts
      - `id` (uuid, primary key)
      - `reddit_account_id` (uuid, references reddit_accounts)
      - `subreddit_id` (uuid, references subreddits)
      - `post_id` (text) - Reddit's post ID
      - `created_at` (timestamptz)

  2. Functions
    - `get_subreddit_post_counts` - Returns post counts for subreddits
    - `sync_reddit_account_posts` - Syncs posts for a Reddit account
*/

-- Create reddit_posts table
CREATE TABLE IF NOT EXISTS reddit_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reddit_account_id uuid REFERENCES reddit_accounts(id) ON DELETE CASCADE NOT NULL,
  subreddit_id uuid REFERENCES subreddits(id) ON DELETE CASCADE NOT NULL,
  post_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reddit_account_id, post_id)
);

-- Enable RLS
ALTER TABLE reddit_posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own posts"
  ON reddit_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reddit_accounts
      WHERE id = reddit_posts.reddit_account_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own posts"
  ON reddit_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reddit_accounts
      WHERE id = reddit_account_id
      AND user_id = auth.uid()
    )
  );

-- Create function to get post counts for subreddits
CREATE OR REPLACE FUNCTION get_subreddit_post_counts(subreddit_ids uuid[])
RETURNS TABLE (subreddit_id uuid, total_posts_24h integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rp.subreddit_id,
    COUNT(*)::integer as total_posts_24h
  FROM reddit_posts rp
  WHERE rp.subreddit_id = ANY(subreddit_ids)
  AND rp.created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY rp.subreddit_id;
END;
$$;