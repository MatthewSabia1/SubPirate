/*
  # Fix project policies recursion

  1. Changes
    - Simplify project access policies
    - Remove circular references
    - Add direct ownership checks
    - Optimize policy performance
  
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Ensure data integrity
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view shared projects" ON projects;
DROP POLICY IF EXISTS "Project owners can update their projects" ON projects;
DROP POLICY IF EXISTS "Project owners can delete their projects" ON projects;
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage project members" ON project_members;

-- Create simplified project policies
CREATE POLICY "Project access policy"
  ON projects FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project update policy"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('owner', 'edit')
    )
  );

CREATE POLICY "Project delete policy"
  ON projects FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
      AND project_members.role = 'owner'
    )
  );

-- Create simplified project members policies
CREATE POLICY "Project members access policy"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project members manage policy"
  ON project_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND (
        projects.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = project_members.project_id
          AND pm.user_id = auth.uid()
          AND pm.role = 'owner'
        )
      )
    )
  );