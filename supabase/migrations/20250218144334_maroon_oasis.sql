/*
  # Simplified RLS Policies

  1. Changes
    - Drop existing policies
    - Create new simplified policies for projects and project members
    - Add existence checks before creating policies

  2. Security
    - Policies ensure users can only access their own projects or projects they are members of
    - Project owners and editors can update projects
    - Only project owners can delete projects
    - Project members policies control access to member management
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
  DROP POLICY IF EXISTS "project_select_v3" ON projects;
  DROP POLICY IF EXISTS "project_insert_v3" ON projects;
  DROP POLICY IF EXISTS "project_update_v3" ON projects;
  DROP POLICY IF EXISTS "project_delete_v3" ON projects;
  DROP POLICY IF EXISTS "member_select_v3" ON project_members;
  DROP POLICY IF EXISTS "member_insert_v3" ON project_members;
  DROP POLICY IF EXISTS "member_update_v3" ON project_members;
  DROP POLICY IF EXISTS "member_delete_v3" ON project_members;

  -- Create simplified project policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'project_select_v3'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'project_insert_v3'
  ) THEN
    CREATE POLICY "project_insert_v3" 
      ON projects FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'project_update_v3'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'project_delete_v3'
  ) THEN
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
  END IF;

  -- Create simplified project members policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'member_select_v3'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'member_insert_v3'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'member_update_v3'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'member_delete_v3'
  ) THEN
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
  END IF;
END $$;