-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_subreddit_post_counts(uuid[]);

-- Create optimized function to get post counts
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