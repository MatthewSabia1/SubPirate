/*
  # Add subreddit post tracking

  1. New Columns
    - Add `total_posts_24h` to subreddits table to track posts in last 24 hours
    - Add `last_post_sync` to track when post count was last updated

  2. Functions
    - Create function to update subreddit post counts
    - Create trigger to automatically update counts when posts are added

  3. Views
    - Create view to calculate total posts across all accounts per subreddit
*/

-- Add post tracking columns to subreddits
ALTER TABLE subreddits
ADD COLUMN total_posts_24h integer DEFAULT 0,
ADD COLUMN last_post_sync timestamptz DEFAULT now();

-- Create function to update subreddit post counts
CREATE OR REPLACE FUNCTION update_subreddit_post_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update total posts in last 24 hours for the subreddit
  UPDATE subreddits
  SET 
    total_posts_24h = (
      SELECT COUNT(*)
      FROM reddit_posts
      WHERE subreddit_id = NEW.subreddit_id
      AND created_at > now() - interval '24 hours'
    ),
    last_post_sync = now()
  WHERE id = NEW.subreddit_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for subreddit post count updates
CREATE TRIGGER on_reddit_post_created_update_subreddit
  AFTER INSERT ON reddit_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_subreddit_post_count();

-- Create view for total posts per subreddit
CREATE OR REPLACE VIEW subreddit_post_stats AS
SELECT 
  s.id as subreddit_id,
  s.name as subreddit_name,
  COUNT(rp.id) as total_posts_24h,
  MAX(rp.created_at) as last_post_at
FROM subreddits s
LEFT JOIN reddit_posts rp ON rp.subreddit_id = s.id 
  AND rp.created_at > now() - interval '24 hours'
GROUP BY s.id, s.name;