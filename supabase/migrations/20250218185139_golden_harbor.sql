-- Add profile image URL column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS image_url text;

-- Enable storage policies for user_images bucket
BEGIN;
  -- Allow authenticated users to upload their own profile images
  CREATE POLICY "Allow users to upload their own profile images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user_images' AND
    (auth.uid())::text = SPLIT_PART(name, '/', 1)
  );

  -- Allow users to update their own profile images
  CREATE POLICY "Allow users to update their own profile images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user_images' AND
    (auth.uid())::text = SPLIT_PART(name, '/', 1)
  );

  -- Allow users to delete their own profile images
  CREATE POLICY "Allow users to delete their own profile images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user_images' AND
    (auth.uid())::text = SPLIT_PART(name, '/', 1)
  );

  -- Allow public read access to all profile images
  CREATE POLICY "Allow public read access to profile images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'user_images');
COMMIT;