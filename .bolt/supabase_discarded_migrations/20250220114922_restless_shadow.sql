-- Create function to get post counts for multiple subreddits
CREATE OR REPLACE FUNCTION get_subreddit_post_counts(subreddit_ids uuid[])
RETURNS TABLE (
  subreddit_id uuid,
  post_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    COUNT(DISTINCT rp.id)::bigint as post_count
  FROM subreddits s
  LEFT JOIN reddit_posts rp ON rp.subreddit_id = s.id 
    AND rp.created_at > now() - interval '24 hours'
  WHERE s.id = ANY(subreddit_ids)
  GROUP BY s.id;
END;
$$;