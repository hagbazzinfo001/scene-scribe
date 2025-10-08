-- CRITICAL SECURITY FIX: Restrict access to sensitive data

-- 1. Fix profiles table - users can only see their own email
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- 2. Fix ai_usage_analytics - restrict SELECT to own data
DROP POLICY IF EXISTS "Allow service role full access to ai_usage_analytics" ON public.ai_usage_analytics;
DROP POLICY IF EXISTS "Service role full access to ai_usage_analytics" ON public.ai_usage_analytics;

CREATE POLICY "Service role full access to ai_usage_analytics"
ON public.ai_usage_analytics FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Update existing policies to properly restrict SELECT
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.ai_usage_analytics;
CREATE POLICY "Users can view their own analytics"
ON public.ai_usage_analytics FOR SELECT
USING (user_id = auth.uid());

-- 3. Fix model_benchmarks - only admin/service role access
DROP POLICY IF EXISTS "System can write model_benchmarks" ON public.model_benchmarks;

CREATE POLICY "Service role can manage model_benchmarks"
ON public.model_benchmarks FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 4. Fix dev_logs - remove NULL job_id access
DROP POLICY IF EXISTS "Users can read logs for their jobs" ON public.dev_logs;

CREATE POLICY "Users can read logs for their jobs"
ON public.dev_logs FOR SELECT
USING (
  job_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM jobs 
    WHERE jobs.id = dev_logs.job_id 
    AND jobs.user_id = auth.uid()
  )
);

-- 5. Fix analysis_cache - prevent NULL project_id entries
DROP POLICY IF EXISTS "Users manage own analysis_cache" ON public.analysis_cache;

CREATE POLICY "Users manage own analysis_cache"
ON public.analysis_cache FOR ALL
USING (
  project_id IS NOT NULL 
  AND auth.uid() IN (
    SELECT projects.owner_id 
    FROM projects 
    WHERE projects.id = analysis_cache.project_id
  )
)
WITH CHECK (
  project_id IS NOT NULL 
  AND auth.uid() IN (
    SELECT projects.owner_id 
    FROM projects 
    WHERE projects.id = analysis_cache.project_id
  )
);