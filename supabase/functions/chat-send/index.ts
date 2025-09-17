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

async function trackUsage(metrics: any, projectId?: string) {
  try {
    const safeProjectId = (projectId && isValidUUID(projectId)) ? projectId : null;
    await supabase.from("ai_usage_analytics").insert({
      provider: metrics.provider || 'openai',
      model: metrics.model || 'gpt-5-2025-08-07',
      endpoint: metrics.endpoint || 'chat-send',
      tokens_used: metrics.tokensUsed || null,
      cost_estimate: metrics.costEstimate || null,
      response_time_ms: metrics.responseTimeMs || null,
      success: metrics.success ?? true,
      error_type: metrics.errorType || null,
      project_id: safeProjectId
    });
  } catch (err) {
    console.error("trackUsage failed", err);
  }
}

async function callAI(message: string, projectContext?: string) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    return {
      response: "I'm ready to help with script breakdowns, schedules, props, and VFX planning for Nollywood productions! To enable AI responses, add your OpenAI API key in Supabase Edge Function secrets (OPENAI_API_KEY).",
      metrics: { success: false, errorType: 'no_api_key' }
    };
  }

  let context = `You are an AI assistant specialized in Nollywood film pre-production. You help with script breakdown, scheduling, production planning, and VFX workflow optimization. Be helpful, concise, and focused on practical filmmaking advice.`;
  
  if (projectContext && isValidUUID(projectContext)) {
    try {
      const { data: project } = await supabase
        .from('projects')
        .select(`*, scripts(*), breakdowns(*)`)
        .eq('id', projectContext)
        .single();
      
      if (project) {
        context += `\n\nProject Context: ${project.name}\nDescription: ${project.description || 'No description'}`;
        if (project.scripts?.length) {
          context += `\nScripts: ${project.scripts.map((s: any) => s.title).join(', ')}`;
        }
      }
    } catch (err) {
      console.error('Failed to fetch project context:', err);
    }
  }

  const startTime = Date.now();
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: context },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    return {
      response: data.choices[0].message.content,
      metrics: {
        success: true,
        tokensUsed: data.usage?.prompt_tokens + data.usage?.completion_tokens || 0,
        responseTimeMs: responseTime,
        provider: 'openai',
        model: 'gpt-3.5-turbo'
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      response: "Sorry — I couldn't reach the AI service. Try again later.",
      metrics: {
        success: false,
        errorType: error.message,
        responseTimeMs: responseTime,
        provider: 'openai',
        model: 'gpt-3.5-turbo'
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

    const body = await req.json();
    const { projectId, userMessage, message } = body;
    const actualMessage = userMessage || message || '';
    const projectContext = (projectId && isValidUUID(projectId)) ? projectId : null;
    
    if (!actualMessage) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1) Persist user message - best-effort (do not fail entire flow) - only if projectContext is valid
    let userMsgRow;
    if (projectContext) {
      try {
        const { data, error } = await supabase.from("chat_messages").insert({
          project_id: projectContext,
          user_id: user.id,
          message: actualMessage,
          is_ai_response: false
        }).select().single();
        if (error) throw error;
        userMsgRow = data;
      } catch (err) {
        console.error("chat: failed to persist user message (non-fatal)", err);
        // continue — we still call the AI
      }
    }

    // 2) Call AI
    let aiResult;
    try {
      aiResult = await callAI(actualMessage, projectContext);
    } catch (err) {
      console.error("chat: aiService.callAI error", err);
      // Persist an error message entry and return friendly message
      try {
        await supabase.from("chat_messages").insert({
          project_id: projectContext,
          user_id: user.id,
          message: "Sorry — I couldn't reach the AI service. Try again later.",
          is_ai_response: true
        });
      } catch (e) {
        console.error("chat: failed to persist fallback AI message", e);
      }
      return new Response(
        JSON.stringify({ error: "AI call failed. Logged. Try again." }),
        { status: 502, headers: corsHeaders }
      );
    }

    // 3) Persist AI response (best-effort) - only if projectContext is valid
    if (projectContext) {
      try {
        await supabase.from("chat_messages").insert({
          project_id: projectContext,
          user_id: user.id,
          message: aiResult.response,
          is_ai_response: true
        });
      } catch (err) {
        console.error("chat: failed to persist ai response (non-fatal)", err);
      }
    }

    // 4) Track usage (non-blocking)
    setTimeout(() => trackUsage(aiResult.metrics, projectContext), 0);

    return new Response(JSON.stringify({ 
      ok: true, 
      response: aiResult.response,
      metrics: aiResult.metrics 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-send function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});