/*
  # Fix saved subreddits view and add delete trigger

  1. Changes
    - Recreate saved_subreddits_with_icons view with analysis_data
    - Add INSTEAD OF DELETE trigger to handle deletions
    - Add proper indexes for performance

  2. Security
    - Maintains existing RLS policies
    - View inherits security from base tables
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS saved_subreddits_with_icons;

-- Recreate view with all necessary fields
CREATE VIEW saved_subreddits_with_icons AS
SELECT 
  ss.id,
  ss.user_id,
  ss.created_at,
  s.id as subreddit_id,
  s.name,
  s.subscriber_count,
  s.active_users,
  s.marketing_friendly_score,
  s.allowed_content,
  s.icon_img,
  s.community_icon,
  s.analysis_data
FROM saved_subreddits ss
JOIN subreddits s ON ss.subreddit_id = s.id;

-- Create function for delete trigger
CREATE OR REPLACE FUNCTION delete_saved_subreddit()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM saved_subreddits WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create INSTEAD OF DELETE trigger
DROP TRIGGER IF EXISTS tr_delete_saved_subreddit ON saved_subreddits_with_icons;
CREATE TRIGGER tr_delete_saved_subreddit
  INSTEAD OF DELETE ON saved_subreddits_with_icons
  FOR EACH ROW
  EXECUTE FUNCTION delete_saved_subreddit();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_subreddits_user_id ON saved_subreddits(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_subreddits_subreddit_id ON saved_subreddits(subreddit_id);
CREATE INDEX IF NOT EXISTS idx_subreddits_name ON subreddits(name);