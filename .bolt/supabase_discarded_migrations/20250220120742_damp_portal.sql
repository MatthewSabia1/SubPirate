/*
  # Add Reddit post syncing

  1. Changes
    - Add sync_interval column to reddit_accounts to control sync frequency
    - Add function to sync posts for a Reddit account
    - Add function to sync all accounts
*/

-- Add sync interval column
ALTER TABLE reddit_accounts
ADD COLUMN sync_interval interval DEFAULT interval '1 minute';

-- Create function to sync posts for a single account
CREATE OR REPLACE FUNCTION sync_reddit_account_posts(account_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_sync timestamptz;
  account_username text;
BEGIN
  -- Get account info
  SELECT username, last_post_sync INTO account_username, last_sync
  FROM reddit_accounts
  WHERE id = account_uuid;

  -- Only sync if enough time has passed
  IF last_sync + sync_interval > now() THEN
    RETURN;
  END IF;

  -- Update last sync time
  UPDATE reddit_accounts
  SET last_post_sync = now()
  WHERE id = account_uuid;

  -- Note: The actual post syncing happens in the application layer
  -- This function just manages the sync timing
END;
$$;

-- Create function to sync all accounts
CREATE OR REPLACE FUNCTION sync_all_reddit_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get accounts that need syncing
  FOR account IN 
    SELECT id 
    FROM reddit_accounts 
    WHERE last_post_sync + sync_interval <= now()
  LOOP
    PERFORM sync_reddit_account_posts(account.id);
  END LOOP;
END;
$$;

-- Schedule regular sync
SELECT cron.schedule(
  'sync-reddit-posts',
  '*/5 * * * *',  -- Every 5 minutes
  'SELECT sync_all_reddit_accounts()'
);