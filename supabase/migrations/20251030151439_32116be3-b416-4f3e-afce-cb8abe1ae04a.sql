-- Create enum for user roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'app_role' AND n.nspname = 'public') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles table
-- STORAGE_BLOCK_START
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- STORAGE_BLOCK_START
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert admin role for ovie adidi (user_id from auth logs: 423bb9ed-94aa-4004-a9a4-ff0bf6075e14)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '423bb9ed-94aa-4004-a9a4-ff0bf6075e14') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES ('423bb9ed-94aa-4004-a9a4-ff0bf6075e14', 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Add INSERT policy to profiles table
-- STORAGE_BLOCK_START
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Add feature flags table for access control
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    feature_name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, feature_name)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- STORAGE_BLOCK_START
DROP POLICY IF EXISTS "Users can view their own feature flags" ON public.feature_flags;
CREATE POLICY "Users can view their own feature flags"
ON public.feature_flags FOR SELECT
USING (auth.uid() = user_id);

-- STORAGE_BLOCK_START
DROP POLICY IF EXISTS "Admins can manage all feature flags" ON public.feature_flags;
CREATE POLICY "Admins can manage all feature flags"
ON public.feature_flags FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Grant access to 3D Generator for ovie adidi
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '423bb9ed-94aa-4004-a9a4-ff0bf6075e14') THEN
    INSERT INTO public.feature_flags (user_id, feature_name, enabled)
    VALUES ('423bb9ed-94aa-4004-a9a4-ff0bf6075e14', 'mesh_generator', true)
    ON CONFLICT (user_id, feature_name) DO NOTHING;
  END IF;
END $$;