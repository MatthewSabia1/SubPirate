/*
  # Fix storage bucket policies

  1. Changes
    - Create user_images bucket if it doesn't exist
    - Update storage policies to fix permission issues
    - Add proper RLS policies for bucket access

  2. Security
    - Restrict uploads to authenticated users
    - Enforce user-specific paths
    - Allow public read access
*/

-- Create user_images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('user_images', 'user_images')
ON CONFLICT DO NOTHING;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow users to upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to profile images" ON storage.objects;

-- Create new optimized policies
DO $$ 
BEGIN
  -- Allow authenticated users to upload their own profile images
  CREATE POLICY "user_images_insert_policy"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'user_images' AND
      auth.uid()::text = (regexp_match(name, '^([^/]+)/.*'))[1]
    );

  -- Allow users to update their own profile images
  CREATE POLICY "user_images_update_policy"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'user_images' AND
      auth.uid()::text = (regexp_match(name, '^([^/]+)/.*'))[1]
    );

  -- Allow users to delete their own profile images
  CREATE POLICY "user_images_delete_policy"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'user_images' AND
      auth.uid()::text = (regexp_match(name, '^([^/]+)/.*'))[1]
    );

  -- Allow public read access to all profile images
  CREATE POLICY "user_images_select_policy"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'user_images');
END $$;