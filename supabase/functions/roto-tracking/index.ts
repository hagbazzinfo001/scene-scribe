import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
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

    const { 
      file_path, 
      project_id, 
      frame_range, 
      description, 
      preset = 'track_person',
      tightness = 50,
      smoothing = 50,
      output_format = 'video_with_alpha'
    } = await req.json();

    if (!file_path) {
      return new Response(
        JSON.stringify({ error: 'file_path is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if this is a status check
    const { job_id } = await req.json();
    if (job_id) {
      const { data: job } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', job_id)
        .eq('user_id', user.id)
        .single();

      if (!job) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: corsHeaders }
        );
      }

      return new Response(JSON.stringify({
        job_id: job.id,
        status: job.status,
        result: job.result,
        error: job.error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        project_id: project_id || null,
        type: 'roto_tracking',
        status: 'running',
        payload: { 
          file_path, 
          frame_range, 
          description, 
          preset, 
          tightness, 
          smoothing, 
          output_format 
        }
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Get file URL for Replicate
    const { data: urlData, error: urlError } = await supabase.storage
      .from('video-uploads')
      .createSignedUrl(file_path, 3600);

    if (urlError || !urlData) {
      await supabase.from('jobs').update({ 
        status: 'error', 
        error: 'Failed to get video URL' 
      }).eq('id', job.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to get video URL' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Process with Replicate
    const replicateApiKey = Deno.env.get('REPLICATE_API_KEY');
    if (!replicateApiKey) {
      await supabase.from('jobs').update({ 
        status: 'error', 
        error: 'Replicate API key not configured' 
      }).eq('id', job.id);
      
      return new Response(
        JSON.stringify({ error: 'Replicate API key not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    try {
      const replicate = new Replicate({ auth: replicateApiKey });
      
      // Use robust video matting model
      const output = await replicate.run(
        "chenxwh/rvm:fb0a94ca9e90e04d95fec24f4b95a7f481d59efc97fbaaa07b2f8cf23ba1b7e8",
        {
          input: {
            video: urlData.signedUrl,
            downsample_ratio: 0.25
          }
        }
      );

      console.log('Replicate output:', output);

      // Download and store result
      const outputUrl = Array.isArray(output) ? output[0] : output;
      if (!outputUrl) {
        throw new Error('No output from Replicate');
      }

      // Download the result
      const resultResponse = await fetch(outputUrl);
      const resultBuffer = new Uint8Array(await resultResponse.arrayBuffer());
      
      // Upload to storage
      const outputPath = `${user.id}/${project_id || 'global'}/${job.id}-roto-output.mp4`;
      const { error: uploadError } = await supabase.storage
        .from('vfx-assets')
        .upload(outputPath, resultBuffer, {
          contentType: 'video/mp4'
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Create asset record
      const { data: assetUrl } = await supabase.storage
        .from('vfx-assets')
        .createSignedUrl(outputPath, 3600 * 24); // 24 hour access

      const { error: assetError } = await supabase
        .from('user_assets')
        .insert({
          user_id: user.id,
          project_id: project_id || null,
          filename: `${job.id}-roto-output.mp4`,
          file_type: 'video',
          file_url: assetUrl?.signedUrl || '',
          storage_path: outputPath,
          metadata: {
            job_id: job.id,
            type: 'roto_tracking',
            original_file: file_path
          }
        });

      if (assetError) {
        console.error('Failed to create asset record:', assetError);
      }

      // Update job with results
      await supabase.from('jobs').update({
        status: 'done',
        result: {
          output_url: assetUrl?.signedUrl,
          storage_path: outputPath,
          original_output: outputUrl
        },
        completed_at: new Date().toISOString()
      }).eq('id', job.id);

      // Create notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'job_completed',
        title: 'Roto Tracking Complete',
        message: 'Your video tracking and masking is ready for download.'
      });

      return new Response(JSON.stringify({
        success: true,
        job_id: job.id,
        result: {
          output_url: assetUrl?.signedUrl,
          storage_path: outputPath
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Roto tracking error:', error);
      
      await supabase.from('jobs').update({
        status: 'error',
        error: error.message
      }).eq('id', job.id);

      return new Response(JSON.stringify({
        error: 'Roto tracking failed',
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in roto-tracking function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});