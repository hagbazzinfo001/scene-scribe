-- Tighten analytics visibility and secure function search_path

-- ai_usage_analytics: restrict to owner/service role only
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_usage_analytics' AND policyname = 'Allow authenticated users to view usage analytics'
  ) THEN
    DROP POLICY "Allow authenticated users to view usage analytics" ON public.ai_usage_analytics;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_usage_analytics' AND policyname = 'Allow authenticated users to insert usage analytics'
  ) THEN
    DROP POLICY "Allow authenticated users to insert usage analytics" ON public.ai_usage_analytics;
  END IF;
END $$;

-- Keep user-scoped policies as-is. Ensure service role policy exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_usage_analytics' AND policyname = 'Service role full access to ai_usage_analytics'
  ) THEN
    CREATE POLICY "Service role full access to ai_usage_analytics"
    ON public.ai_usage_analytics
    AS PERMISSIVE
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- model_benchmarks: remove public read
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'model_benchmarks' AND policyname = 'Anyone can read model_benchmarks'
  ) THEN
    DROP POLICY "Anyone can read model_benchmarks" ON public.model_benchmarks;
  END IF;
END $$;

-- Secure function search_path for SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.set_projects_owner_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog','public'
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog','public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog','public'
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
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog','public'
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

CREATE OR REPLACE FUNCTION public.user_is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog','public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id AND p.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_script(p_script_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog','public'
AS $$
  SELECT public.user_can_access_project(s.project_id)
  FROM public.scripts s
  WHERE s.id = p_script_id;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog','public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog','public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;
