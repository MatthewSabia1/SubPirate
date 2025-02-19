/*
  # Final Storage System Fix

  1. Changes
    - Drop all existing storage policies
    - Recreate storage schema and tables if needed
    - Set up buckets with proper configuration
    - Create optimized policies with proper path validation

  2. Security
    - Enforce proper user isolation
    - Allow public read access
    - Set file size limits and MIME types
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "user_images_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "user_images_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "user_images_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "user_images_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_images_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_images_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_images_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "project_images_select_policy" ON storage.objects;

-- Ensure storage schema exists
CREATE SCHEMA IF NOT EXISTS storage;

-- Recreate buckets table
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

-- Recreate objects table
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb,
  path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  version text
);

-- Set up buckets with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('user_images', 'user_images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('project_images', 'project_images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS
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
      owner = auth.uid() AND
      (SPLIT_PART(name, '/', 1) = auth.uid()::text)
    );

  CREATE POLICY "user_images_update_policy"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'user_images' AND
      owner = auth.uid() AND
      (SPLIT_PART(name, '/', 1) = auth.uid()::text)
    );

  CREATE POLICY "user_images_delete_policy"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'user_images' AND
      owner = auth.uid() AND
      (SPLIT_PART(name, '/', 1) = auth.uid()::text)
    );

  CREATE POLICY "user_images_select_policy"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'user_images');

  -- Project Images Policies
  CREATE POLICY "project_images_insert_policy"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'project_images' AND
      owner = auth.uid()
    );

  CREATE POLICY "project_images_update_policy"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'project_images' AND
      owner = auth.uid()
    );

  CREATE POLICY "project_images_delete_policy"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'project_images' AND
      owner = auth.uid()
    );

  CREATE POLICY "project_images_select_policy"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'project_images');
END $$;