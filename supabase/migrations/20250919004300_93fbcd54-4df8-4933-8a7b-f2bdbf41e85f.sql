-- Create translations bucket for storing translation files
INSERT INTO storage.buckets (id, name, public) VALUES ('translations', 'translations', false);

-- Create RLS policies for translations bucket
CREATE POLICY "Users can view their own translations" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'translations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own translations" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'translations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own translations" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'translations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own translations" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'translations' AND auth.uid()::text = (storage.foldername(name))[1]);