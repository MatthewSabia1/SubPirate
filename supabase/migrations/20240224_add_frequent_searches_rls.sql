-- Enable RLS
ALTER TABLE frequent_searches ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access"
ON frequent_searches
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to insert/update
CREATE POLICY "Allow authenticated insert"
ON frequent_searches
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
ON frequent_searches
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_frequent_searches_count_username 
ON frequent_searches (search_count DESC, username);

-- Add function to clean up old searches
CREATE OR REPLACE FUNCTION cleanup_old_searches()
RETURNS void AS $$
BEGIN
  -- Delete searches older than 30 days with count = 1
  DELETE FROM frequent_searches
  WHERE search_count = 1
  AND last_searched_at < NOW() - INTERVAL '30 days';
  
  -- Keep only top 1000 most searched users
  DELETE FROM frequent_searches
  WHERE id IN (
    SELECT id FROM frequent_searches
    ORDER BY search_count DESC, last_searched_at DESC
    OFFSET 1000
  );
END;
$$ LANGUAGE plpgsql; 