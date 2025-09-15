-- Fix security issue: Restrict profiles table access to user's own profile only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Fix security issue: Restrict ai_usage_analytics to user's own data only  
ALTER TABLE public.ai_usage_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own analytics" 
ON public.ai_usage_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" 
ON public.ai_usage_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);