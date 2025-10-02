import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JobStatusMonitorProps {
  jobId: string;
  onComplete?: (outputUrl: string) => void;
  onError?: (error: string) => void;
}

export function JobStatusMonitor({ jobId, onComplete, onError }: JobStatusMonitorProps) {
  const [status, setStatus] = useState<'pending' | 'running' | 'done' | 'failed'>('pending');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const pollJobStatus = async () => {
      try {
        const { data: job, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) throw error;

        setStatus(job.status as 'pending' | 'running' | 'done' | 'failed');
        
        if (job.status === 'running') {
          setProgress(Math.min(progress + 10, 90));
        }

        if (job.status === 'done') {
          setProgress(100);
          const outputData = job.output_data as any;
          const url = outputData?.output_url;
          if (url) {
            setOutputUrl(url);
            onComplete?.(url);
            toast.success('Job completed successfully!');
          }
          clearInterval(intervalId);
        } else if (job.status === 'failed') {
          const error = job.error_message || 'Unknown error';
          setErrorMessage(error);
          onError?.(error);
          toast.error(`Job failed: ${error}`);
          clearInterval(intervalId);
        }
      } catch (error: any) {
        console.error('Error polling job:', error);
        setErrorMessage(error.message);
        clearInterval(intervalId);
      }
    };

    // Poll immediately
    pollJobStatus();

    // Then poll every 3 seconds
    intervalId = setInterval(pollJobStatus, 3000);

    return () => clearInterval(intervalId);
  }, [jobId]);

  const retryJob = async () => {
    try {
      // Reset job status to pending
      await supabase
        .from('jobs')
        .update({ status: 'pending', error_message: null })
        .eq('id', jobId);
      
      setStatus('pending');
      setErrorMessage(null);
      setProgress(0);
      toast.success('Job queued for retry');
    } catch (error: any) {
      toast.error(`Retry failed: ${error.message}`);
    }
  };

  const downloadOutput = async () => {
    if (!outputUrl) return;

    try {
      const response = await fetch(outputUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `output-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      window.open(outputUrl, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status === 'pending' && <Clock className="h-5 w-5 text-yellow-500" />}
          {status === 'running' && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
          {status === 'done' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
          {status === 'failed' && <AlertCircle className="h-5 w-5 text-red-500" />}
          Job Status
        </CardTitle>
        <CardDescription>
          <Badge variant={
            status === 'pending' ? 'secondary' :
            status === 'running' ? 'default' :
            status === 'done' ? 'default' :
            'destructive'
          }>
            {status === 'pending' && 'Queued'}
            {status === 'running' && 'Processing'}
            {status === 'done' && 'Complete'}
            {status === 'failed' && 'Failed'}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(status === 'pending' || status === 'running') && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              {status === 'pending' ? 'Job queued, waiting to process...' : 'Processing your request...'}
            </p>
          </div>
        )}

        {status === 'done' && outputUrl && (
          <div className="space-y-2">
            <p className="text-sm text-green-600 font-medium">✓ Processing complete!</p>
            <Button onClick={downloadOutput} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Result
            </Button>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-2">
            <p className="text-sm text-red-600">{errorMessage}</p>
            <Button onClick={retryJob} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Job
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
