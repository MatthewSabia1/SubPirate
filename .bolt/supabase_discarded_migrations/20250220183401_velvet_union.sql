/*
  # Fix get_subreddit_post_counts Function

  1. Changes
    - Drop existing function
    - Recreate with correct return type
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_subreddit_post_counts(uuid[]);

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