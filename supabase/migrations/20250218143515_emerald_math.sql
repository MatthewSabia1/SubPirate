/*
  # Project Sharing System

  1. New Tables
    - `project_members`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `user_id` (uuid, references profiles)
      - `role` (text, enum: 'read', 'edit', 'owner')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on new tables
    - Add policies for project member access
    - Add policies for role-based permissions
*/

-- Create enum for project member roles
CREATE TYPE project_role AS ENUM ('read', 'edit', 'owner');

-- Create project_members table
CREATE TABLE project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role project_role NOT NULL DEFAULT 'read',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Add trigger to automatically add project creator as owner
CREATE OR REPLACE FUNCTION handle_new_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION handle_new_project();

-- Enable RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Project members policies
CREATE POLICY "Users can view projects they are members of"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

CREATE POLICY "Project owners can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Project members policies
CREATE POLICY "Users can view project members"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage members"
  ON project_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_members.project_id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Project subreddits policies update
CREATE POLICY "Members with edit access can manage project subreddits"
  ON project_subreddits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_subreddits.project_id
      AND user_id = auth.uid()
      AND role IN ('edit', 'owner')
    )
  );

-- Create function to check user's project role
CREATE OR REPLACE FUNCTION get_project_role(project_uuid uuid)
RETURNS project_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role project_role;
BEGIN
  SELECT role INTO user_role
  FROM project_members
  WHERE project_id = project_uuid
  AND user_id = auth.uid();
  
  RETURN user_role;
END;
$$;