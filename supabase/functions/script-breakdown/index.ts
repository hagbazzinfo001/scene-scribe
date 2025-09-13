import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

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

    // Process with Anthropic Claude
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      await supabase.from('jobs').update({ 
        status: 'error', 
        error: 'Anthropic API key not configured' 
      }).eq('id', job.id);
      
      return new Response(
        JSON.stringify({ error: 'Anthropic API key not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const prompt = `You are a Nollywood script breakdown assistant. Analyze this screenplay and return ONLY valid JSON with this exact structure:

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

Script content:
${script_content}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 3000,
          system: 'You are a professional Nollywood script breakdown assistant. Analyze the screenplay and return ONLY valid JSON with the exact structure specified. Focus on practical production elements.',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Anthropic API error');
      }

      const content = data.content[0].text;
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