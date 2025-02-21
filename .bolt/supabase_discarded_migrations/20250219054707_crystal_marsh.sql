/*
  # Fix project subreddits RLS policies

  1. Changes
    - Drop existing project_subreddits policies
    - Create new simplified policies for project_subreddits table
    - Add proper access control for project members

  2. Security
    - Enable RLS on project_subreddits table
    - Add policies for view, create, update, and delete operations
    - Ensure proper access control based on project membership
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members with edit access can manage project subreddits" ON project_subreddits;
DROP POLICY IF EXISTS "project_subreddits_access_policy" ON project_subreddits;
DROP POLICY IF EXISTS "project_subreddits_manage_policy" ON project_subreddits;

-- Create new policies
CREATE POLICY "view_project_subreddits"
  ON project_subreddits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id
      AND (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = projects.id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "create_project_subreddits"
  ON project_subreddits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id
      AND (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = projects.id
          AND user_id = auth.uid()
          AND role IN ('owner', 'edit')
        )
      )
    )
  );

CREATE POLICY "update_project_subreddits"
  ON project_subreddits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id
      AND (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = projects.id
          AND user_id = auth.uid()
          AND role IN ('owner', 'edit')
        )
      )
    )
  );

CREATE POLICY "delete_project_subreddits"
  ON project_subreddits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id
      AND (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = projects.id
          AND user_id = auth.uid()
          AND role IN ('owner', 'edit')
        )
      )
    )
  );