-- Test script for verifying Row-Level Security policies
-- This can be run in the Supabase SQL editor to test the RLS permissions

-- 1. Test saved subreddits policies
-- Set the role to an authenticated user (replace with an actual user ID from your database)
SET LOCAL ROLE authenticated;
SET LOCAL SESSION AUTHORIZATION 'auth.uid()'; -- Replace with actual user ID

-- View saved subreddits - should only see the user's own saved subreddits
SELECT * FROM saved_subreddits;

-- View saved subreddits with icons - should only see the user's own saved subreddits
SELECT * FROM saved_subreddits_with_icons;

-- 2. Test projects policies
-- View projects - should see only the user's own projects or projects they are a member of
SELECT * FROM projects;

-- 3. Test project members policies
-- Create a variable to store a project ID the user owns
DO $$
DECLARE
  owned_project_id UUID;
BEGIN
  -- Get a project ID owned by the current user
  SELECT id INTO owned_project_id FROM projects WHERE user_id = auth.uid() LIMIT 1;
  
  -- View project members for that project
  RAISE NOTICE 'Project members for owned project %:', owned_project_id;
  
  -- The rest of the testing would happen here
END $$;

-- 4. Test project subreddits policies
-- View project subreddits for projects the user is a member of
SELECT 
  ps.*, 
  p.name as project_name, 
  s.name as subreddit_name 
FROM 
  project_subreddits ps
JOIN 
  projects p ON ps.project_id = p.id
JOIN 
  subreddits s ON ps.subreddit_id = s.id;

-- 5. Test reddit accounts policies
-- View reddit accounts - should only see the user's own accounts
SELECT * FROM reddit_accounts;

-- 6. Test reddit posts policies
-- View reddit posts - should only see posts from the user's accounts
SELECT 
  rp.*, 
  ra.username as account_name, 
  s.name as subreddit_name 
FROM 
  reddit_posts rp
JOIN 
  reddit_accounts ra ON rp.reddit_account_id = ra.id
JOIN 
  subreddits s ON rp.subreddit_id = s.id;

-- Test with a different user (for admin testing only)
-- RESET ROLE;
-- SET LOCAL ROLE authenticated;
-- SET LOCAL SESSION AUTHORIZATION 'another-user-id'; -- Replace with different user ID
-- Repeat the tests above to verify different results 