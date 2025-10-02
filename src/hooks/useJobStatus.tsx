import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Job {
  id: string;
  type: string;
  status: string;
  output_data?: any;
  error_message?: string;
}

export function useJobStatus(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    setIsPolling(true);
    let intervalId: NodeJS.Timeout;

    const pollJobStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) throw error;

        setJob(data);

        // Stop polling if job is done or failed
        if (data.status === 'done' || data.status === 'failed') {
          setIsPolling(false);
          clearInterval(intervalId);

          if (data.status === 'done') {
            toast.success(`Job completed: ${data.type}`);
          } else {
            toast.error(`Job failed: ${data.error_message || 'Unknown error'}`);
          }
        }
      } catch (error: any) {
        console.error('Error polling job status:', error);
        toast.error(`Failed to check job status: ${error.message}`);
        setIsPolling(false);
        clearInterval(intervalId);
      }
    };

    // Poll immediately
    pollJobStatus();

    // Then poll every 3 seconds
    intervalId = setInterval(pollJobStatus, 3000);

    return () => {
      clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [jobId]);

  return { job, isPolling };
}
