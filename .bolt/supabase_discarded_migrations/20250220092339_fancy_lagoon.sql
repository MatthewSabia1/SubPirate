/*
  # Fix Reddit Accounts RLS Policies

  1. Changes
    - Add RLS policies for reddit_accounts table to allow users to manage their own accounts
*/

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view own reddit accounts" ON reddit_accounts;
DROP POLICY IF EXISTS "Users can create reddit accounts" ON reddit_accounts;
DROP POLICY IF EXISTS "Users can update own reddit accounts" ON reddit_accounts;
DROP POLICY IF EXISTS "Users can delete own reddit accounts" ON reddit_accounts;

-- Create new policies
CREATE POLICY "Users can view own reddit accounts"
  ON reddit_accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create reddit accounts"
  ON reddit_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reddit accounts"
  ON reddit_accounts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own reddit accounts"
  ON reddit_accounts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());