-- Grant admin role to Agbabiakahammed003@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE LOWER(email) = LOWER('agbabiakahammed003@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;