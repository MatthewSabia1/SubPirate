/*
  # Add post count function and fix post tracking

  1. New Functions
    - `get_subreddit_post_counts`: Returns post counts for multiple subreddits
    - `update_post_counts`: Updates post counts for subreddits

  2. Changes
    - Add post count caching
    - Add real-time post count updates
*/

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

-- Create function to update post counts
CREATE OR REPLACE FUNCTION update_post_counts(subreddit_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update post counts for specified subreddits
  UPDATE subreddits s
  SET total_posts_24h = pc.post_count
  FROM (
    SELECT 
      rp.subreddit_id,
      COUNT(DISTINCT rp.id) as post_count
    FROM reddit_posts rp
    WHERE rp.subreddit_id = ANY(subreddit_ids)
    AND rp.created_at > now() - interval '24 hours'
    GROUP BY rp.subreddit_id
  ) pc
  WHERE s.id = pc.subreddit_id;
END;
$$;