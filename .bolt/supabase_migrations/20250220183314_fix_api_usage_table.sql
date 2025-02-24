/*
  # Fix API Usage Table Structure

  1. Changes
    - Add endpoint_hash column
    - Migrate existing data
    - Add proper constraints and indexes
    - Add increment function for atomic updates
*/

-- Drop existing indexes and constraints
DROP INDEX IF EXISTS idx_reddit_api_usage_lookup;
ALTER TABLE reddit_api_usage DROP CONSTRAINT IF EXISTS reddit_api_usage_pkey CASCADE;
ALTER TABLE reddit_api_usage DROP CONSTRAINT IF EXISTS reddit_api_usage_reddit_account_id_endpoint_key CASCADE;
ALTER TABLE reddit_api_usage DROP CONSTRAINT IF EXISTS reddit_api_usage_account_endpoint_hash_key CASCADE;

-- Add endpoint_hash column
ALTER TABLE reddit_api_usage 
ADD COLUMN IF NOT EXISTS endpoint_hash varchar(32);

-- Update existing records with hash values
UPDATE reddit_api_usage 
SET endpoint_hash = encode(digest(endpoint, 'md5'), 'hex')
WHERE endpoint_hash IS NULL;

-- Make endpoint_hash NOT NULL after migration
ALTER TABLE reddit_api_usage 
ALTER COLUMN endpoint_hash SET NOT NULL;

-- Add new primary key
ALTER TABLE reddit_api_usage
ADD PRIMARY KEY (id);

-- Add unique constraint on account + endpoint hash
ALTER TABLE reddit_api_usage
ADD CONSTRAINT reddit_api_usage_account_endpoint_hash_key 
UNIQUE (reddit_account_id, endpoint_hash);

-- Recreate the lookup index
CREATE INDEX IF NOT EXISTS idx_reddit_api_usage_lookup 
ON reddit_api_usage (reddit_account_id, endpoint_hash, window_start);

-- Add trigger to automatically set endpoint_hash
CREATE OR REPLACE FUNCTION set_endpoint_hash()
RETURNS trigger AS $$
BEGIN
  NEW.endpoint_hash := encode(digest(NEW.endpoint, 'md5'), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_set_endpoint_hash ON reddit_api_usage;
CREATE TRIGGER auto_set_endpoint_hash
  BEFORE INSERT OR UPDATE OF endpoint ON reddit_api_usage
  FOR EACH ROW
  EXECUTE FUNCTION set_endpoint_hash();

-- Add function for atomic increments
CREATE OR REPLACE FUNCTION increment_requests_count(row_id uuid, amount int)
RETURNS void AS $$
BEGIN
  UPDATE reddit_api_usage
  SET requests_count = requests_count + amount
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql; 