# Job Processing System - Complete Implementation Guide

## Overview
This document outlines the persistent job processing system implemented for NollyAI Studio, which allows background processing of VFX tasks without requiring the user to keep their browser open.

## Architecture

### Components
1. **Job Queue (Database)** - `jobs` table in Supabase
2. **Job Worker** - Edge function that processes jobs every minute via cron
3. **Storage System** - Supabase Storage buckets for inputs/outputs
4. **Frontend Hooks** - `useJobStatus` for real-time job monitoring

## How It Works

### Step 1: User Uploads File
- User uploads file (video/audio/image) via `FileUploadZone` component
- File is uploaded to Supabase Storage bucket
- Returns public URL for the uploaded file

### Step 2: Create Job
- Frontend calls edge function (e.g., `simple-roto`, `simple-color-grade`, `simple-audio-clean`)
- Edge function creates a job record in `jobs` table with:
  - `type`: 'roto', 'color-grade', or 'audio-clean'
  - `status`: 'pending'
  - `input_data`: Contains file URL and processing parameters
  - `user_id`: Current authenticated user
- Returns `job_id` to frontend immediately

### Step 3: Job Worker Processes Job
- Cron job triggers `job-worker` edge function every minute
- Worker queries for jobs with `status = 'pending'`
- For each pending job:
  1. Updates status to 'running'
  2. Downloads input file from storage
  3. Calls AI service (Replicate API)
  4. Polls AI service for completion
  5. Downloads processed output
  6. Uploads output to `outputs` bucket
  7. Updates job with `status = 'done'` and output URL
  8. Creates user notification

### Step 4: Frontend Polls for Results
- `useJobStatus` hook polls `jobs` table every 3 seconds
- Updates UI with current job status
- When status is 'done', displays download button
- If status is 'failed', shows error message with retry option

## File Structure

### Edge Functions
```
supabase/functions/
├── simple-roto/index.ts          # Creates roto jobs
├── simple-color-grade/index.ts   # Creates color grading jobs
├── simple-audio-clean/index.ts   # Creates audio cleanup jobs
└── job-worker/index.ts           # Processes all pending jobs
```

### Frontend Components
```
src/
├── hooks/
│   └── useJobStatus.tsx          # Polls job status
├── pages/
│   ├── VFXAnimation.tsx          # Roto & Color Grading UI
│   └── AudioCleanup.tsx          # Audio processing UI
```

## Database Schema

### Jobs Table
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  type TEXT NOT NULL,           -- 'roto', 'color-grade', 'audio-clean'
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'done', 'failed'
  input_data JSONB NOT NULL,     -- { file_url, settings }
  output_data JSONB,             -- { output_url, storage_path }
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP
);
```

### Storage Buckets
- `vfx-assets` - Input videos/images for VFX
- `audio-uploads` - Input audio files
- `outputs` - Processed outputs (public bucket)

## Cron Configuration

### Database Function
```sql
CREATE OR REPLACE FUNCTION public.trigger_job_worker()
RETURNS void AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://lmxspzfqhmdnqxtzusfy.supabase.co/functions/v1/job-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>'
    ),
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql;
```

### Cron Schedule
```sql
SELECT cron.schedule(
  'job-worker-trigger',
  '* * * * *',  -- Every minute
  $$SELECT public.trigger_job_worker()$$
);
```

## Usage Examples

### Frontend - Roto Processing
```typescript
const handleRotoTrack = async () => {
  const { data } = await supabase.functions.invoke('simple-roto', {
    body: {
      videoUrl: selectedFiles.video,
      projectId: projectId,
      description: sceneDescription
    }
  });
  
  if (data?.job_id) {
    setCurrentJobId(data.job_id);
    // useJobStatus hook will start polling
  }
};
```

### Frontend - Monitoring Job
```typescript
const { job, isPolling } = useJobStatus(currentJobId);

{isPolling && <Loader2 className="animate-spin" />}
{job?.status === 'done' && (
  <Button asChild>
    <a href={job.output_data.output_url} download>
      Download Result
    </a>
  </Button>
)}
```

## Error Handling

### Fallback Mechanisms
1. **No Replicate API Key**: Returns original file with note
2. **API Error**: Catches error, returns original with error message
3. **Storage Upload Fails**: Throws error, marks job as failed
4. **Job Fails**: Updates status to 'failed' with error_message

### User Feedback
- Loading states during upload and job creation
- Progress indicators while processing
- Toast notifications for success/error
- Detailed error messages in UI
- Retry button for failed jobs

## Key Benefits

✅ **Persistent Processing** - Jobs continue even if user closes browser
✅ **Scalable** - Can process multiple jobs concurrently
✅ **Reliable** - Automatic retries and error handling
✅ **User-Friendly** - Real-time status updates and notifications
✅ **Cost-Effective** - Only processes when needed via cron
✅ **Extensible** - Easy to add new job types

## Adding New Job Types

1. Create edge function in `supabase/functions/new-plugin/index.ts`
2. Function creates job with unique `type` value
3. Add processing logic to `job-worker/index.ts` switch statement
4. Update frontend to use `useJobStatus` hook
5. Add function to `supabase/config.toml`

## Testing

### Manual Testing
1. Upload a file in the UI
2. Submit job
3. Check job created in database: `SELECT * FROM jobs ORDER BY created_at DESC LIMIT 1;`
4. Wait for cron (max 60 seconds)
5. Verify job status updated to 'running', then 'done'
6. Check output file in storage bucket
7. Verify download link works

### Monitoring
- Check edge function logs: Supabase Dashboard → Edge Functions → job-worker → Logs
- Check job table: `SELECT * FROM jobs WHERE status = 'failed';`
- Check notifications: `SELECT * FROM notifications ORDER BY created_at DESC;`

## Troubleshooting

### Jobs Stay Pending
- Check cron is running: `SELECT * FROM cron.job;`
- Check pg_net extension enabled
- Verify job-worker function deployed
- Check function logs for errors

### Jobs Fail Immediately
- Verify Replicate API key set in secrets
- Check input file URL is accessible
- Verify storage bucket permissions
- Check function logs for detailed error

### No Output File
- Verify `outputs` bucket exists and is public
- Check storage quota not exceeded
- Verify file upload successful in logs

## Production Checklist

- [ ] Replicate API key configured
- [ ] All storage buckets created
- [ ] RLS policies configured correctly
- [ ] Cron job scheduled and active
- [ ] pg_net extension enabled
- [ ] Edge functions deployed
- [ ] Error notifications working
- [ ] Download links tested
- [ ] Load testing completed
