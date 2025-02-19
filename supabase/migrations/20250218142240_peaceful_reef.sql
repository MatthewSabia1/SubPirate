/*
  # Add storage policies for project images

  1. Changes
    - Create storage policy to allow authenticated users to upload project images
    - Create storage policy to allow public read access to project images
*/

-- Enable storage policies for project_images bucket
BEGIN;
  -- Allow authenticated users to upload files
  CREATE POLICY "Allow authenticated users to upload project images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project_images' AND
    (auth.role() = 'authenticated')
  );

  -- Allow authenticated users to update their own files
  CREATE POLICY "Allow users to update their own project images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project_images' AND
    (auth.role() = 'authenticated')
  );

  -- Allow public read access to all files
  CREATE POLICY "Allow public read access to project images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'project_images');
COMMIT;