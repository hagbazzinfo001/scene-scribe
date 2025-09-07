-- STEP 1: Database Setup & Verification
-- Ensure all required tables exist with proper structure

-- Update projects table structure if needed
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS description text;

-- Update audio_files table structure  
ALTER TABLE public.audio_files
ADD COLUMN IF NOT EXISTS owner_id uuid,
ADD COLUMN IF NOT EXISTS path text,
ADD COLUMN IF NOT EXISTS mime text,
ADD COLUMN IF NOT EXISTS size integer,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'uploading';

-- Update video_files table structure
ALTER TABLE public.video_files  
ADD COLUMN IF NOT EXISTS owner_id uuid,
ADD COLUMN IF NOT EXISTS path text,
ADD COLUMN IF NOT EXISTS thumb_path text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'uploading';

-- Update vfx_assets table structure
ALTER TABLE public.vfx_assets
ADD COLUMN IF NOT EXISTS owner_id uuid,
ADD COLUMN IF NOT EXISTS path text,
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS meta jsonb,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'ready';

-- Update jobs table structure for proper backend job processing
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS payload jsonb,
ADD COLUMN IF NOT EXISTS result jsonb,
ADD COLUMN IF NOT EXISTS error text;

-- Create dev_logs table for debugging if not exists
CREATE TABLE IF NOT EXISTS public.dev_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route text,
  user_id uuid,
  stack text,
  timestamp timestamptz DEFAULT now(),
  level text NOT NULL,
  message text NOT NULL,
  job_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Ensure proper RLS policies for backend operations
-- Projects: Users manage own projects
DROP POLICY IF EXISTS "Users manage own projects" ON public.projects;
CREATE POLICY "Users manage own projects"
ON public.projects
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Audio files: Users manage own files
DROP POLICY IF EXISTS "Users manage own audio_files" ON public.audio_files;
CREATE POLICY "Users manage own audio_files"
ON public.audio_files  
FOR ALL
USING (auth.uid() = COALESCE(owner_id, user_id))
WITH CHECK (auth.uid() = COALESCE(owner_id, user_id));

-- Video files: Users manage own files
DROP POLICY IF EXISTS "Users manage own video_files" ON public.video_files;
CREATE POLICY "Users manage own video_files"
ON public.video_files
FOR ALL  
USING (auth.uid() = COALESCE(owner_id, user_id))
WITH CHECK (auth.uid() = COALESCE(owner_id, user_id));

-- VFX assets: Users manage own assets
DROP POLICY IF EXISTS "Users manage own vfx_assets" ON public.vfx_assets;
CREATE POLICY "Users manage own vfx_assets"
ON public.vfx_assets
FOR ALL
USING (auth.uid() = COALESCE(owner_id, user_id)) 
WITH CHECK (auth.uid() = COALESCE(owner_id, user_id));

-- Jobs: Users manage own jobs
DROP POLICY IF EXISTS "Users manage own jobs" ON public.jobs;
CREATE POLICY "Users manage own jobs"
ON public.jobs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Chat history: Users manage own chat
DROP POLICY IF EXISTS "Users manage own chat_history" ON public.chat_history;
CREATE POLICY "Users manage own chat_history"
ON public.chat_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Notifications: Users manage own notifications  
DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications"
ON public.notifications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Dev logs: System can write, users can read their job logs
DROP POLICY IF EXISTS "System can write dev_logs" ON public.dev_logs;
DROP POLICY IF EXISTS "Users can read logs for their jobs" ON public.dev_logs;
CREATE POLICY "System can write dev_logs"
ON public.dev_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can read logs for their jobs"  
ON public.dev_logs
FOR SELECT
USING (
  job_id IS NULL OR 
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = dev_logs.job_id AND jobs.user_id = auth.uid()
  )
);