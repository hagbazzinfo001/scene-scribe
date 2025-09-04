import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, projectId } = await req.json();

    console.log('AI Assistant request:', { message, projectId });

    // Get project context and scripts
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        scripts (
          id,
          title,
          content,
          parsed_data
        ),
        breakdowns (
          type,
          content
        )
      `)
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('Project fetch error:', projectError);
      throw projectError;
    }

    // Build context for AI
    let context = `You are an AI assistant specialized in Nollywood film pre-production. You help with script breakdown, scheduling, and production planning.

Project: ${project.name}
Description: ${project.description || 'No description provided'}
`;

    if (project.scripts && project.scripts.length > 0) {
      context += `\nScripts in this project:\n`;
      project.scripts.forEach((script: any) => {
        context += `- ${script.title}\n`;
        if (script.parsed_data) {
          context += `  Parsed data: ${JSON.stringify(script.parsed_data, null, 2)}\n`;
        }
      });
    }

    if (project.breakdowns && project.breakdowns.length > 0) {
      context += `\nExisting breakdowns:\n`;
      project.breakdowns.forEach((breakdown: any) => {
        context += `- ${breakdown.type}: ${JSON.stringify(breakdown.content, null, 2)}\n`;
      });
    }

    context += `\nUser question: ${message}

Please provide helpful, specific advice for this Nollywood film production. If the user asks for schedules, breakdowns, or lists, provide them in a clear, structured format. Consider Nigerian film industry practices and constraints.`;

    // Call OpenAI API with GPT-5
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI assistant for Nollywood film pre-production. You help filmmakers with script breakdowns, shooting schedules, prop lists, cast management, and production planning. Always provide practical, actionable advice tailored to the Nigerian film industry context.'
          },
          {
            role: 'user',
            content: context
          }
        ],
        max_completion_tokens: 1000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Failed to get AI response');
    }

    const aiResponse = data.choices[0].message.content;

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while processing your request'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});