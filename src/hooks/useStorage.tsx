import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export function useStorage() {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  const uploadFile = async (
    file: File, 
    bucket: 'scripts' | 'vfx-assets' | 'audio-uploads',
    projectId?: string
  ): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to upload files');
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${projectId || 'general'}/${Date.now()}.${fileExt}`;

    // Add to uploads tracking
    const uploadId = Date.now().toString();
    setUploads(prev => [...prev, {
      file,
      progress: 0,
      status: 'uploading'
    }]);

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      // Simulate upload progress for better UX
      const progressInterval = setInterval(() => {
        setUploads(prev => prev.map(upload => {
          if (upload.file === file && upload.progress < 90) {
            return { ...upload, progress: upload.progress + 10 };
          }
          return upload;
        }));
      }, 100);

      clearInterval(progressInterval);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      // Update upload status
      setUploads(prev => prev.map(upload => 
        upload.file === file 
          ? { ...upload, status: 'completed', progress: 100, url: publicUrl }
          : upload
      ));

      toast.success(`File uploaded to ${bucket}`);
      return publicUrl;

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploads(prev => prev.map(upload => 
        upload.file === file 
          ? { ...upload, status: 'error', error: error.message }
          : upload
      ));
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }
  };

  const deleteFile = async (
    bucket: 'scripts' | 'vfx-assets' | 'audio-uploads',
    path: string
  ) => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      toast.success('File deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Delete failed: ${error.message}`);
      return false;
    }
  };

  const listFiles = async (
    bucket: 'scripts' | 'vfx-assets' | 'audio-uploads',
    folder?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const path = folder ? `${user.id}/${folder}` : user.id;
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('List files error:', error);
      toast.error(`Failed to load files: ${error.message}`);
      return [];
    }
  };

  const clearUploads = () => setUploads([]);

  return {
    uploads,
    uploadFile,
    deleteFile,
    listFiles,
    clearUploads
  };
}