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

    const { project_id, video_path, style_reference, options } = await req.json();

    if (!video_path || !style_reference) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: video_path and style_reference' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if Replicate API key is available
    const replicateApiKey = Deno.env.get('REPLICATE_API_KEY');
    if (!replicateApiKey) {
      return new Response(
        JSON.stringify({ 
          status: 'engine_unavailable', 
          message: 'Color grading engine is currently unavailable. Please configure Replicate API key in Supabase secrets.' 
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
        type: 'color-grade',
        input_data: {
          video_path,
          style_reference,
          options: options || {}
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
      // Get signed download URL for input video
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('user_video')
        .createSignedUrl(video_path, 3600);

      if (downloadError) {
        throw new Error(`Failed to get download URL: ${downloadError.message}`);
      }

      // Call Replicate API for video style transfer/color grading
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${replicateApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: "7af9a66f36f97fee2fece7dcc927551a951f0022cbdd23747b9212f23fc17021", // Video style transfer model
          input: {
            video: downloadData.signedUrl,
            style: style_reference,
            strength: options?.strength || 0.8,
            fps: options?.fps || 24
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
      const maxAttempts = 120; // 10 minutes max for video processing

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
          
          // Generate output file paths
          const timestamp = Date.now();
          const gradedVideoPath = `${user.id}/graded_videos/${timestamp}-graded.mp4`;
          const previewPath = `${user.id}/previews/${timestamp}-grade-preview.mp4`;

          // In a real implementation, you would download the results from Replicate
          // and upload them to your storage. For this example, we'll use the Replicate URLs
          const gradedVideoUrl = pollData.output?.[0] || pollData.output;
          const previewUrl = gradedVideoUrl; // Use same video as preview

          // Update job with results
          await supabase
            .from('jobs')
            .update({
              status: 'done',
              output_data: {
                graded_video_url: gradedVideoUrl,
                preview_url: previewUrl,
                style_applied: style_reference,
                processing_settings: options || {}
              },
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);

          // Create graded video asset record
          await supabase
            .from('video_files')
            .insert({
              user_id: user.id,
              project_id: project_id,
              filename: `graded-${timestamp}.mp4`,
              file_url: gradedVideoUrl,
              file_size: null // Would be populated in real implementation
            });

          // Create notification
          await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              type: 'job_completed',
              title: 'Color Grading Complete',
              message: `Your video has been color graded with ${style_reference} style.`
            });

          return new Response(
            JSON.stringify({
              success: true,
              job_id: job.id,
              graded_video_url: gradedVideoUrl,
              preview_url: previewUrl,
              style_applied: style_reference,
              message: 'Color grading completed successfully'
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
      console.error('Color grading error:', error);
      
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
          error: 'Color grading failed', 
          details: error.message,
          job_id: job.id
        }),
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('Error in vfx-color-grade function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});