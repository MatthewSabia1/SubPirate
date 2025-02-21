/*
  # Enhance Reddit Accounts Table

  1. Changes
    - Add avatar_url column for storing profile photos
    - Add total_posts column for tracking post count
    - Add posts_today column for tracking daily posts
    - Add last_karma_check column for tracking when karma was last updated
*/

ALTER TABLE reddit_accounts
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS total_posts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_today integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_karma_check timestamptz DEFAULT now();