/*
  # Add post tracking functionality
  
  1. New Columns
    - Add total_posts_24h and last_post_sync to subreddits table
    - Add total_posts, posts_today, and last_post_sync to reddit_accounts table
  
  2. Functions
    - Create functions to get post counts for subreddits
    - Drop existing function before recreating with new signature
  
  3. Views
    - Update saved_subreddits_with_icons view to include new columns
*/

-- Add new columns to subreddits table
ALTER TABLE subreddits
ADD COLUMN IF NOT EXISTS total_posts_24h integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_post_sync timestamptz DEFAULT now();

-- Add new columns to reddit_accounts table
ALTER TABLE reddit_accounts
ADD COLUMN IF NOT EXISTS total_posts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_today integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_post_sync timestamptz DEFAULT now();

-- Create function to get post count for a subreddit
CREATE OR REPLACE FUNCTION get_subreddit_post_count(subreddit_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO post_count
  FROM reddit_posts rp
  WHERE rp.subreddit_id = subreddit_uuid
  AND rp.created_at >= NOW() - INTERVAL '24 hours';
  
  RETURN COALESCE(post_count, 0);
END;
$$;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_subreddit_post_counts(uuid[]);

-- Create function to get post counts for multiple subreddits
CREATE FUNCTION get_subreddit_post_counts(subreddit_ids uuid[])
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

-- Update saved_subreddits_with_icons view
CREATE OR REPLACE VIEW saved_subreddits_with_icons AS
SELECT 
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
  s.total_posts_24h,
  s.last_post_sync
FROM saved_subreddits ss
JOIN subreddits s ON ss.subreddit_id = s.id;