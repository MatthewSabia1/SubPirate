/*
  # Fix storage bucket policies

  1. Changes
    - Create both storage buckets if they don't exist
    - Drop all existing policies to avoid conflicts
    - Create new optimized policies for both buckets
    - Fix path validation and permissions

  2. Security
    - Enforce strict path validation
    - Ensure proper user isolation
    - Allow public read access
*/

-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('user_images', 'user_images', true),
  ('project_images', 'project_images', true)
ON CONFLICT DO NOTHING;

-- Drop all existing policies
DROP POLICY IF EXISTS "user_images_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "user_images_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "user_images_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "user_images_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_images_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_images_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_images_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_images_select_policy" ON storage.objects;

-- Create optimized policies
DO $$ 
BEGIN
  -- User Images Policies
  CREATE POLICY "user_images_insert_policy"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'user_images' AND
      (auth.uid() = CAST(SPLIT_PART(name, '/', 1) AS uuid))
    );

  CREATE POLICY "user_images_update_policy"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'user_images' AND
      (auth.uid() = CAST(SPLIT_PART(name, '/', 1) AS uuid))
    );

  CREATE POLICY "user_images_delete_policy"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'user_images' AND
      (auth.uid() = CAST(SPLIT_PART(name, '/', 1) AS uuid))
    );

  CREATE POLICY "user_images_select_policy"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'user_images');

  -- Project Images Policies
  CREATE POLICY "project_images_insert_policy"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'project_images');

  CREATE POLICY "project_images_update_policy"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'project_images');

  CREATE POLICY "project_images_delete_policy"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'project_images');

  CREATE POLICY "project_images_select_policy"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'project_images');
END $$;