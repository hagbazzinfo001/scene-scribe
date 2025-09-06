-- First let me fix the project_collaborators RLS policy to prevent infinite recursion
DROP POLICY IF EXISTS "Users can view collaborators for projects they have access to" ON project_collaborators;

CREATE POLICY "Users can view collaborators for projects they have access to" 
ON project_collaborators 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM projects p 
    WHERE p.id = project_collaborators.project_id 
    AND (
      p.owner_id = auth.uid() 
      OR project_collaborators.user_id = auth.uid()
    )
  )
);