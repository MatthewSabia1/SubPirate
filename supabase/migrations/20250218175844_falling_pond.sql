/*
  # Add email to profiles table

  1. Changes
    - Add email column to profiles table
    - Add trigger to copy email from auth.users
*/

-- Add email column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email text;

-- Update handle_new_user function to copy email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;