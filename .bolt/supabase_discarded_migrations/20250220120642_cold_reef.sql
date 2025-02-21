/*
  # Fix post count tracking

  1. Changes
    - Add total_posts_24h column to subreddits table
    - Add trigger to update post counts in real-time
    - Add function to get post counts for multiple subreddits
*/

-- Add total_posts_24h column if it doesn't exist
ALTER TABLE subreddits
ADD COLUMN IF NOT EXISTS total_posts_24h integer DEFAULT 0;

-- Create function to update post counts
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update total_posts_24h for the affected subreddit
  UPDATE subreddits
  SET total_posts_24h = (
    SELECT COUNT(DISTINCT rp.id)
    FROM reddit_posts rp
    WHERE rp.subreddit_id = COALESCE(NEW.subreddit_id, OLD.subreddit_id)
    AND rp.created_at > now() - interval '24 hours'
  )
  WHERE id = COALESCE(NEW.subreddit_id, OLD.subreddit_id);
  
  RETURN NULL;
END;
$$;

-- Create trigger for post count updates
DROP TRIGGER IF EXISTS update_post_counts_trigger ON reddit_posts;
CREATE TRIGGER update_post_counts_trigger
  AFTER INSERT OR DELETE OR UPDATE ON reddit_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_counts();

-- Create function to get post counts for multiple subreddits
CREATE OR REPLACE FUNCTION get_subreddit_post_counts(subreddit_ids uuid[])
RETURNS TABLE (
  subreddit_id uuid,
  total_posts_24h bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    s.id as subreddit_id,
    COALESCE(s.total_posts_24h, 0)::bigint as total_posts_24h
  FROM unnest(subreddit_ids) AS sid
  JOIN subreddits s ON s.id = sid;
$$;

-- Update existing post counts
UPDATE subreddits s
SET total_posts_24h = (
  SELECT COUNT(DISTINCT rp.id)
  FROM reddit_posts rp
  WHERE rp.subreddit_id = s.id
  AND rp.created_at > now() - interval '24 hours'
);