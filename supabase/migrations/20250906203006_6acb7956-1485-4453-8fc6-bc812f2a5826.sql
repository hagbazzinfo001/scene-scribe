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

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications for users" ON public.notifications;
CREATE POLICY "System can create notifications for users"
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Add trigger for updated_at on notifications
CREATE OR REPLACE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_settings table for persistent settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  auto_save BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  settings_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings"
ON public.user_settings 
FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings"
ON public.user_settings 
FOR UPDATE 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings"
ON public.user_settings 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Add trigger for updated_at on user_settings
CREATE OR REPLACE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();