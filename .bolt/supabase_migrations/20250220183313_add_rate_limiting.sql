/*
  # Add Rate Limiting Fields to Reddit Accounts

  1. Changes
    - Add rate_limit_remaining to track remaining API calls
    - Add rate_limit_reset to track when rate limit resets
    - Create reddit_api_usage table for tracking API usage with endpoint hashing
*/

-- Add rate limiting fields
ALTER TABLE reddit_accounts
ADD COLUMN IF NOT EXISTS rate_limit_remaining integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS rate_limit_reset timestamptz DEFAULT now();

-- Create index for rate limit queries
CREATE INDEX IF NOT EXISTS idx_reddit_accounts_rate_limit ON reddit_accounts (rate_limit_remaining, rate_limit_reset)
WHERE is_active = true;

-- Create reddit_api_usage table
CREATE TABLE IF NOT EXISTS reddit_api_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reddit_account_id uuid REFERENCES reddit_accounts(id) ON DELETE CASCADE,
  endpoint_hash varchar(32) NOT NULL,
  endpoint text NOT NULL,
  requests_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  reset_at timestamptz DEFAULT now() + interval '1 hour',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Add constraint to limit text length
  CONSTRAINT endpoint_length CHECK (length(endpoint) <= 1024),
  
  -- Create unique constraint on account + endpoint hash
  UNIQUE (reddit_account_id, endpoint_hash)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_reddit_api_usage_lookup 
ON reddit_api_usage (reddit_account_id, endpoint_hash, window_start);

-- Create function to reset rate limits
CREATE OR REPLACE FUNCTION reset_rate_limits()
RETURNS trigger AS $$
BEGIN
  -- Reset rate limit if reset time has passed
  IF NEW.rate_limit_reset <= now() THEN
    NEW.rate_limit_remaining := 60;
    NEW.rate_limit_reset := now() + interval '1 minute';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-reset rate limits
DROP TRIGGER IF EXISTS auto_reset_rate_limits ON reddit_accounts;
CREATE TRIGGER auto_reset_rate_limits
  BEFORE UPDATE ON reddit_accounts
  FOR EACH ROW
  EXECUTE FUNCTION reset_rate_limits(); 