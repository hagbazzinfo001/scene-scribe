import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    const body = await req.json();
    const { project_id, image_url, prompt, target_faces, file_type, simplify } = body;

    if (!image_url && !prompt) {
      return new Response(
        JSON.stringify({ error: 'Either image_url or prompt is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check user credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', user.id)
      .single();

    if (!profile || profile.credits_remaining < 25) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits. Need 25 credits.' }),
        { status: 402, headers: corsHeaders }
      );
    }

    // Deduct credits
    await supabase
      .from('profiles')
      .update({ credits_remaining: profile.credits_remaining - 25 })
      .eq('id', user.id);

    console.log('Creating mesh generation job for:', { image_url, prompt });

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        project_id: project_id,
        type: 'mesh',
        status: 'pending',
        input_data: { 
          image_url, 
          prompt,
          target_faces: target_faces || 10000,
          file_type: file_type || 'glb',
          simplify: simplify || false
        }
      })
      .select()
      .single();

    if (jobError) {
      throw jobError;
    }

    console.log('Created mesh job:', job.id);

    return new Response(JSON.stringify({
      success: true,
      job_id: job.id,
      message: 'Mesh generation job queued'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in mesh-generator function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});