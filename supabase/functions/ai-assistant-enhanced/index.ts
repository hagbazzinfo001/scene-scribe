import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        message: 'I need the OpenAI API key configured in Supabase Edge Function secrets to provide smart answers.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { message, projectId } = await req.json();

    let contextData = '';
    
    // Get project context if projectId is provided
    if (projectId) {
      try {
        // Fetch project details
        const { data: project } = await supabase
          .from('projects')
          .select('name, description')
          .eq('id', projectId)
          .single();

        // Fetch project assets
        const { data: assets } = await supabase
          .from('user_assets')
          .select('filename, file_type, metadata, processing_status')
          .eq('project_id', projectId)
          .eq('processing_status', 'completed');

        // Fetch analysis results
        const { data: analyses } = await supabase
          .from('analysis_cache')
          .select('analysis_type, result')
          .eq('project_id', projectId);

        // Fetch VFX assets
        const { data: vfxAssets } = await supabase
          .from('vfx_assets')
          .select('filename, file_type, metadata')
          .eq('project_id', projectId);

        // Build context
        if (project) {
          contextData += `Project: ${project.name}\nDescription: ${project.description}\n\n`;
        }

        if (assets && assets.length > 0) {
          contextData += `Project Assets:\n`;
          assets.forEach(asset => {
            contextData += `- ${asset.filename} (${asset.file_type})\n`;
          });
          contextData += '\n';
        }

        if (analyses && analyses.length > 0) {
          contextData += `Analysis Results:\n`;
          analyses.forEach(analysis => {
            contextData += `- ${analysis.analysis_type}: ${JSON.stringify(analysis.result).substring(0, 500)}...\n`;
          });
          contextData += '\n';
        }

        if (vfxAssets && vfxAssets.length > 0) {
          contextData += `VFX Assets:\n`;
          vfxAssets.forEach(asset => {
            contextData += `- ${asset.filename} (${asset.file_type})\n`;
          });
          contextData += '\n';
        }

      } catch (error) {
        console.error('Error fetching project context:', error);
      }
    }

    const systemPrompt = `You are a Nollywood AI Assistant specialized in film pre-production and VFX workflows.

${contextData ? `CURRENT PROJECT CONTEXT:\n${contextData}` : ''}

Your expertise includes:
- Script analysis and breakdown
- Scene scheduling and shot lists  
- Props, costumes, and location requirements
- Cast and crew coordination
- Budget estimation and resource planning
- VFX pipeline planning
- Post-production workflows
- Pan-African film industry knowledge

When users ask questions, reference the project context above when relevant. For budget estimates, use realistic Nollywood/African film market rates. For technical questions, provide practical, budget-conscious solutions suitable for indie productions.

Languages: Respond in English primarily, but acknowledge and incorporate popular Pan-African languages (Swahili, Yoruba, Igbo, Amharic, French) when culturally relevant.

Keep responses practical, specific, and actionable for film production teams.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Log usage analytics
    try {
      await supabase.from('ai_usage_analytics').insert({
        endpoint: 'ai-assistant-enhanced',
        provider: 'openai',
        model: 'gpt-5-2025-08-07',
        tokens_used: data.usage?.total_tokens || 0,
        cost_estimate: (data.usage?.total_tokens || 0) * 0.00002,
        project_id: projectId,
        success: true
      });
    } catch (logError) {
      console.error('Error logging analytics:', logError);
    }

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      response: assistantMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-assistant-enhanced function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      message: 'I apologize, but I encountered an error processing your request. Please try again or check that the OpenAI API key is properly configured.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});