/*
  # Add Saved Subreddits Table

  1. New Tables
    - `saved_subreddits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `subreddit_id` (uuid, references subreddits)
      - `created_at` (timestamp)
      - `last_post_at` (timestamp, nullable)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create saved subreddits table
CREATE TABLE saved_subreddits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subreddit_id uuid REFERENCES subreddits(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_post_at timestamptz,
  UNIQUE(user_id, subreddit_id)
);

-- Enable RLS
ALTER TABLE saved_subreddits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their saved subreddits"
  ON saved_subreddits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can save subreddits"
  ON saved_subreddits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove saved subreddits"
  ON saved_subreddits FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());