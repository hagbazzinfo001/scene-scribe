import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Play, Pause } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface JobPreviewProps {
  job: any;
  onDownload?: (job: any) => void;
}

export function JobPreview({ job, onDownload }: JobPreviewProps) {
  const { t } = useTranslation();
  
  if (!job) return null;
  
  if (job.status !== 'done') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Badge variant={job.status === 'failed' ? 'destructive' : 'secondary'}>
              {job.status === 'pending' && t('processing')}
              {job.status === 'running' && t('processing')}
              {job.status === 'processing_cloud' && t('processing')}
              {job.status === 'failed' && 'Failed'}
              {job.status === 'done' && 'Done'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {job.error_message || 'Processing your request...'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const publicUrl = job.result?.publicUrl || job.output_data?.publicUrl || job.meta?.publicUrl || job.output_data?.output_url || job.result?.output_url;
  
  if (!publicUrl) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            No output available for this job.
          </div>
        </CardContent>
      </Card>
    );
  }

  const isAudio = job.type === 'audio-clean' || job.type === 'audio';
  const isVideo = job.type === 'roto' || job.type === 'color-grade';
  const isScript = job.type === 'script-breakdown' || job.type === 'script_breakdown';
  const isImage = job.type === 'auto-rig' || publicUrl.includes('.png') || publicUrl.includes('.jpg');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{job.type} Result</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload?.(job)}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('download')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Script breakdown results */}
          {isScript && job.result && (
            <div className="space-y-3">
              <h4 className="font-semibold">Script Analysis Results</h4>
              {job.result.scenes && (
                <div>
                  <p className="text-sm font-medium">Scenes: {job.result.scenes.length}</p>
                  {job.result.scenes.slice(0, 3).map((scene: any, idx: number) => (
                    <div key={idx} className="text-xs text-muted-foreground pl-2 border-l-2 border-muted mt-1">
                      {scene.scene_id}: {scene.short_description}
                    </div>
                  ))}
                </div>
              )}
              {job.result.asset_list && (
                <div>
                  <p className="text-sm font-medium">Assets: {job.result.asset_list.length}</p>
                </div>
              )}
            </div>
          )}
          
          {isAudio && (
            <audio 
              controls 
              src={publicUrl}
              className="w-full"
              preload="metadata"
            />
          )}
          
          {isVideo && (
            <video 
              controls 
              src={publicUrl}
              className="w-full max-h-96 rounded-lg"
              preload="metadata"
            />
          )}
          
          {isImage && (
            <img 
              src={publicUrl}
              alt="Processing result"
              className="w-full max-h-96 object-contain rounded-lg"
            />
          )}
          
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>
              Completed: {new Date(job.completed_at || job.created_at).toLocaleDateString()}
            </span>
            {job.processing_time_ms && (
              <span>
                Processing time: {Math.round(job.processing_time_ms / 1000)}s
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}