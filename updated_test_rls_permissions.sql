-- Test script for verifying Row-Level Security policies
-- This can be run in the Supabase SQL editor to test the RLS permissions

-- Set the role to authenticated and use a specific user ID
-- Replace 'actual-user-uuid' with a real user ID from your database
SET LOCAL ROLE authenticated;
SET LOCAL SESSION AUTHORIZATION 'actual-user-uuid'; 

-- 1. Test user_usage_stats policies
-- Users should only see their own usage stats
SELECT * FROM user_usage_stats;

-- 2. Test saved subreddits policies
-- Users should only see their own saved subreddits
SELECT * FROM saved_subreddits;

-- View saved subreddits with icons - should only see the user's own saved subreddits
SELECT * FROM saved_subreddits_with_icons;

-- 3. Test projects policies
-- Users should see their own projects and projects they're members of
SELECT 
  p.*,
  CASE 
    WHEN p.user_id = auth.uid() THEN 'Owner'
    ELSE (SELECT role FROM project_members WHERE project_id = p.id AND user_id = auth.uid())
  END as role
FROM projects p;

-- Test the helper function for accessible projects
SELECT * FROM get_accessible_projects();

-- 4. Test project members policies
-- Get a project the user owns
DO $$
DECLARE
  owned_project_id UUID;
BEGIN
  -- Get a project ID owned by the current user
  SELECT id INTO owned_project_id FROM projects WHERE user_id = auth.uid() LIMIT 1;
  
  -- If user owns a project, check members
  IF owned_project_id IS NOT NULL THEN
    RAISE NOTICE 'Project members for owned project %:', owned_project_id;
    -- This query will run if a project is found
    EXECUTE 'SELECT * FROM project_members WHERE project_id = $1' USING owned_project_id;
  ELSE
    RAISE NOTICE 'Current user does not own any projects';
  END IF;
END $$;

-- 5. Test project subreddits policies
-- View project subreddits for projects the user is a member of or owns
SELECT 
  ps.*, 
  p.name as project_name, 
  s.name as subreddit_name,
  CASE 
    WHEN p.user_id = auth.uid() THEN 'Owner'
    ELSE (SELECT role FROM project_members WHERE project_id = p.id AND user_id = auth.uid())
  END as role
FROM 
  project_subreddits ps
JOIN 
  projects p ON ps.project_id = p.id
JOIN 
  subreddits s ON ps.subreddit_id = s.id;

-- 6. Test reddit accounts policies
-- Users should only see their own reddit accounts
SELECT * FROM reddit_accounts;

-- 7. Test reddit posts policies
-- Users should only see posts from their own reddit accounts
SELECT 
  rp.*, 
  ra.username as account_username, 
  s.name as subreddit_name 
FROM 
  reddit_posts rp
JOIN 
  reddit_accounts ra ON rp.reddit_account_id = ra.id
JOIN 
  subreddits s ON rp.subreddit_id = s.id;

-- Test the helper functions
DO $$
DECLARE
  some_project_id UUID;
  access_result BOOLEAN;
  role_result TEXT;
BEGIN
  -- Get the first project the user has access to
  SELECT id INTO some_project_id FROM projects WHERE user_id = auth.uid() LIMIT 1;
  
  -- If no owned project found, try to get a project they're a member of
  IF some_project_id IS NULL THEN
    SELECT project_id INTO some_project_id FROM project_members WHERE user_id = auth.uid() LIMIT 1;
  END IF;
  
  -- If we found a project, test the helper functions
  IF some_project_id IS NOT NULL THEN
    -- Test user_has_project_access function
    SELECT user_has_project_access(some_project_id) INTO access_result;
    RAISE NOTICE 'User has access to project %: %', some_project_id, access_result;
    
    -- Test get_project_role function
    SELECT get_project_role(some_project_id) INTO role_result;
    RAISE NOTICE 'User role in project %: %', some_project_id, role_result;
  ELSE
    RAISE NOTICE 'No projects found for testing helper functions';
  END IF;
END $$;

-- To test with another user:
-- RESET ROLE;
-- SET LOCAL ROLE authenticated;
-- SET LOCAL SESSION AUTHORIZATION 'another-user-uuid';
-- Then repeat the tests above 