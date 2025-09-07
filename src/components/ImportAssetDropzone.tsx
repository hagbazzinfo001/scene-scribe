import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, Video, Music, FileText, Image, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FileUpload {
  id: string;
  file: File;
  type: 'script' | 'audio' | 'video' | 'image';
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  assetId?: string;
  jobId?: string;
  error?: string;
}

interface ImportAssetDropzoneProps {
  projectId: string;
  onAssetUploaded?: (asset: any) => void;
}

const getFileType = (file: File): 'script' | 'audio' | 'video' | 'image' => {
  if (file.type.startsWith('text/') || file.name.match(/\.(txt|pdf|docx)$/i)) {
    return 'script';
  }
  if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|flac)$/i)) {
    return 'audio';
  }
  if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|avi|mkv)$/i)) {
    return 'video';
  }
  if (file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return 'image';
  }
  return 'script'; // Default
};

const getFileIcon = (type: string) => {
  switch (type) {
    case 'script': return <FileText className="h-5 w-5" />;
    case 'audio': return <Music className="h-5 w-5" />;
    case 'video': return <Video className="h-5 w-5" />;
    case 'image': return <Image className="h-5 w-5" />;
    default: return <File className="h-5 w-5" />;
  }
};

export function ImportAssetDropzone({ projectId, onAssetUploaded }: ImportAssetDropzoneProps) {
  const [uploads, setUploads] = useState<FileUpload[]>([]);

  const uploadFile = async (fileUpload: FileUpload) => {
    try {
      // Step 1: Get signed upload URL
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
        'upload-asset',
        {
          body: {
            filename: fileUpload.file.name,
            contentType: fileUpload.file.type,
            projectId,
            fileType: fileUpload.type
          }
        }
      );

      if (uploadError) throw uploadError;

      // Step 2: Upload file to signed URL
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: fileUpload.file,
        headers: {
          'Content-Type': fileUpload.file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Update progress
      setUploads(prev => prev.map(u => 
        u.id === fileUpload.id 
          ? { ...u, progress: 100, assetId: uploadData.assetId }
          : u
      ));

      // Step 3: Confirm upload and trigger analysis
      const { data: confirmData, error: confirmError } = await supabase.functions.invoke(
        'confirm-upload',
        {
          body: {
            assetId: uploadData.assetId,
            fileSize: fileUpload.file.size
          }
        }
      );

      if (confirmError) throw confirmError;

      // Update to processing status
      setUploads(prev => prev.map(u => 
        u.id === fileUpload.id 
          ? { ...u, status: 'processing', jobId: confirmData.jobId }
          : u
      ));

      // Start polling for job completion
      if (confirmData.jobId) {
        pollJobStatus(fileUpload.id, confirmData.jobId);
      }

      onAssetUploaded?.(confirmData.asset);
      toast.success(`${fileUpload.file.name} uploaded and queued for analysis`);

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploads(prev => prev.map(u => 
        u.id === fileUpload.id 
          ? { ...u, status: 'failed', error: error.message }
          : u
      ));
      toast.error(`Failed to upload ${fileUpload.file.name}: ${error.message}`);
    }
  };

  const pollJobStatus = async (uploadId: string, jobId: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setUploads(prev => prev.map(u => 
          u.id === uploadId 
            ? { ...u, status: 'failed', error: 'Analysis timeout' }
            : u
        ));
        return;
      }

      try {
        const { data: statusData, error } = await supabase.functions.invoke(
          'job-status',
          { body: { jobId } }
        );

        if (error) throw error;

        const job = statusData.job;
        
        if (job.status === 'completed') {
          setUploads(prev => prev.map(u => 
            u.id === uploadId 
              ? { ...u, status: 'completed' }
              : u
          ));
          toast.success('Analysis completed!');
        } else if (job.status === 'failed') {
          setUploads(prev => prev.map(u => 
            u.id === uploadId 
              ? { ...u, status: 'failed', error: job.error_message || 'Analysis failed' }
              : u
          ));
          toast.error('Analysis failed');
        } else {
          // Still processing, continue polling
          attempts++;
          setTimeout(poll, 5000);
        }
      } catch (error: any) {
        attempts++;
        setTimeout(poll, 5000);
      }
    };

    // Start polling after 2 seconds
    setTimeout(poll, 2000);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads: FileUpload[] = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      type: getFileType(file),
      status: 'uploading',
      progress: 0
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Start uploading each file
    newUploads.forEach(uploadFile);
  }, [projectId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/*': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.flac'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true
  });

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const clearCompleted = () => {
    setUploads(prev => prev.filter(u => u.status !== 'completed'));
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop files here' : 'Import New Assets'}
              </p>
              <p className="text-sm text-muted-foreground">
                Drag & drop or click to upload scripts, audio, video, or images
              </p>
              <p className="text-xs text-muted-foreground">
                Supports: TXT, PDF, DOCX, MP3, WAV, MP4, MOV, JPG, PNG • Max 100MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Upload Progress</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompleted}
                  disabled={!uploads.some(u => u.status === 'completed')}
                >
                  Clear Completed
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              {uploads.map((upload) => (
                <div key={upload.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {getFileIcon(upload.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{upload.file.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {upload.type}
                      </Badge>
                    </div>
                    
                    {upload.status === 'uploading' && (
                      <Progress value={upload.progress} className="h-2" />
                    )}
                    
                    {upload.status === 'processing' && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Analyzing content...
                      </div>
                    )}
                    
                    {upload.error && (
                      <p className="text-xs text-destructive">{upload.error}</p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0">
                    {upload.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {upload.status === 'failed' && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    {upload.status === 'processing' && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                    {upload.status === 'uploading' && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUpload(upload.id)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}