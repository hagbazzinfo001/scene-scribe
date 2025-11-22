-- Grant admin role to specific user (run this after the user signs up)
-- This script provides a function to easily grant admin access

-- Function to grant admin role by email
CREATE OR REPLACE FUNCTION public.grant_admin_by_email(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  role_exists BOOLEAN;
BEGIN
  -- Get user ID from profiles table
  SELECT id INTO target_user_id
  FROM public.profiles
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN 'User not found with email: ' || user_email;
  END IF;
  
  -- Check if admin role already exists
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'admin'
  ) INTO role_exists;
  
  IF role_exists THEN
    RETURN 'User already has admin role: ' || user_email;
  END IF;
  
  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin');
  
  RETURN 'Admin role granted successfully to: ' || user_email;
END;
$$;

-- To grant admin access, run this after the user signs up:
-- SELECT public.grant_admin_by_email('your-email@example.com');