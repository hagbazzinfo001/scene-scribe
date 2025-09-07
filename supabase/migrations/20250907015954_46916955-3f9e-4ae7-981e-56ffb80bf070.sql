-- Fix security warnings for function search path mutability

-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix user_can_access_project function
CREATE OR REPLACE FUNCTION public.user_can_access_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
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

-- Fix user_can_edit_project function  
CREATE OR REPLACE FUNCTION public.user_can_edit_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
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

-- Fix user_is_project_owner function
CREATE OR REPLACE FUNCTION public.user_is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id AND p.owner_id = auth.uid()
  );
$$;

-- Fix user_can_access_script function
CREATE OR REPLACE FUNCTION public.user_can_access_script(p_script_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_can_access_project(s.project_id)
  FROM public.scripts s
  WHERE s.id = p_script_id;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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