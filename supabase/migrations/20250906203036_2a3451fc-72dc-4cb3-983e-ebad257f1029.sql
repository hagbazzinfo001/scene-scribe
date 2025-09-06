-- Fix RLS issues and create missing storage buckets/policies

-- First, ensure we have all required storage buckets
INSERT INTO storage.buckets (id, name, public, allowed_mime_types) 
VALUES ('video-uploads', 'video-uploads', false, '{"video/*"}')
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio-uploads bucket
DROP POLICY IF EXISTS "Users can upload their own audio files" ON storage.objects;
CREATE POLICY "Users can upload their own audio files"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'audio-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view their own audio files" ON storage.objects;
CREATE POLICY "Users can view their own audio files"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'audio-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own audio files" ON storage.objects;
CREATE POLICY "Users can update their own audio files"
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'audio-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own audio files" ON storage.objects;
CREATE POLICY "Users can delete their own audio files"
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'audio-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for video-uploads bucket
DROP POLICY IF EXISTS "Users can upload their own video files" ON storage.objects;
CREATE POLICY "Users can upload their own video files"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'video-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view their own video files" ON storage.objects;
CREATE POLICY "Users can view their own video files"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'video-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own video files" ON storage.objects;
CREATE POLICY "Users can update their own video files"
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'video-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own video files" ON storage.objects;
CREATE POLICY "Users can delete their own video files"
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'video-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for vfx-assets bucket
DROP POLICY IF EXISTS "Users can upload their own vfx assets" ON storage.objects;
CREATE POLICY "Users can upload their own vfx assets"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'vfx-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view their own vfx assets" ON storage.objects;
CREATE POLICY "Users can view their own vfx assets"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'vfx-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own vfx assets" ON storage.objects;
CREATE POLICY "Users can update their own vfx assets"
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'vfx-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own vfx assets" ON storage.objects;
CREATE POLICY "Users can delete their own vfx assets"
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'vfx-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);