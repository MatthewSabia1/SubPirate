/*
  # Fix post count synchronization

  1. Changes
    - Add function to calculate and update post counts
    - Add trigger to update counts on post changes
    - Add function to get post counts for multiple subreddits
*/

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS update_post_counts() CASCADE;
DROP FUNCTION IF EXISTS get_subreddit_post_counts(uuid[]) CASCADE;

-- Create function to calculate post count
CREATE OR REPLACE FUNCTION calculate_post_count(subreddit_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_count integer;
BEGIN
  SELECT COUNT(DISTINCT rp.id)
  INTO post_count
  FROM reddit_posts rp
  WHERE rp.subreddit_id = subreddit_uuid
  AND rp.created_at > now() - interval '24 hours';
  
  RETURN COALESCE(post_count, 0);
END;
$$;

-- Create function to update post counts
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update total_posts_24h for the affected subreddit
  UPDATE subreddits
  SET 
    total_posts_24h = calculate_post_count(COALESCE(NEW.subreddit_id, OLD.subreddit_id)),
    last_post_sync = now()
  WHERE id = COALESCE(NEW.subreddit_id, OLD.subreddit_id);
  
  RETURN NULL;
END;
$$;

-- Create trigger for post count updates
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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Recalculate counts for all requested subreddits
  UPDATE subreddits s
  SET total_posts_24h = calculate_post_count(s.id)
  WHERE s.id = ANY(subreddit_ids);

  -- Return updated counts
  RETURN QUERY
  SELECT 
    s.id,
    s.total_posts_24h::bigint
  FROM subreddits s
  WHERE s.id = ANY(subreddit_ids);
END;
$$;