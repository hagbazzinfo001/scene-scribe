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

    const body = await req.json();
    const { project_id, prompt, input_image_url } = body;

    if (!project_id || !prompt) {
      return new Response(
        JSON.stringify({ error: 'project_id and prompt are required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const owner_id = user.id;

    // Check user credits (using profiles table)
    const CREDIT_COST = 25; // credits per mesh generation
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', owner_id)
      .single();

    if (!profile || profile.credits_remaining < CREDIT_COST) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits. Need 25 credits for mesh generation.' }),
        { status: 402, headers: corsHeaders }
      );
    }

    // Deduct credits from user profile
    await supabase
      .from('profiles')
      .update({ 
        credits_remaining: profile.credits_remaining - CREDIT_COST,
        credits_used: (profile.credits_used || 0) + CREDIT_COST
      })
      .eq('id', owner_id);

    // Insert mesh asset record
    const { data: asset, error: assetError } = await supabase
      .from('mesh_assets')
      .insert([{
        project_id,
        owner_id,
        prompt,
        input_image_path: input_image_url || null,
        status: 'pending',
        credits_cost: CREDIT_COST
      }])
      .select()
      .single();

    if (assetError || !asset) {
      console.error('Asset creation error:', assetError);
      return new Response(
        JSON.stringify({ error: 'Failed to create mesh asset record' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Enqueue job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert([{
        type: 'meshify',
        user_id: owner_id,
        project_id,
        asset_id: asset.id,
        input_data: { prompt, input_image_url },
        status: 'pending'
      }])
      .select()
      .single();

    if (jobError || !job) {
      console.error('Job creation error:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Create notification for user
    await supabase
      .from('notifications')
      .insert([{
        user_id: owner_id,
        type: 'info',
        title: 'Mesh Generation Started',
        message: `3D mesh generation for "${prompt}" has been queued and will be processed shortly.`
      }]);

    console.log(`Meshify job ${job.id} enqueued for asset ${asset.id}`);

    return new Response(
      JSON.stringify({ 
        asset_id: asset.id, 
        job_id: job.id, 
        status: 'pending',
        message: 'Mesh generation job enqueued successfully'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in meshify-enqueue function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});