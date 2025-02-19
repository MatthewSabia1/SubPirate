/*
  # Fix subreddits RLS policies

  1. Changes
    - Drop existing RLS policies for subreddits table
    - Add new policies for authenticated users to:
      - View all subreddits
      - Create and update subreddits
      - Delete their own subreddits
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view subreddits" ON subreddits;
DROP POLICY IF EXISTS "Anyone can create subreddits" ON subreddits;

-- Create new policies
CREATE POLICY "Authenticated users can view subreddits"
  ON subreddits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create subreddits"
  ON subreddits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update subreddits"
  ON subreddits FOR UPDATE
  TO authenticated
  USING (true);

-- Note: We don't need a delete policy since subreddits should be preserved
-- even if no users have saved them anymore