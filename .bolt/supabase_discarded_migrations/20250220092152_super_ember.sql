/*
  # Add karma score to reddit accounts

  1. Changes
    - Add karma_score column to reddit_accounts table
*/

ALTER TABLE reddit_accounts
ADD COLUMN IF NOT EXISTS karma_score integer DEFAULT 0;