-- Fix security issue: Restrict profiles table access to user's own profile only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
-- STORAGE_BLOCK_START
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Fix security issue: Restrict ai_usage_analytics to user's own data only  
ALTER TABLE public.ai_usage_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.ai_usage_analytics;
-- STORAGE_BLOCK_START
CREATE POLICY "Users can view their own analytics" 
ON public.ai_usage_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analytics" ON public.ai_usage_analytics;
-- STORAGE_BLOCK_START
CREATE POLICY "Users can insert their own analytics" 
ON public.ai_usage_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);