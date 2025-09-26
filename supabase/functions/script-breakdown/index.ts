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

// Helper to extract JSON from LLM response
function extractJSON(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
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
        type: 'script_breakdown',
        status: 'running',
        payload: { script_content, depth }
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

    // Process with Replicate LLaMA
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

    const Replicate = (await import('https://esm.sh/replicate@0.25.2')).default;
    const replicate = new Replicate({ auth: replicateApiKey });

    const systemPrompt = `You are a professional Nollywood script breakdown assistant. Analyze this screenplay and return ONLY valid JSON with this exact structure:

{
  "scenes": [
    {
      "scene_id": "string",
      "start_line": number,
      "end_line": number,
      "short_description": "string",
      "location": "string",
      "time_of_day": "string",
      "characters": ["string"],
      "props": ["string"]
    }
  ],
  "characters": [
    {
      "name": "string",
      "description": "string",
      "scenes": ["scene_id"]
    }
  ],
  "locations": [
    {
      "name": "string",
      "type": "string",
      "scenes": ["scene_id"]
    }
  ],
  "props": [
    {
      "name": "string",
      "category": "string",
      "scenes": ["scene_id"]
    }
  ],
  "summary": {
    "total_scenes": number,
    "estimated_shoot_days": number,
    "budget_category": "low|medium|high"
  }
}

Focus on practical Nollywood production elements.`;

    try {
    const output = await replicate.run(
      "meta/llama-2-7b-chat:8e6975e5ed6174911a6ff3d60540dfd4844201974602551e10e9e87ab143d81e",
      {
        input: {
          prompt: `${systemPrompt}\n\nScript content:\n${script_content}`,
          max_new_tokens: 2000,
          top_p: 0.9,
          repetition_penalty: 1.15
        }
      }
    );

      const content = Array.isArray(output) ? output.join('') : output;
      const jsonText = extractJSON(content);
      const parsed = JSON.parse(jsonText);

      // Update job with results
      await supabase.from('jobs').update({
        status: 'done',
        result: parsed,
        completed_at: new Date().toISOString()
      }).eq('id', job.id);

      // Create notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'job_completed',
        title: 'Script Breakdown Complete',
        message: `Your script breakdown is ready with ${parsed.scenes?.length || 0} scenes analyzed.`
      });

      return new Response(JSON.stringify({
        success: true,
        job_id: job.id,
        result: parsed
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Script breakdown error:', error);
      
      await supabase.from('jobs').update({
        status: 'error',
        error: error.message
      }).eq('id', job.id);

      return new Response(JSON.stringify({
        error: 'Script breakdown failed',
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in script-breakdown function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});