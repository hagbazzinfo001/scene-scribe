-- Create outputs bucket for processed files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('outputs', 'outputs', true)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public;

-- NOTE: Storage policies on storage.objects cannot be created via migrations
-- They must be created through the Supabase dashboard instead
-- The following policies need to be created manually:
-- 1. "Users can view outputs" - SELECT on outputs bucket
-- 2. "Service role can manage outputs" - ALL on outputs bucket

-- Commented out - causes "must be owner of table objects" error
-- CREATE POLICY "Users can view outputs" 
-- ON storage.objects 
-- FOR SELECT 
-- USING (bucket_id = 'outputs');

-- CREATE POLICY "Service role can manage outputs" 
-- ON storage.objects 
-- FOR ALL 
-- USING (bucket_id = 'outputs');

-- Update jobs table to include processing metadata
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS ai_provider text DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'gpt-5-2025-08-07',
ADD COLUMN IF NOT EXISTS tokens_used integer,
ADD COLUMN IF NOT EXISTS cost_estimate numeric(10,6),
ADD COLUMN IF NOT EXISTS processing_time_ms integer;