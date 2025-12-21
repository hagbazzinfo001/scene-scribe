-- STEP 1: DATABASE FOUNDATION - Fix RLS Issues & Prepare Backend

-- Create backup reference
COMMENT ON DATABASE postgres IS 'Backup created for import-breakdown module - 2025-01-07';

-- Ensure projects table has proper structure and RLS
DROP POLICY IF EXISTS "Users manage own projects" ON public.projects;
CREATE POLICY "Users manage own projects" 
ON public.projects 
FOR ALL 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Ensure jobs table has proper RLS
DROP POLICY IF EXISTS "Users manage own jobs" ON public.jobs;
CREATE POLICY "Users manage own jobs" 
ON public.jobs 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure audio_files table has proper RLS
DROP POLICY IF EXISTS "Users manage own audio_files" ON public.audio_files;
CREATE POLICY "Users manage own audio_files" 
ON public.audio_files 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure video_files table has proper RLS
DROP POLICY IF EXISTS "Users manage own video_files" ON public.video_files;
CREATE POLICY "Users manage own video_files" 
ON public.video_files 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure vfx_assets table has proper RLS
DROP POLICY IF EXISTS "Users manage own vfx_assets" ON public.vfx_assets;
CREATE POLICY "Users manage own vfx_assets" 
ON public.vfx_assets 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add missing updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
DROP TRIGGER IF EXISTS handle_projects_updated_at ON public.projects;
CREATE TRIGGER handle_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_jobs_updated_at ON public.jobs;
CREATE TRIGGER handle_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_audio_files_updated_at ON public.audio_files;
CREATE TRIGGER handle_audio_files_updated_at
    BEFORE UPDATE ON public.audio_files
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_video_files_updated_at ON public.video_files;
CREATE TRIGGER handle_video_files_updated_at
    BEFORE UPDATE ON public.video_files
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_vfx_assets_updated_at ON public.vfx_assets;
CREATE TRIGGER handle_vfx_assets_updated_at
    BEFORE UPDATE ON public.vfx_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create user_assets table for consolidated file storage
CREATE TABLE IF NOT EXISTS public.user_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    filename text NOT NULL,
    file_url text NOT NULL,
    file_type text NOT NULL, -- 'script', 'audio', 'video', 'image'
    file_size integer,
    mime_type text,
    storage_path text NOT NULL,
    metadata jsonb DEFAULT '{}',
    processing_status text DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS for user_assets
ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own user_assets" ON public.user_assets;
CREATE POLICY "Users manage own user_assets" 
ON public.user_assets 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Updated trigger for user_assets
DROP TRIGGER IF EXISTS handle_user_assets_updated_at ON public.user_assets;
CREATE TRIGGER handle_user_assets_updated_at
    BEFORE UPDATE ON public.user_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for key tables
ALTER TABLE public.jobs REPLICA IDENTITY FULL;
ALTER TABLE public.user_assets REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication (skip if already exists)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_assets;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Create model_benchmarks table for storing model performance data
CREATE TABLE IF NOT EXISTS public.model_benchmarks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_type text NOT NULL, -- 'transcription', 'shot_detection', 'tagging', etc.
    model_name text NOT NULL,
    provider text NOT NULL, -- 'replicate', 'openai', etc.
    cost_per_unit numeric(10,6),
    avg_latency_ms integer,
    accuracy_score numeric(3,2), -- 0.00 to 1.00
    benchmark_date timestamptz DEFAULT now(),
    test_file_size integer,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- RLS for model_benchmarks (admin-readable, system-writable)
ALTER TABLE public.model_benchmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read model_benchmarks" ON public.model_benchmarks;
CREATE POLICY "Anyone can read model_benchmarks" 
ON public.model_benchmarks 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "System can write model_benchmarks" ON public.model_benchmarks;
CREATE POLICY "System can write model_benchmarks" 
ON public.model_benchmarks 
FOR INSERT 
WITH CHECK (true);

-- Create index for fast model selection queries
CREATE INDEX IF NOT EXISTS idx_model_benchmarks_type_score 
ON public.model_benchmarks(analysis_type, accuracy_score DESC, cost_per_unit ASC);

-- Create dev_logs table for debugging and monitoring
CREATE TABLE IF NOT EXISTS public.dev_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
    level text NOT NULL, -- 'info', 'warn', 'error', 'debug'
    message text NOT NULL,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- RLS for dev_logs
ALTER TABLE public.dev_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read logs for their jobs" ON public.dev_logs;
CREATE POLICY "Users can read logs for their jobs" 
ON public.dev_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.jobs 
        WHERE jobs.id = dev_logs.job_id 
        AND jobs.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "System can write dev_logs" ON public.dev_logs;
CREATE POLICY "System can write dev_logs" 
ON public.dev_logs 
FOR INSERT 
WITH CHECK (true);

-- Add credit tracking to profiles table if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits_remaining integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS credits_used integer DEFAULT 0;

COMMENT ON TABLE public.user_assets IS 'Consolidated file storage for all user uploads with processing status';
COMMENT ON TABLE public.model_benchmarks IS 'Performance metrics for AI model selection and cost optimization';
COMMENT ON TABLE public.dev_logs IS 'System logs for debugging job processing and model execution';