-- Drop and recreate the subreddit post stats view with better post counting
DROP VIEW IF EXISTS subreddit_post_stats;

CREATE OR REPLACE VIEW subreddit_post_stats AS
WITH post_counts AS (
  SELECT 
    s.id as subreddit_id,
    COUNT(DISTINCT rp.id) as post_count,
    MAX(rp.created_at) as last_post_at
  FROM subreddits s
  LEFT JOIN reddit_posts rp ON rp.subreddit_id = s.id 
    AND rp.created_at > now() - interval '24 hours'
  GROUP BY s.id
)
SELECT 
  s.id as subreddit_id,
  s.name as subreddit_name,
  COALESCE(pc.post_count, 0) as total_posts_24h,
  pc.last_post_at
FROM subreddits s
LEFT JOIN post_counts pc ON pc.subreddit_id = s.id;