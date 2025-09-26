import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    const { type, input_data, project_id, payload } = await req.json();

    if (!type || !input_data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, input_data' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate job type
    const validJobTypes = ['roto', 'auto-rigger', 'color-grade', 'script-analysis', 'audio-cleanup', 'breakdown', 'rig', 'generate_thumbnail'];
    if (!validJobTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: `Invalid job type. Valid types: ${validJobTypes.join(', ')}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create job record
    const { data: job, error: createError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        project_id: project_id || null,
        type: type,
        input_data: input_data,
        payload: payload || input_data, // Support both formats
        status: 'pending'
      })
      .select()
      .single();

    if (createError) {
      console.error('Create job error:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job', details: createError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Create notification for user
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'job_queued',
        title: 'Job Queued',
        message: `Your ${type} job has been queued for processing.`
      });

    return new Response(
      JSON.stringify({
        success: true,
        job,
        message: 'Job queued successfully'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enqueue-job function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});