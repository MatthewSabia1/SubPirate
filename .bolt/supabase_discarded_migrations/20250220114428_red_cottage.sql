-- Drop and recreate the subreddit post stats view with better post counting
DROP VIEW IF EXISTS subreddit_post_stats;

CREATE OR REPLACE VIEW subreddit_post_stats AS
WITH post_counts AS (
  SELECT 
    rp.subreddit_id,
    COUNT(*) as post_count,
    MAX(rp.created_at) as last_post_at
  FROM reddit_posts rp
  WHERE rp.created_at > now() - interval '24 hours'
  GROUP BY rp.subreddit_id
)
SELECT 
  s.id as subreddit_id,
  s.name as subreddit_name,
  COALESCE(pc.post_count, 0) as total_posts_24h,
  pc.last_post_at
FROM subreddits s
LEFT JOIN post_counts pc ON pc.subreddit_id = s.id;