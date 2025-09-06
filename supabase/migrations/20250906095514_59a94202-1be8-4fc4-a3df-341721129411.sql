-- Create storage buckets for Nollywood production assets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('scripts', 'scripts', false),
  ('vfx-assets', 'vfx-assets', false),
  ('audio-uploads', 'audio-uploads', false);

-- Create policies for scripts bucket
CREATE POLICY "Users can view their own scripts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'scripts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own scripts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'scripts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own scripts" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'scripts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own scripts" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'scripts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policies for vfx-assets bucket
CREATE POLICY "Users can view their own vfx assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'vfx-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own vfx assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'vfx-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own vfx assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'vfx-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own vfx assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'vfx-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policies for audio-uploads bucket
CREATE POLICY "Users can view their own audio uploads" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audio-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audio-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own audio files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'audio-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'audio-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);