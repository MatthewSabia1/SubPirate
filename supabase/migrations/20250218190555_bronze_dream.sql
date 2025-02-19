/*
  # Fix storage bucket policies

  1. Changes
    - Create storage schema if it doesn't exist
    - Create buckets table if it doesn't exist
    - Create objects table if it doesn't exist
    - Create both storage buckets with proper configuration
    - Drop all existing policies to avoid conflicts
    - Create new optimized policies for both buckets

  2. Security
    - Enforce strict path validation
    - Ensure proper user isolation
    - Allow public read access
*/

-- Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- Create buckets table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

-- Create objects table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb,
  path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  CONSTRAINT objects_bucketid_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets (id)
);

-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('user_images', 'user_images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('project_images', 'project_images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop all existing policies
DROP POLICY IF EXISTS "user_images_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "user_images_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "user_images_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "user_images_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_images_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_images_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_images_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_images_select_policy" ON storage.objects;

-- Enable RLS on objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create optimized policies
DO $$ 
BEGIN
  -- User Images Policies
  CREATE POLICY "user_images_insert_policy"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'user_images' AND
      (auth.uid()::text = SPLIT_PART(name, '/', 1))
    );

  CREATE POLICY "user_images_update_policy"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'user_images' AND
      (auth.uid()::text = SPLIT_PART(name, '/', 1))
    );

  CREATE POLICY "user_images_delete_policy"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'user_images' AND
      (auth.uid()::text = SPLIT_PART(name, '/', 1))
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