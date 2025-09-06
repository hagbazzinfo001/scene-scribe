import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFileUpload } from '@/hooks/useFileUpload';

interface FileUploadZoneProps {
  onFileUploaded?: (url: string, file: File) => void;
  bucket?: 'uploads' | 'scripts' | 'vfx-assets' | 'audio-uploads';
  acceptedFileTypes?: string[];
  maxSizeMB?: number;
  multiple?: boolean;
  className?: string;
}

export function FileUploadZone({
  onFileUploaded,
  bucket = 'uploads',
  acceptedFileTypes = ['image', 'video', 'audio'],
  maxSizeMB = 100,
  multiple = false,
  className = ''
}: FileUploadZoneProps) {
  const { uploadFile, uploads, isUploading, clearUploads } = useFileUpload();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const files = multiple ? acceptedFiles : [acceptedFiles[0]];
    
    for (const file of files) {
      const url = await uploadFile(file, bucket, {
        maxSizeMB,
        allowedTypes: acceptedFileTypes,
        onSuccess: (uploadedUrl) => {
          onFileUploaded?.(uploadedUrl, file);
        }
      });
    }
  }, [uploadFile, bucket, maxSizeMB, acceptedFileTypes, multiple, onFileUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
    accept: acceptedFileTypes.reduce((acc, type) => {
      if (type === 'image') acc['image/*'] = [];
      if (type === 'video') acc['video/*'] = [];
      if (type === 'audio') acc['audio/*'] = [];
      if (type === 'text') acc['text/*'] = [];
      return acc;
    }, {} as Record<string, string[]>)
  });

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
        
        {isDragActive ? (
          <p className="text-primary font-medium">Drop files here...</p>
        ) : (
          <div>
            <p className="text-sm">
              <span className="text-primary font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {acceptedFileTypes.join(', ').toUpperCase()} files (max {maxSizeMB}MB)
            </p>
          </div>
        )}
      </div>

      {uploads.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">Uploads</h4>
            <Button variant="ghost" size="sm" onClick={clearUploads}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {uploads.map((upload, index) => (
            <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
              <File className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{upload.file.name}</p>
                {upload.status === 'uploading' && (
                  <Progress value={upload.progress} className="mt-1" />
                )}
                {upload.status === 'error' && (
                  <p className="text-xs text-destructive mt-1">{upload.error}</p>
                )}
                {upload.status === 'complete' && (
                  <p className="text-xs text-green-600 mt-1">Upload complete</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}