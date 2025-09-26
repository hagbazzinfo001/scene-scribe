import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BackgroundJob {
  id: string;
  type: string;
  status: string;
}

export function useBackgroundProcessing() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeJobsRef = useRef<Set<string>>(new Set());

  const startMonitoring = (jobId: string, jobType: string) => {
    activeJobsRef.current.add(jobId);
    
    // Start polling if not already running
    if (!intervalRef.current) {
      intervalRef.current = setInterval(checkJobStatus, 5000);
    }

    // Show notification that job will continue in background
    toast.info(
      `${jobType} job started. Processing will continue in the background even if you navigate away.`,
      { duration: 5000 }
    );
  };

  const stopMonitoring = (jobId: string) => {
    activeJobsRef.current.delete(jobId);
    
    // Stop polling if no active jobs
    if (activeJobsRef.current.size === 0 && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const checkJobStatus = async () => {
    if (activeJobsRef.current.size === 0) return;

    try {
      const jobIds = Array.from(activeJobsRef.current);
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('id, type, status, result, error')
        .in('id', jobIds)
        .in('status', ['done', 'error']);

      if (error) {
        console.error('Error checking job status:', error);
        return;
      }

      jobs?.forEach((job: BackgroundJob) => {
        if (job.status === 'done') {
          toast.success(`${job.type} job completed successfully!`, {
            action: {
              label: 'View Results',
              onClick: () => window.location.reload()
            }
          });
          stopMonitoring(job.id);
        } else if (job.status === 'error') {
          toast.error(`${job.type} job failed. Please try again.`);
          stopMonitoring(job.id);
        }
      });
    } catch (error) {
      console.error('Background processing error:', error);
    }
  };

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && activeJobsRef.current.size > 0) {
        toast.info(
          `${activeJobsRef.current.size} background job(s) will continue processing.`,
          { duration: 3000 }
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    startMonitoring,
    stopMonitoring,
    activeJobs: Array.from(activeJobsRef.current)
  };
}