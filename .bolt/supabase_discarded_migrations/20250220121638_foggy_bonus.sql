-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own reddit posts" ON reddit_posts;
DROP POLICY IF EXISTS "Users can create reddit posts" ON reddit_posts;

-- Create new policies with proper checks
CREATE POLICY "Users can view own reddit posts"
  ON reddit_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reddit_accounts
      WHERE id = reddit_posts.reddit_account_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reddit posts"
  ON reddit_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reddit_accounts
      WHERE id = reddit_account_id
      AND user_id = auth.uid()
    )
  );

-- Add update policy
CREATE POLICY "Users can update own reddit posts"
  ON reddit_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reddit_accounts
      WHERE id = reddit_posts.reddit_account_id
      AND user_id = auth.uid()
    )
  );

-- Add delete policy
CREATE POLICY "Users can delete own reddit posts"
  ON reddit_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reddit_accounts
      WHERE id = reddit_posts.reddit_account_id
      AND user_id = auth.uid()
    )
  );