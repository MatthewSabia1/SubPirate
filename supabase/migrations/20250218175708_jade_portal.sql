/*
  # Add last_post_at to project_subreddits

  1. Changes
    - Add last_post_at column to project_subreddits table
*/

ALTER TABLE project_subreddits
ADD COLUMN IF NOT EXISTS last_post_at timestamptz;