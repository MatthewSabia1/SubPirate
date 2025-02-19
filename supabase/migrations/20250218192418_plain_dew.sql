-- Add icon columns to subreddits table
ALTER TABLE subreddits
ADD COLUMN IF NOT EXISTS icon_img text,
ADD COLUMN IF NOT EXISTS community_icon text;

-- Update saved_subreddits query to include icon fields
CREATE OR REPLACE VIEW saved_subreddits_with_icons AS
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
  s.community_icon
FROM saved_subreddits ss
JOIN subreddits s ON ss.subreddit_id = s.id;