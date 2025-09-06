-- STEP 1: Complete database rebuild with proper RLS policies

-- Drop existing tables if they exist to start clean
DROP TABLE IF EXISTS public.analysis_cache CASCADE;
DROP TABLE IF EXISTS public.chat_history CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;

-- Recreate projects table with proper structure
DROP TABLE IF EXISTS public.projects CASCADE;
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recreate audio_files table 
DROP TABLE IF EXISTS public.audio_files CASCADE;
CREATE TABLE public.audio_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id),
  user_id uuid NOT NULL,
  filename text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  duration real,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recreate video_files table
DROP TABLE IF EXISTS public.video_files CASCADE;
CREATE TABLE public.video_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id),
  user_id uuid NOT NULL,
  filename text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  duration real,
  resolution text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recreate vfx_assets table
DROP TABLE IF EXISTS public.vfx_assets CASCADE;
CREATE TABLE public.vfx_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  filename text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  metadata jsonb,
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create jobs table for async processing
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  type text NOT NULL,
  status text DEFAULT 'pending',
  input_data jsonb NOT NULL,
  output_data jsonb,
  error_message text,
  ai_model text DEFAULT 'gpt-5-2025-08-07',
  ai_provider text DEFAULT 'openai',
  tokens_used integer,
  cost_estimate numeric,
  processing_time_ms integer,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create analysis_cache table
CREATE TABLE public.analysis_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  script_hash text,
  analysis_type text,
  result jsonb,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

-- Create chat_history table  
CREATE TABLE public.chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  message text NOT NULL,
  is_ai_response boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vfx_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users manage own projects" ON public.projects;
DROP POLICY IF EXISTS "Users manage own audio_files" ON public.audio_files;
DROP POLICY IF EXISTS "Users manage own video_files" ON public.video_files;
DROP POLICY IF EXISTS "Users manage own vfx_assets" ON public.vfx_assets;
DROP POLICY IF EXISTS "Users manage own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users manage own analysis_cache" ON public.analysis_cache;
DROP POLICY IF EXISTS "Users manage own chat_history" ON public.chat_history;

-- Create RLS policies
CREATE POLICY "Users manage own projects"
ON public.projects
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users manage own audio_files"
ON public.audio_files
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own video_files"
ON public.video_files
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own vfx_assets"
ON public.vfx_assets
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own jobs"
ON public.jobs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own analysis_cache"
ON public.analysis_cache
FOR ALL
USING (auth.uid() IN (SELECT owner_id FROM public.projects WHERE id = analysis_cache.project_id))
WITH CHECK (auth.uid() IN (SELECT owner_id FROM public.projects WHERE id = analysis_cache.project_id));

CREATE POLICY "Users manage own chat_history"
ON public.chat_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audio_files_updated_at
  BEFORE UPDATE ON public.audio_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_files_updated_at
  BEFORE UPDATE ON public.video_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vfx_assets_updated_at
  BEFORE UPDATE ON public.vfx_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('user_audio', 'user_audio', false),
  ('user_video', 'user_video', false),
  ('vfx_assets', 'vfx_assets', false),
  ('rigs', 'rigs', false),
  ('public_previews', 'public_previews', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can manage their own audio files"
ON storage.objects
FOR ALL
USING (bucket_id = 'user_audio' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'user_audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can manage their own video files"
ON storage.objects
FOR ALL
USING (bucket_id = 'user_video' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'user_video' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can manage their own vfx assets"
ON storage.objects
FOR ALL
USING (bucket_id = 'vfx_assets' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'vfx_assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can manage their own rigs"
ON storage.objects
FOR ALL
USING (bucket_id = 'rigs' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'rigs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public previews are accessible to all"
ON storage.objects
FOR SELECT
USING (bucket_id = 'public_previews');

CREATE POLICY "Users can upload public previews"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'public_previews' AND auth.uid()::text = (storage.foldername(name))[1]);