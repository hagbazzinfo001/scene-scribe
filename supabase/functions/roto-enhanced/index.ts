import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const REPLICATE_TOKEN = Deno.env.get('REPLICATE_API_KEY');
const DEFAULT_ROTO_MODEL = Deno.env.get('DEFAULT_ROTO_MODEL') || 'cjwbw/rembg:d92b9dd3d4c5b6b2b41bf65a670e1aa1b51fb2b5f6dfe9c5b5c8c5ad7a06a4b7';

const isValidUUID = (id?: string) =>
  !!id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

async function replicateRun(modelVersion: string, input: any) {
  const resp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { 
      "Authorization": `Token ${REPLICATE_TOKEN}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ version: modelVersion, input })
  });
  const body = await resp.json();
  if (!resp.ok) throw new Error(JSON.stringify(body));
  return body;
}

async function pollPrediction(predictionId: string, interval = 3000, maxAttempts = 100) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const resp = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { "Authorization": `Token ${REPLICATE_TOKEN}` }
    });
    const body = await resp.json();
    
    console.log(`Poll attempt ${attempts + 1}: Status ${body.status}`);
    
    if (body.status === "succeeded") return body;
    if (body.status === "failed") throw new Error(`Prediction failed: ${JSON.stringify(body)}`);
    if (body.status === "canceled") throw new Error(`Prediction was canceled: ${JSON.stringify(body)}`);
    
    await new Promise(r => setTimeout(r, interval));
    attempts++;
  }
  throw new Error(`Prediction timed out after ${maxAttempts} attempts`);
}

async function validateInput(fileUrl: string) {
  if (!fileUrl) {
    return { valid: false, errors: ["Missing file URL"] };
  }
  
  try {
    const response = await fetch(fileUrl, { method: 'HEAD' });
    if (!response.ok) {
      return { valid: false, errors: ["File URL not accessible"] };
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('video/')) {
      return { valid: false, errors: ["File must be a video"] };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, errors: [`File validation failed: ${error instanceof Error ? error.message : String(error)}`] };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!REPLICATE_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'REPLICATE_API_KEY not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

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

    const { project_id, file_path, file_url, frame_range, scene_description, model_version } = await req.json();
    const projectContext = isValidUUID(project_id) ? project_id : null;

    // Validate input
    const validation = await validateInput(file_url);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.errors }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        project_id: projectContext,
        type: 'roto',
        status: 'queued',
        payload: { file_path, file_url, frame_range, scene_description, model_version },
        input_data: { file_path, file_url, frame_range, scene_description, model_version }
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

    try {
      // Update job status to running
      await supabase
        .from('jobs')
        .update({ status: 'running' })
        .eq('id', job.id);

      console.log('Starting Replicate prediction for video:', file_url);

      // Call Replicate API
      const modelToUse = model_version || DEFAULT_ROTO_MODEL;
      const prediction = await replicateRun(modelToUse, { 
        video: file_url,
        // Add any additional parameters based on the model
      });

      console.log('Replicate prediction started:', prediction.id);

      // Update job with prediction ID
      await supabase
        .from('jobs')
        .update({ 
          status: 'processing_cloud',
          result: { predictionId: prediction.id }
        })
        .eq('id', job.id);

      // Poll for completion
      const result = await pollPrediction(prediction.id);
      console.log('Replicate prediction completed:', result);

      // Get output URL(s)
      const outputs = result.output;
      const outputUrl = Array.isArray(outputs) ? outputs[0] : outputs;

      if (!outputUrl) {
        throw new Error('No output URL received from Replicate');
      }

      // Download the result
      console.log('Downloading result from:', outputUrl);
      const outputResponse = await fetch(outputUrl);
      if (!outputResponse.ok) {
        throw new Error(`Failed to download output: ${outputResponse.status}`);
      }

      const buffer = await outputResponse.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Upload to Supabase storage
      const outKey = `${projectContext || 'global'}/${job.id}-roto-output.mp4`;
      const { error: uploadErr } = await supabase.storage
        .from('outputs')
        .upload(outKey, uint8Array, { 
          contentType: 'video/mp4',
          upsert: true 
        });

      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        throw new Error(`Failed to upload output: ${uploadErr.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('outputs')
        .getPublicUrl(outKey);

      const publicUrl = publicUrlData.publicUrl;

      // Update job with success
      await supabase
        .from('jobs')
        .update({
          status: 'done',
          output_path: outKey,
          output_data: { publicUrl, outputUrl: publicUrl },
          result: { 
            predictionId: prediction.id, 
            publicUrl,
            outputUrl: publicUrl
          },
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);

      // Create notification
      try {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Roto Processing Complete',
          message: 'Your video rotoscoping has been completed successfully.',
          type: 'job_completed'
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }

      // Save to user_assets for easy access
      try {
        await supabase.from('user_assets').insert({
          user_id: user.id,
          project_id: projectContext,
          filename: `${job.id}-roto-output.mp4`,
          file_url: publicUrl,
          file_type: 'video/mp4',
          storage_path: outKey,
          metadata: {
            jobId: job.id,
            originalFile: file_url,
            predictionId: prediction.id
          }
        });
      } catch (assetError) {
        console.error('Failed to save asset:', assetError);
      }

      return new Response(JSON.stringify({
        ok: true,
        jobId: job.id,
        outputUrl: publicUrl,
        downloadUrl: publicUrl
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Roto processing error:', error);
      
      // Update job with error
      await supabase
        .from('jobs')
        .update({
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        })
        .eq('id', job.id);

      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : String(error),
          jobId: job.id 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('Error in roto-enhanced function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});