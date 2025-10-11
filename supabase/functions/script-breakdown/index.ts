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

// Helper to extract JSON from LLM response (handles markdown code blocks)
function extractJSON(text: string) {
  // Try to find JSON in markdown code block first
  if (text.includes('```json')) {
    const start = text.indexOf('```json') + 7;
    const end = text.lastIndexOf('```');
    if (start > 6 && end > start) {
      return text.slice(start, end).trim();
    }
  }
  
  // Try generic code block
  if (text.includes('```')) {
    const start = text.indexOf('```') + 3;
    const end = text.lastIndexOf('```');
    if (start > 2 && end > start) {
      return text.slice(start, end).trim();
    }
  }
  
  // Try to find raw JSON
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    return text.slice(jsonStart, jsonEnd + 1);
  }
  
  throw new Error("Could not extract JSON from LLM output");
}

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

    const { script_content, project_id, depth = 'normal' } = await req.json();

    if (!script_content) {
      return new Response(
        JSON.stringify({ error: 'script_content is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        project_id: project_id || null,
        type: 'script-breakdown',
        status: 'pending',
        input_data: { script_content, depth }
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

    // Job created - worker will process it
    console.log('Created script breakdown job:', job.id);
    
    return new Response(JSON.stringify({
      success: true,
      job_id: job.id,
      message: 'Script breakdown job queued for processing'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in script-breakdown function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
