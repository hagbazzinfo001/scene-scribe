import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Replicate from "https://esm.sh/replicate@0.25.2"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN')
    if (!REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN is not set')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const body = await req.json()
    const { userMessage, projectId } = body

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "userMessage is required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('LLaMA chat request:', { userMessage, projectId })

    // Get project context if projectId is provided
    let projectContext = ""
    if (projectId) {
      try {
        // Get project details
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        // Get project assets for context
        const { data: assets } = await supabase
          .from('user_assets')
          .select('*')
          .eq('project_id', projectId)
          .limit(10)

        if (project) {
          projectContext = `Project: ${project.name}${project.description ? ' - ' + project.description : ''}`
        }
        
        if (assets && assets.length > 0) {
          projectContext += `\n\nProject Assets:\n${assets.map(asset => `- ${asset.filename} (${asset.file_type})`).join('\n')}`
        }
      } catch (error) {
        console.warn('Could not fetch project context:', error)
      }
    }

    const systemPrompt = `You are a specialized AI assistant for Nollywood film pre-production. You help Nigerian filmmakers with:

📋 Script Analysis & Breakdown
🎭 Character & Casting Planning  
📍 Location Scouting & Management
🎨 Props, Costumes & Makeup Planning
📅 Production Scheduling & Logistics
💰 Budget Planning & Resource Allocation
🎞️ Post-Production Planning

${projectContext ? `\nCurrent Project Context:\n${projectContext}` : ''}

Provide practical, actionable advice tailored to the Nigerian/African film industry. Keep responses concise but comprehensive.`

    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN })

    // Use LLaMA-2-13B-Chat model for production assistance
    const output = await replicate.run(
      "meta/llama-2-13b-chat:f4e2de70d66816a838a89eeeb621910adffb0dd0baba3976c96980970978018d",
      {
        input: {
          prompt: userMessage,
          system_prompt: systemPrompt,
          max_new_tokens: 1000,
          temperature: 0.7,
          top_p: 0.9,
          repetition_penalty: 1.15
        }
      }
    )

    // LLaMA output is an array of strings
    const response = Array.isArray(output) ? output.join('') : output

    console.log('LLaMA response generated successfully')

    // Store chat messages if in project context
    if (projectId) {
      try {
        // Store user message
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          project_id: projectId,
          message: userMessage,
          is_ai_response: false
        })

        // Store AI response
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          project_id: projectId,
          message: response,
          is_ai_response: true
        })
      } catch (error) {
        console.warn('Failed to store chat messages:', error)
      }
    }

    return new Response(JSON.stringify({
      response: response,
      model: "llama-2-13b-chat",
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in llama-chat function:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I apologize, but I'm currently experiencing technical difficulties. Please try again in a moment. In the meantime, feel free to ask me about script breakdown, production planning, or any other Nollywood production questions!"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})