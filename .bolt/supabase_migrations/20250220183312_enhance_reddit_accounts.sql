/*
  # Enhance Reddit Accounts Table

  1. Changes
    - Add karma breakdown fields
    - Add profile data fields
    - Add account stats fields
*/

-- Add karma breakdown fields
ALTER TABLE reddit_accounts
ADD COLUMN IF NOT EXISTS link_karma integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_karma integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS awardee_karma integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS awarder_karma integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_karma integer DEFAULT 0;

-- Add profile data fields
ALTER TABLE reddit_accounts
ADD COLUMN IF NOT EXISTS is_gold boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_mod boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_verified_email boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_utc timestamptz;

-- Update karma_score to be computed from link and comment karma
CREATE OR REPLACE FUNCTION update_karma_score()
RETURNS trigger AS $$
BEGIN
  NEW.karma_score = COALESCE(NEW.link_karma, 0) + COALESCE(NEW.comment_karma, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update karma_score
DROP TRIGGER IF EXISTS update_karma_score_trigger ON reddit_accounts;
CREATE TRIGGER update_karma_score_trigger
  BEFORE INSERT OR UPDATE OF link_karma, comment_karma ON reddit_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_karma_score(); 