import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  url?: string;
  error?: string;
}

interface FileUploadOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

export function useFileUpload() {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (file: File, options?: FileUploadOptions): string | null => {
    const maxSize = (options?.maxSizeMB || 100) * 1024 * 1024; // Default 100MB
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${options?.maxSizeMB || 100}MB`;
    }

    if (options?.allowedTypes && !options.allowedTypes.some(type => file.type.startsWith(type))) {
      return `File type not allowed. Allowed types: ${options.allowedTypes.join(', ')}`;
    }

    return null;
  };

  const uploadFile = async (
    file: File, 
    bucket: 'uploads' | 'scripts' | 'vfx-assets' | 'audio-uploads' | 'video-uploads',
    options?: FileUploadOptions
  ): Promise<string | null> => {
    try {
      setIsUploading(true);

      // Get current user ID from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload files');
        return null;
      }

      // Validate file
      const validationError = validateFile(file, options);
      if (validationError) {
        toast.error(validationError);
        options?.onError?.(validationError);
        return null;
      }

      // Create upload progress entry
      const uploadId = crypto.randomUUID();
      const uploadProgress: UploadProgress = {
        file,
        progress: 0,
        status: 'uploading'
      };

      setUploads(prev => [...prev, uploadProgress]);

      // Generate unique file path with user ID folder structure
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public or signed URL based on bucket
      let publicUrl: string;
      
      if (bucket === 'uploads') {
        // Public bucket - get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      } else {
        // Private bucket - create signed URL (24 hours)
        const { data: signedData, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 86400);
        
        if (signError) {
          throw new Error(`Failed to create signed URL: ${signError.message}`);
        }
        publicUrl = signedData.signedUrl;
      }

      // Update progress to complete
      setUploads(prev => prev.map(upload => 
        upload.file === file ? { ...upload, progress: 100, status: 'complete', url: publicUrl } : upload
      ));

      // Save to appropriate database table
      if (bucket === 'audio-uploads') {
        await supabase.from('audio_files').insert({
          user_id: user.id,
          filename: file.name,
          file_url: publicUrl,
          file_size: file.size,
          duration: null, // Will be set by processing functions if needed
        });
      } else if (bucket === 'video-uploads') {
        await supabase.from('video_files').insert({
          user_id: user.id,
          filename: file.name,
          file_url: publicUrl,
          file_size: file.size,
          duration: null, // Will be set by processing functions if needed
        });
      } else if (bucket === 'vfx-assets') {
        await supabase.from('vfx_assets').insert({
          user_id: user.id,
          filename: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
        });
      }

      options?.onSuccess?.(publicUrl);
      toast.success('File uploaded successfully!');
      return publicUrl;

    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Update progress to error
      setUploads(prev => prev.map(upload => 
        upload.file === file ? { ...upload, status: 'error', error: error.message } : upload
      ));

      const errorMessage = error.message || 'Upload failed';
      options?.onError?.(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const clearUploads = () => {
    setUploads([]);
  };

  return {
    uploadFile,
    uploads,
    isUploading,
    clearUploads
  };
}