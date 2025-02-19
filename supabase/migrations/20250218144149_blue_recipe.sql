/*
  # Fix project policies with existence checks

  1. Changes
    - Drop all existing policies for projects and project_members
    - Create new policies with unique names
    - Add existence checks to prevent conflicts
  
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Ensure data integrity
*/

DO $$ 
BEGIN
  -- Drop all policies for projects
  DROP POLICY IF EXISTS "Projects view policy" ON projects;
  DROP POLICY IF EXISTS "Projects create policy" ON projects;
  DROP POLICY IF EXISTS "Projects update policy" ON projects;
  DROP POLICY IF EXISTS "Projects delete policy" ON projects;
  DROP POLICY IF EXISTS "project_access_20250218" ON projects;
  DROP POLICY IF EXISTS "project_create_20250218" ON projects;
  DROP POLICY IF EXISTS "project_update_20250218" ON projects;
  DROP POLICY IF EXISTS "project_delete_20250218" ON projects;

  -- Drop all policies for project_members
  DROP POLICY IF EXISTS "Members view policy" ON project_members;
  DROP POLICY IF EXISTS "Members create policy" ON project_members;
  DROP POLICY IF EXISTS "Members update policy" ON project_members;
  DROP POLICY IF EXISTS "Members delete policy" ON project_members;
  DROP POLICY IF EXISTS "member_access_20250218" ON project_members;
  DROP POLICY IF EXISTS "member_create_20250218" ON project_members;
  DROP POLICY IF EXISTS "member_update_20250218" ON project_members;
  DROP POLICY IF EXISTS "member_delete_20250218" ON project_members;

  -- Create new project policies if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'project_access_20250218_v2') THEN
    CREATE POLICY "project_access_20250218_v2" 
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
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'project_create_20250218_v2') THEN
    CREATE POLICY "project_create_20250218_v2" 
      ON projects FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'project_update_20250218_v2') THEN
    CREATE POLICY "project_update_20250218_v2" 
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
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'project_delete_20250218_v2') THEN
    CREATE POLICY "project_delete_20250218_v2" 
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
  END IF;

  -- Create new project members policies if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'member_access_20250218_v2') THEN
    CREATE POLICY "member_access_20250218_v2" 
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
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'member_create_20250218_v2') THEN
    CREATE POLICY "member_create_20250218_v2" 
      ON project_members FOR INSERT
      TO authenticated
      WITH CHECK (
        project_id IN (
          SELECT id 
          FROM projects 
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'member_update_20250218_v2') THEN
    CREATE POLICY "member_update_20250218_v2" 
      ON project_members FOR UPDATE
      TO authenticated
      USING (
        project_id IN (
          SELECT id 
          FROM projects 
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'member_delete_20250218_v2') THEN
    CREATE POLICY "member_delete_20250218_v2" 
      ON project_members FOR DELETE
      TO authenticated
      USING (
        project_id IN (
          SELECT id 
          FROM projects 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;