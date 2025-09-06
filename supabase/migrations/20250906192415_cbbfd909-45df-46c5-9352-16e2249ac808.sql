-- Fix RLS policies for ai_usage_analytics table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own usage analytics" ON public.ai_usage_analytics;
DROP POLICY IF EXISTS "Users can view their own usage analytics" ON public.ai_usage_analytics;

-- Enable RLS on ai_usage_analytics table
ALTER TABLE public.ai_usage_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies that allow service role and authenticated users to insert/select
CREATE POLICY "Allow service role full access to ai_usage_analytics"
ON public.ai_usage_analytics
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert usage analytics"
ON public.ai_usage_analytics
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view usage analytics"
ON public.ai_usage_analytics
FOR SELECT
TO authenticated
USING (true);