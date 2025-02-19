/*
  # Final Policy Setup

  1. Changes
    - Drop all existing v3 policies to ensure clean slate
    - Create new final policies for projects and project members
    - Add existence checks to prevent duplicate policy errors
  
  2. Security
    - Maintain RLS for all tables
    - Ensure proper access control based on user roles
    - Protect against unauthorized access
*/

DO $$ 
BEGIN
  -- Drop all v3 policies if they exist
  DROP POLICY IF EXISTS "project_select_v3" ON projects;
  DROP POLICY IF EXISTS "project_insert_v3" ON projects;
  DROP POLICY IF EXISTS "project_update_v3" ON projects;
  DROP POLICY IF EXISTS "project_delete_v3" ON projects;
  DROP POLICY IF EXISTS "member_select_v3" ON project_members;
  DROP POLICY IF EXISTS "member_insert_v3" ON project_members;
  DROP POLICY IF EXISTS "member_update_v3" ON project_members;
  DROP POLICY IF EXISTS "member_delete_v3" ON project_members;

  -- Create final project policies with existence checks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'project_select_final'
  ) THEN
    CREATE POLICY "project_select_final" 
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
    WHERE tablename = 'projects' AND policyname = 'project_insert_final'
  ) THEN
    CREATE POLICY "project_insert_final" 
      ON projects FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'project_update_final'
  ) THEN
    CREATE POLICY "project_update_final" 
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
    WHERE tablename = 'projects' AND policyname = 'project_delete_final'
  ) THEN
    CREATE POLICY "project_delete_final" 
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

  -- Create final project members policies with existence checks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'member_select_final'
  ) THEN
    CREATE POLICY "member_select_final" 
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
    WHERE tablename = 'project_members' AND policyname = 'member_insert_final'
  ) THEN
    CREATE POLICY "member_insert_final" 
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
    WHERE tablename = 'project_members' AND policyname = 'member_update_final'
  ) THEN
    CREATE POLICY "member_update_final" 
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
    WHERE tablename = 'project_members' AND policyname = 'member_delete_final'
  ) THEN
    CREATE POLICY "member_delete_final" 
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