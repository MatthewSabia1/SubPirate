/*
  # Fix Project Policies

  1. Changes
    - Drop all existing project policies
    - Create simplified policies without recursion
    - Fix member access policies
    
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Ensure data integrity
*/

-- Drop all existing policies
DO $$ 
BEGIN
  -- Drop project policies
  DROP POLICY IF EXISTS "project_access_20250218_v2" ON projects;
  DROP POLICY IF EXISTS "project_create_20250218_v2" ON projects;
  DROP POLICY IF EXISTS "project_update_20250218_v2" ON projects;
  DROP POLICY IF EXISTS "project_delete_20250218_v2" ON projects;
  DROP POLICY IF EXISTS "project_select_v3" ON projects;
  DROP POLICY IF EXISTS "project_insert_v3" ON projects;
  DROP POLICY IF EXISTS "project_update_v3" ON projects;
  DROP POLICY IF EXISTS "project_delete_v3" ON projects;
  DROP POLICY IF EXISTS "project_select_final" ON projects;
  DROP POLICY IF EXISTS "project_insert_final" ON projects;
  DROP POLICY IF EXISTS "project_update_final" ON projects;
  DROP POLICY IF EXISTS "project_delete_final" ON projects;
  DROP POLICY IF EXISTS "projects_base_access" ON projects;
  DROP POLICY IF EXISTS "projects_member_access" ON projects;
  DROP POLICY IF EXISTS "projects_insert" ON projects;
  DROP POLICY IF EXISTS "projects_owner_update" ON projects;
  DROP POLICY IF EXISTS "projects_member_update" ON projects;
  DROP POLICY IF EXISTS "projects_owner_delete" ON projects;

  -- Drop member policies
  DROP POLICY IF EXISTS "member_access_20250218_v2" ON project_members;
  DROP POLICY IF EXISTS "member_create_20250218_v2" ON project_members;
  DROP POLICY IF EXISTS "member_update_20250218_v2" ON project_members;
  DROP POLICY IF EXISTS "member_delete_20250218_v2" ON project_members;
  DROP POLICY IF EXISTS "member_select_v3" ON project_members;
  DROP POLICY IF EXISTS "member_insert_v3" ON project_members;
  DROP POLICY IF EXISTS "member_update_v3" ON project_members;
  DROP POLICY IF EXISTS "member_delete_v3" ON project_members;
  DROP POLICY IF EXISTS "member_select_final" ON project_members;
  DROP POLICY IF EXISTS "member_insert_final" ON project_members;
  DROP POLICY IF EXISTS "member_update_final" ON project_members;
  DROP POLICY IF EXISTS "member_delete_final" ON project_members;
  DROP POLICY IF EXISTS "members_owner_access" ON project_members;
  DROP POLICY IF EXISTS "members_self_access" ON project_members;
END $$;

-- Create new simplified project policies
CREATE POLICY "view_own_projects"
  ON projects FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "create_projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "delete_own_projects"
  ON projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create new simplified project members policies
CREATE POLICY "view_project_members"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_members.project_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "manage_project_members"
  ON project_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_members.project_id
      AND user_id = auth.uid()
    )
  );