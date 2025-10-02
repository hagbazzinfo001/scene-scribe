-- Enable pg_cron extension for scheduled job processing
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests from cron
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to trigger job worker via HTTP
CREATE OR REPLACE FUNCTION public.trigger_job_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call the job-worker edge function via pg_net
  PERFORM net.http_post(
    url := 'https://lmxspzfqhmdnqxtzusfy.supabase.co/functions/v1/job-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxteHNwemZxaG1kbnF4dHp1c2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NjI3MTIsImV4cCI6MjA3MjQzODcxMn0.mwgYmQXKBxDiQo8MdcS1wbNo8gWHQe5cuoDyS-N7fp4'
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule job worker to run every minute
SELECT cron.schedule(
  'process-pending-jobs',
  '* * * * *',
  $$SELECT public.trigger_job_worker()$$
);