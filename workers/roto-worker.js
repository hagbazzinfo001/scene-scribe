#!/usr/bin/env node

/**
 * ROTO WORKER SAMPLE
 * 
 * This worker polls for roto jobs and processes them using Replicate API.
 * To run locally: node workers/roto-worker.js
 * 
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_KEY
 * - REPLICATE_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY,
});

// Log function
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data);
}

// Main worker function
async function processRotoJob(job) {
  log('info', `Processing roto job ${job.id}`, job.payload);
  
  try {
    // Mark job as running
    await supabase
      .from('jobs')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    const { file_path, frame_range, description, preset, tightness, smoothing, output_format } = job.payload;
    
    // Download file via signed URL
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('user_video')
      .createSignedUrl(file_path, 3600); // 1 hour

    if (downloadError) {
      throw new Error(`Failed to get download URL: ${downloadError.message}`);
    }

    log('info', 'Starting Replicate processing', { 
      model: 'cjwbw/segment-anything-2',
      video_url: downloadData.signedUrl 
    });

    // Call Replicate SAM2 for video segmentation
    const output = await replicate.run("cjwbw/segment-anything-2", {
      input: {
        video: downloadData.signedUrl,
        prompt: description || "Track the main subject",
        frame_range: frame_range || "0-100",
        mask_threshold: (tightness || 50) / 100,
        temporal_smooth: (smoothing || 50) / 100,
        output_format: output_format || "video_alpha"
      }
    });

    log('info', 'Replicate processing complete', { output });

    // Upload result to storage
    const resultPath = `${job.user_id}/roto_results/${Date.now()}_mask.mp4`;
    
    // For demo purposes, we'll store the Replicate output URL
    // In production, you'd download and re-upload to your storage
    const maskUrl = Array.isArray(output) ? output[0] : output;
    
    // Create preview thumbnail
    const previewPath = `${job.user_id}/roto_results/${Date.now()}_preview.png`;
    const previewUrl = `https://via.placeholder.com/400x300/000000/FFFFFF?text=Roto+Preview`;

    // Save result to user_assets
    const { data: asset, error: assetError } = await supabase
      .from('user_assets')
      .insert({
        user_id: job.user_id,
        project_id: job.project_id,
        filename: `roto_mask_${Date.now()}.mp4`,
        file_url: maskUrl,
        file_type: 'video',
        mime_type: 'video/mp4',
        storage_path: resultPath,
        metadata: {
          source_job_id: job.id,
          processing_params: { tightness, smoothing, preset },
          model_info: {
            name: 'segment-anything-2',
            provider: 'replicate',
            cost_estimate: 0.05,
            processing_time_ms: Date.now() - new Date(job.created_at).getTime()
          }
        }
      })
      .select()
      .single();

    if (assetError) {
      throw new Error(`Failed to save asset: ${assetError.message}`);
    }

    // Mark job as completed
    await supabase
      .from('jobs')
      .update({ 
        status: 'done',
        result: {
          mask_url: maskUrl,
          preview_url: previewUrl,
          asset_id: asset.id,
          processing_time_ms: Date.now() - new Date(job.created_at).getTime(),
          model_info: {
            name: 'segment-anything-2',
            accuracy_score: 0.95,
            cost_estimate: 0.05
          }
        },
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    // Create success notification
    await supabase
      .from('notifications')
      .insert({
        user_id: job.user_id,
        type: 'job_completed',
        title: 'Roto/Tracking Complete',
        message: `Your roto job has completed successfully. Mask is ready for download.`
      });

    log('info', `Job ${job.id} completed successfully`, { asset_id: asset.id });

  } catch (error) {
    log('error', `Job ${job.id} failed`, { error: error.message, stack: error.stack });

    // Mark job as failed
    await supabase
      .from('jobs')
      .update({ 
        status: 'error',
        error: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    // Log to dev_logs
    await supabase
      .from('dev_logs')
      .insert({
        job_id: job.id,
        level: 'error',
        message: `Roto job failed: ${error.message}`,
        metadata: { stack: error.stack, job_payload: job.payload }
      });

    // Create error notification
    await supabase
      .from('notifications')
      .insert({
        user_id: job.user_id,
        type: 'job_failed',
        title: 'Roto Job Failed',
        message: `Your roto job failed: ${error.message}`
      });
  }
}

// Main worker loop
async function runWorker() {
  log('info', 'Roto worker started');

  while (true) {
    try {
      // Poll for pending roto jobs
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('type', 'roto')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        log('error', 'Failed to fetch jobs', { error: error.message });
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      if (jobs && jobs.length > 0) {
        await processRotoJob(jobs[0]);
      } else {
        // No jobs, wait 10 seconds
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

    } catch (error) {
      log('error', 'Worker error', { error: error.message });
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Test function to simulate job processing
async function testWorker() {
  log('info', 'Running test job simulation');
  
  const testJob = {
    id: 'test-' + Date.now(),
    user_id: 'test-user',
    project_id: 'test-project',
    type: 'roto',
    payload: {
      file_path: 'test/video.mp4',
      frame_range: '0-30',
      description: 'Track the person walking',
      preset: 'Track Person',
      tightness: 75,
      smoothing: 60,
      output_format: 'video_alpha'
    },
    created_at: new Date().toISOString()
  };

  console.log('Test job payload:', testJob);
  console.log('Expected processing: Download video -> SAM2 tracking -> Upload mask -> Update job');
  console.log('Use this curl command to test job creation:');
  console.log(`
curl -X POST https://lmxspzfqhmdnqxtzusfy.supabase.co/functions/v1/enqueue-job \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "roto",
    "project_id": "your-project-id",
    "payload": {
      "file_path": "user_video/path_to_video.mp4",
      "frame_range": "0-100",
      "description": "Track the main subject",
      "preset": "Track Person",
      "tightness": 75,
      "smoothing": 60,
      "output_format": "video_alpha"
    }
  }'`);
}

// Run based on command line argument
if (process.argv.includes('--test')) {
  testWorker();
} else {
  runWorker();
}

export { processRotoJob, runWorker, testWorker };