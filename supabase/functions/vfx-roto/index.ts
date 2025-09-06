import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { project_id, file_path, frame_range, scene_description } = await req.json();

    if (!project_id || !file_path || !scene_description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: project_id, file_path, scene_description' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if Replicate API key is available
    const replicateApiKey = Deno.env.get('REPLICATE_API_KEY');
    if (!replicateApiKey) {
      return new Response(
        JSON.stringify({ 
          status: 'engine_unavailable', 
          message: 'ROTO/Tracking engine is currently unavailable. Please configure Replicate API key in Supabase secrets.' 
        }),
        { status: 503, headers: corsHeaders }
      );
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        project_id: project_id,
        type: 'roto',
        input_data: {
          file_path,
          frame_range: frame_range || [0, -1],
          scene_description
        },
        status: 'running'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job' }),
        { status: 500, headers: corsHeaders }
      );
    }

    try {
      // Get signed download URL for input file
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('user_video')
        .createSignedUrl(file_path, 3600);

      if (downloadError) {
        throw new Error(`Failed to get download URL: ${downloadError.message}`);
      }

      // Call Replicate API for SAM2 segmentation
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${replicateApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: "43abb3d0e20ae3074b8b59b96fd8e3b6e8d38ba32b8e1d85dc7c23b9a71d4c8c", // SAM2 model
          input: {
            video: downloadData.signedUrl,
            text_prompt: scene_description,
            frame_range: frame_range || [0, -1]
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.statusText}`);
      }

      const prediction = await response.json();
      
      // Poll for completion (in a real system, this would be handled by a worker)
      let completed = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: {
            'Authorization': `Token ${replicateApiKey}`,
          },
        });

        const pollData = await pollResponse.json();
        
        if (pollData.status === 'succeeded') {
          completed = true;
          
          // Generate mask file path
          const timestamp = Date.now();
          const maskPath = `${user.id}/roto_masks/${timestamp}-mask.mp4`;
          const trackPointsPath = `${user.id}/roto_tracks/${timestamp}-tracks.json`;
          const previewPath = `${user.id}/previews/${timestamp}-roto-preview.mp4`;

          // In a real implementation, you would download the results from Replicate
          // and upload them to your storage. For this example, we'll use the Replicate URLs
          const maskUrl = pollData.output?.mask_video || pollData.output?.[0];
          const trackingData = pollData.output?.tracking_data || '{}';

          // Update job with results
          await supabase
            .from('jobs')
            .update({
              status: 'done',
              output_data: {
                mask_url: maskUrl,
                track_points_url: trackingData,
                preview_url: maskUrl // Use mask as preview for now
              },
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);

          // Create notification
          await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              type: 'job_completed',
              title: 'ROTO/Tracking Complete',
              message: 'Your video segmentation and tracking job has completed successfully.'
            });

          return new Response(
            JSON.stringify({
              success: true,
              job_id: job.id,
              mask_url: maskUrl,
              track_points_url: trackingData,
              preview_url: maskUrl,
              message: 'ROTO/Tracking processing completed'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
          
        } else if (pollData.status === 'failed') {
          throw new Error(`Replicate processing failed: ${pollData.error}`);
        }
        
        attempts++;
      }

      if (!completed) {
        throw new Error('Processing timeout - job is still running in background');
      }

    } catch (error) {
      console.error('ROTO processing error:', error);
      
      // Update job with error
      await supabase
        .from('jobs')
        .update({
          status: 'error',
          error_message: error.message
        })
        .eq('id', job.id);

      return new Response(
        JSON.stringify({ 
          error: 'ROTO processing failed', 
          details: error.message,
          job_id: job.id
        }),
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('Error in vfx-roto function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});