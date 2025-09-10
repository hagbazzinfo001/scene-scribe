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

const isValidUUID = (id?: string) =>
  !!id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

// Helper to extract first JSON substring from a blob of text
function extractJSON(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  throw new Error("Could not extract JSON from LLM output");
}

async function validateInput(scriptContent: string) {
  if (!scriptContent || scriptContent.trim().length < 10) {
    return { valid: false, errors: ["Script content too short or empty"] };
  }
  return { valid: true };
}

async function runScriptBreakdown(scriptContent: string, projectId?: string) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const prompt = `You are a Nollywood-savvy script breakdown assistant. Analyze this screenplay and return ONLY valid JSON following this exact schema:

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
  "suggested_shots": [
    {
      "scene_id": "string",
      "shot_id": "string", 
      "description": "string",
      "camera_angle": "string",
      "duration_est_seconds": number,
      "priority": "string"
    }
  ],
  "asset_list": [
    {
      "name": "string",
      "type": "string",
      "suggested_source": "string",
      "estimated_quantity": number,
      "notes": "string"
    }
  ]
}

Script text:
${scriptContent}`;

  const startTime = Date.now();
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: 'You are a script breakdown assistant. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 3000,
      }),
    });

    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    const content = data.choices[0].message.content;
    
    // Try to extract and parse JSON
    const jsonText = extractJSON(content);
    const parsed = JSON.parse(jsonText);

    return {
      result: parsed,
      metrics: {
        success: true,
        tokensUsed: data.usage?.total_tokens || 0,
        responseTimeMs: responseTime,
        provider: 'openai',
        model: 'gpt-5-2025-08-07'
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    throw {
      error: error.message,
      metrics: {
        success: false,
        errorType: error.message,
        responseTimeMs: responseTime,
        provider: 'openai',
        model: 'gpt-5-2025-08-07'
      }
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { script_content, project_id, depth = 'detailed' } = await req.json();
    const projectContext = isValidUUID(project_id) ? project_id : null;

    // Validate input
    const validation = await validateInput(script_content);
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
        type: 'script_breakdown',
        status: 'running',
        payload: { script_content, depth },
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

    try {
      // Run script breakdown
      const breakdownResult = await runScriptBreakdown(script_content, projectContext);
      
      // Update job with results
      await supabase
        .from('jobs')
        .update({
          status: 'done',
          result: breakdownResult.result,
          output_data: breakdownResult.result,
          completed_at: new Date().toISOString(),
          processing_time_ms: breakdownResult.metrics.responseTimeMs,
          tokens_used: breakdownResult.metrics.tokensUsed,
          cost_estimate: breakdownResult.metrics.tokensUsed * 0.00002 // Rough estimate
        })
        .eq('id', job.id);

      // Create notification
      try {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Script Breakdown Complete',
          message: 'Your script breakdown has been completed successfully.',
          type: 'job_completed'
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }

      return new Response(JSON.stringify({
        ok: true,
        jobId: job.id,
        breakdown: breakdownResult.result,
        metrics: breakdownResult.metrics
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Script breakdown error:', error);
      
      // Update job with error
      await supabase
        .from('jobs')
        .update({
          status: 'error',
          error: error.error || error.message,
          processing_time_ms: error.metrics?.responseTimeMs
        })
        .eq('id', job.id);

      return new Response(
        JSON.stringify({ 
          error: error.error || error.message,
          jobId: job.id 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('Error in script-breakdown-enhanced function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});