-- Add account_tier to profiles table for user access levels
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_tier text DEFAULT 'free' CHECK (account_tier IN ('free', 'pro', 'studio', 'enterprise'));

-- Add studio_waitlist table for studio plan signups
CREATE TABLE IF NOT EXISTS public.studio_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  company_name text,
  interest_area text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on studio_waitlist
ALTER TABLE public.studio_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can join studio waitlist
CREATE POLICY "Anyone can join studio waitlist" 
ON public.studio_waitlist 
FOR INSERT 
WITH CHECK (true);

-- Admins can view studio waitlist
CREATE POLICY "Admins can view studio waitlist" 
ON public.studio_waitlist 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

-- Create function to check if user has specific tier or higher
CREATE OR REPLACE FUNCTION public.has_tier_access(required_tier text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
      account_tier = required_tier
      OR account_tier = 'enterprise'
      OR (required_tier = 'free' AND account_tier IN ('pro', 'studio', 'enterprise'))
      OR (required_tier = 'pro' AND account_tier IN ('studio', 'enterprise'))
      OR (required_tier = 'studio' AND account_tier = 'enterprise')
    )
  )
$$;

-- Grant Ovie Adidi full access by updating their tier when they sign up
-- This is handled in the application code by checking email