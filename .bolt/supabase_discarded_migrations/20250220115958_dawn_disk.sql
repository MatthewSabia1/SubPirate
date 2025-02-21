-- Create function to clean up old posts and update counts
CREATE OR REPLACE FUNCTION cleanup_old_posts_and_update_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete posts older than 24 hours
  DELETE FROM reddit_posts
  WHERE created_at < now() - interval '24 hours';

  -- Update total_posts_24h for all subreddits
  UPDATE subreddits
  SET total_posts_24h = (
    SELECT COUNT(DISTINCT rp.id)
    FROM reddit_posts rp
    WHERE rp.subreddit_id = subreddits.id
    AND rp.created_at > now() - interval '24 hours'
  );
END;
$$;

-- Create cron job to run cleanup every hour
SELECT cron.schedule(
  'cleanup-old-posts',
  '0 * * * *', -- Run at minute 0 of every hour
  'SELECT cleanup_old_posts_and_update_counts()'
);

-- Run initial cleanup and count update
SELECT cleanup_old_posts_and_update_counts();