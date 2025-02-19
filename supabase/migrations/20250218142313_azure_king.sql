/*
  # Add image_url column to projects table

  1. Changes
    - Add image_url column to projects table to store project image URLs
*/

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS image_url text;