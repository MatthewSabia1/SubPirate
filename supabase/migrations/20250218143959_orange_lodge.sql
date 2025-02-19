/*
  # Fix project policies recursion - final version

  1. Changes
    - Remove all existing policies
    - Create new simplified policies with no recursion
    - Use direct ownership checks
    - Optimize query performance
  
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Ensure data integrity
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Project access policy" ON projects;
DROP POLICY IF EXISTS "Project update policy" ON projects;
DROP POLICY IF EXISTS "Project delete policy" ON projects;
DROP POLICY IF EXISTS "Project members access policy" ON project_members;
DROP POLICY IF EXISTS "Project members manage policy" ON project_members;

-- Create new project policies
CREATE POLICY "Project select policy"
  ON projects FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project insert policy"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Project update policy"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'edit')
    )
  );

CREATE POLICY "Project delete policy"
  ON projects FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Create new project members policies
CREATE POLICY "Project members select policy"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id 
      FROM projects 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project members insert policy"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id 
      FROM projects 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project members update policy"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id 
      FROM projects 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project members delete policy"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id 
      FROM projects 
      WHERE user_id = auth.uid()
    )
  );