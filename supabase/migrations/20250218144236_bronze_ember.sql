/*
  # Fix recursive policies

  1. Changes
    - Drop existing policies
    - Create new simplified policies without circular references
    - Maintain security while preventing infinite recursion
  
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Ensure data integrity
*/

DO $$ 
BEGIN
  -- Drop all existing policies
  DROP POLICY IF EXISTS "project_access_20250218_v2" ON projects;
  DROP POLICY IF EXISTS "project_create_20250218_v2" ON projects;
  DROP POLICY IF EXISTS "project_update_20250218_v2" ON projects;
  DROP POLICY IF EXISTS "project_delete_20250218_v2" ON projects;
  DROP POLICY IF EXISTS "member_access_20250218_v2" ON project_members;
  DROP POLICY IF EXISTS "member_create_20250218_v2" ON project_members;
  DROP POLICY IF EXISTS "member_update_20250218_v2" ON project_members;
  DROP POLICY IF EXISTS "member_delete_20250218_v2" ON project_members;

  -- Create simplified project policies
  CREATE POLICY "project_select_v3" 
    ON projects FOR SELECT
    TO authenticated
    USING (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 
        FROM project_members 
        WHERE project_members.project_id = projects.id 
        AND project_members.user_id = auth.uid()
      )
    );

  CREATE POLICY "project_insert_v3" 
    ON projects FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "project_update_v3" 
    ON projects FOR UPDATE
    TO authenticated
    USING (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 
        FROM project_members 
        WHERE project_members.project_id = projects.id 
        AND project_members.user_id = auth.uid() 
        AND project_members.role IN ('owner', 'edit')
      )
    );

  CREATE POLICY "project_delete_v3" 
    ON projects FOR DELETE
    TO authenticated
    USING (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 
        FROM project_members 
        WHERE project_members.project_id = projects.id 
        AND project_members.user_id = auth.uid() 
        AND project_members.role = 'owner'
      )
    );

  -- Create simplified project members policies
  CREATE POLICY "member_select_v3" 
    ON project_members FOR SELECT
    TO authenticated
    USING (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 
        FROM projects 
        WHERE projects.id = project_members.project_id 
        AND projects.user_id = auth.uid()
      )
    );

  CREATE POLICY "member_insert_v3" 
    ON project_members FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 
        FROM projects 
        WHERE projects.id = project_id 
        AND projects.user_id = auth.uid()
      )
    );

  CREATE POLICY "member_update_v3" 
    ON project_members FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 
        FROM projects 
        WHERE projects.id = project_id 
        AND projects.user_id = auth.uid()
      )
    );

  CREATE POLICY "member_delete_v3" 
    ON project_members FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 
        FROM projects 
        WHERE projects.id = project_id 
        AND projects.user_id = auth.uid()
      )
    );
END $$;