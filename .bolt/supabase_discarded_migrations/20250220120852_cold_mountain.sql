/*
  # Fix Reddit account sync function

  1. Changes
    - Fix SQL syntax in sync_all_reddit_accounts function
    - Add proper variable declaration
*/

-- Drop existing function
DROP FUNCTION IF EXISTS sync_all_reddit_accounts();

-- Create fixed function
CREATE OR REPLACE FUNCTION sync_all_reddit_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_record RECORD;
BEGIN
  -- Get accounts that need syncing
  FOR account_record IN 
    SELECT id 
    FROM reddit_accounts 
    WHERE last_post_sync + sync_interval <= now()
  LOOP
    PERFORM sync_reddit_account_posts(account_record.id);
  END LOOP;
END;
$$;