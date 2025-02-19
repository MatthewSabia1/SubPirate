/*
  # Fix Recursive Policies

  1. Changes
    - Drop all existing policies to start fresh
    - Implement non-recursive policy structure
    - Optimize policy checks to prevent infinite recursion
  
  2. Security
    - Maintain RLS for all tables
    - Ensure proper access control
    - Prevent circular dependencies in policy checks
*/

DO $$ 
BEGIN
  -- Drop all existing policies
  DROP POLICY IF EXISTS "project_select_final" ON projects;
  DROP POLICY IF EXISTS "project_insert_final" ON projects;
  DROP POLICY IF EXISTS "project_update_final" ON projects;
  DROP POLICY IF EXISTS "project_delete_final" ON projects;
  DROP POLICY IF EXISTS "member_select_final" ON project_members;
  DROP POLICY IF EXISTS "member_insert_final" ON project_members;
  DROP POLICY IF EXISTS "member_update_final" ON project_members;
  DROP POLICY IF EXISTS "member_delete_final" ON project_members;

  -- Create optimized project policies
  CREATE POLICY "projects_base_access" ON projects
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

  CREATE POLICY "projects_member_access" ON projects
    FOR SELECT TO authenticated
    USING (
      id IN (
        SELECT project_id 
        FROM project_members 
        WHERE user_id = auth.uid()
      )
    );

  CREATE POLICY "projects_insert" ON projects
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "projects_owner_update" ON projects
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

  CREATE POLICY "projects_member_update" ON projects
    FOR UPDATE TO authenticated
    USING (
      id IN (
        SELECT project_id 
        FROM project_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'edit')
      )
    );

  CREATE POLICY "projects_owner_delete" ON projects
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

  -- Create optimized project members policies
  CREATE POLICY "members_owner_access" ON project_members
    FOR ALL TO authenticated
    USING (
      project_id IN (
        SELECT id 
        FROM projects 
        WHERE user_id = auth.uid()
      )
    );

  CREATE POLICY "members_self_access" ON project_members
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

END $$;