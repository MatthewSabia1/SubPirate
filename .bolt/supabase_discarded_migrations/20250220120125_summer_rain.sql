/*
  # Add real-time post tracking

  1. Changes
    - Add real-time post tracking with triggers
    - Add post count materialized view that updates instantly
    - Add function to refresh post counts
    - Remove hourly cleanup job

  2. Security
    - All functions run with SECURITY DEFINER
    - RLS policies remain unchanged
*/

-- Drop existing cleanup function and job
DROP FUNCTION IF EXISTS cleanup_old_posts_and_update_counts();
SELECT cron.unschedule('cleanup-old-posts');

-- Create materialized view for post counts
CREATE MATERIALIZED VIEW post_counts_mv AS
SELECT 
  s.id as subreddit_id,
  COUNT(DISTINCT rp.id) as total_posts_24h
FROM subreddits s
LEFT JOIN reddit_posts rp ON rp.subreddit_id = s.id 
  AND rp.created_at > now() - interval '24 hours'
GROUP BY s.id;

-- Create index for faster lookups
CREATE UNIQUE INDEX post_counts_mv_subreddit_id_idx ON post_counts_mv (subreddit_id);

-- Create function to refresh post counts for a specific subreddit
CREATE OR REPLACE FUNCTION refresh_subreddit_post_count(subreddit_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Lock the materialized view for concurrent refresh
  LOCK TABLE post_counts_mv IN SHARE MODE;
  
  -- Refresh post count for specific subreddit
  WITH new_counts AS (
    SELECT 
      s.id as subreddit_id,
      COUNT(DISTINCT rp.id) as total_posts_24h
    FROM subreddits s
    LEFT JOIN reddit_posts rp ON rp.subreddit_id = s.id 
      AND rp.created_at > now() - interval '24 hours'
    WHERE s.id = subreddit_uuid
    GROUP BY s.id
  )
  UPDATE post_counts_mv mv
  SET total_posts_24h = nc.total_posts_24h
  FROM new_counts nc
  WHERE mv.subreddit_id = nc.subreddit_id;

  -- Update the subreddit's total_posts_24h column
  UPDATE subreddits
  SET total_posts_24h = (
    SELECT total_posts_24h 
    FROM post_counts_mv 
    WHERE subreddit_id = subreddits.id
  )
  WHERE id = subreddit_uuid;
END;
$$;

-- Create trigger function for real-time updates
CREATE OR REPLACE FUNCTION update_post_counts_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For inserts, refresh count for the new post's subreddit
  IF TG_OP = 'INSERT' THEN
    PERFORM refresh_subreddit_post_count(NEW.subreddit_id);
  -- For deletes, refresh count for the old post's subreddit
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM refresh_subreddit_post_count(OLD.subreddit_id);
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for real-time post count updates
DROP TRIGGER IF EXISTS realtime_post_counts_trigger ON reddit_posts;
CREATE TRIGGER realtime_post_counts_trigger
  AFTER INSERT OR DELETE ON reddit_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_counts_trigger();

-- Create function to clean up old posts for a subreddit
CREATE OR REPLACE FUNCTION cleanup_old_posts(subreddit_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete posts older than 24 hours
  DELETE FROM reddit_posts
  WHERE subreddit_id = subreddit_uuid
  AND created_at < now() - interval '24 hours';
  
  -- Refresh post count
  PERFORM refresh_subreddit_post_count(subreddit_uuid);
END;
$$;

-- Create trigger function for cleaning up old posts
CREATE OR REPLACE FUNCTION cleanup_old_posts_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Schedule cleanup for affected subreddit
  PERFORM cleanup_old_posts(
    CASE 
      WHEN TG_OP = 'INSERT' THEN NEW.subreddit_id
      WHEN TG_OP = 'DELETE' THEN OLD.subreddit_id
    END
  );
  RETURN NULL;
END;
$$;

-- Create trigger for cleaning up old posts
DROP TRIGGER IF EXISTS cleanup_old_posts_trigger ON reddit_posts;
CREATE TRIGGER cleanup_old_posts_trigger
  AFTER INSERT OR DELETE ON reddit_posts
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_posts_trigger();

-- Do initial refresh of post counts
REFRESH MATERIALIZED VIEW CONCURRENTLY post_counts_mv;