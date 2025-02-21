/*
  # Add total_posts_24h column to subreddits

  1. Changes
    - Add total_posts_24h column to subreddits table
    - Add trigger to update total_posts_24h when posts are added/removed
    - Add function to calculate total posts in last 24 hours
*/

-- Add total_posts_24h column if it doesn't exist
ALTER TABLE subreddits
ADD COLUMN IF NOT EXISTS total_posts_24h integer DEFAULT 0;

-- Create function to calculate total posts
CREATE OR REPLACE FUNCTION calculate_subreddit_total_posts_24h(subreddit_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total integer;
BEGIN
  SELECT COUNT(DISTINCT rp.id)
  INTO total
  FROM reddit_posts rp
  WHERE rp.subreddit_id = subreddit_uuid
  AND rp.created_at > now() - interval '24 hours';
  
  RETURN COALESCE(total, 0);
END;
$$;

-- Create trigger function to update total_posts_24h
CREATE OR REPLACE FUNCTION update_subreddit_total_posts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update total_posts_24h for the affected subreddit
    UPDATE subreddits
    SET total_posts_24h = calculate_subreddit_total_posts_24h(NEW.subreddit_id)
    WHERE id = NEW.subreddit_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update total_posts_24h for the affected subreddit
    UPDATE subreddits
    SET total_posts_24h = calculate_subreddit_total_posts_24h(OLD.subreddit_id)
    WHERE id = OLD.subreddit_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for post count updates
DROP TRIGGER IF EXISTS update_subreddit_total_posts_trigger ON reddit_posts;
CREATE TRIGGER update_subreddit_total_posts_trigger
  AFTER INSERT OR DELETE ON reddit_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_subreddit_total_posts();

-- Update existing total_posts_24h values
UPDATE subreddits
SET total_posts_24h = (
  SELECT COUNT(DISTINCT rp.id)
  FROM reddit_posts rp
  WHERE rp.subreddit_id = subreddits.id
  AND rp.created_at > now() - interval '24 hours'
);