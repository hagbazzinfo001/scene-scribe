-- Fix RLS infinite recursion by introducing SECURITY DEFINER helper functions and rewriting policies

-- 1) Helper functions
CREATE OR REPLACE FUNCTION public.user_is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id AND p.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = p_project_id AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_collaborators pc
      WHERE pc.project_id = p_project_id AND pc.user_id = auth.uid()
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = p_project_id AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_collaborators pc
      WHERE pc.project_id = p_project_id AND pc.user_id = auth.uid() AND pc.role = ANY(ARRAY['owner','editor'])
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_script(p_script_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.user_can_access_project(s.project_id)
  FROM public.scripts s
  WHERE s.id = p_script_id;
$$;

-- 2) Rewrite policies to use helper functions (avoid cross-table subqueries directly in policies)

-- projects
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete projects they own" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects they own" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they own or collaborate on" ON public.projects;

CREATE POLICY "Users can create their own projects"
ON public.projects FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete projects they own"
ON public.projects FOR DELETE
USING (public.user_is_project_owner(id));

CREATE POLICY "Users can update projects they own"
ON public.projects FOR UPDATE
USING (public.user_is_project_owner(id));

CREATE POLICY "Users can view projects they own or collaborate on"
ON public.projects FOR SELECT
USING (public.user_can_access_project(id));

-- project_collaborators
DROP POLICY IF EXISTS "Project owners can manage collaborators" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators for projects they have access to" ON public.project_collaborators;

-- Owners manage all rows of collaborators for their project
CREATE POLICY "Project owners can manage collaborators"
ON public.project_collaborators FOR ALL
USING (public.user_is_project_owner(project_id))
WITH CHECK (public.user_is_project_owner(project_id));

-- Users can view collaborators for projects they have access to or if they are the collaborator
CREATE POLICY "Users can view collaborators for projects they have access to"
ON public.project_collaborators FOR SELECT
USING (public.user_can_access_project(project_id) OR user_id = auth.uid());

-- scripts
DROP POLICY IF EXISTS "Users can create scripts for projects they have access to" ON public.scripts;
DROP POLICY IF EXISTS "Users can update scripts for projects they have access to" ON public.scripts;
DROP POLICY IF EXISTS "Users can view scripts for projects they have access to" ON public.scripts;

CREATE POLICY "Users can create scripts for projects they have access to"
ON public.scripts FOR INSERT
WITH CHECK (public.user_can_edit_project(project_id));

CREATE POLICY "Users can update scripts for projects they have access to"
ON public.scripts FOR UPDATE
USING (public.user_can_edit_project(project_id));

CREATE POLICY "Users can view scripts for projects they have access to"
ON public.scripts FOR SELECT
USING (public.user_can_access_project(project_id));

-- breakdowns
DROP POLICY IF EXISTS "Users can create breakdowns for projects they have access to" ON public.breakdowns;
DROP POLICY IF EXISTS "Users can view breakdowns for projects they have access to" ON public.breakdowns;

CREATE POLICY "Users can create breakdowns for projects they have access to"
ON public.breakdowns FOR INSERT
WITH CHECK (public.user_can_access_script(script_id));

CREATE POLICY "Users can view breakdowns for projects they have access to"
ON public.breakdowns FOR SELECT
USING (public.user_can_access_script(script_id));

-- chat_messages
DROP POLICY IF EXISTS "Users can create chat messages for projects they have access to" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages for projects they have access to" ON public.chat_messages;

CREATE POLICY "Users can create chat messages for projects they have access to"
ON public.chat_messages FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND public.user_can_access_project(project_id)
);

CREATE POLICY "Users can view chat messages for projects they have access to"
ON public.chat_messages FOR SELECT
USING (public.user_can_access_project(project_id));

-- jobs
DROP POLICY IF EXISTS "Users can create jobs for projects they have access to" ON public.jobs;
DROP POLICY IF EXISTS "Users can view jobs for projects they have access to" ON public.jobs;

CREATE POLICY "Users can create jobs for projects they have access to"
ON public.jobs FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND public.user_can_edit_project(project_id)
);

CREATE POLICY "Users can view jobs for projects they have access to"
ON public.jobs FOR SELECT
USING (public.user_can_access_project(project_id));

-- Rebuild any necessary indexes for performance (no-op if they exist)
CREATE INDEX IF NOT EXISTS idx_project_collaborators_project ON public.project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user ON public.project_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_scripts_project ON public.scripts(project_id);
CREATE INDEX IF NOT EXISTS idx_breakdowns_script ON public.breakdowns(script_id);
