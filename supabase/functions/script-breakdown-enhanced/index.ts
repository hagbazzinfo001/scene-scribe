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

    const { asset_id, file_url, filename, project_id } = await req.json();

    console.log('Enhanced script breakdown request:', { asset_id, filename, project_id });

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        project_id: project_id || null,
        type: 'script_breakdown',
        status: 'running',
        input_data: { asset_id, file_url, filename, file_type: 'script' }
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch script content
    let scriptContent = '';
    try {
      const response = await fetch(file_url);
      if (!response.ok) throw new Error('Failed to fetch script');
      scriptContent = await response.text();
    } catch (fetchError) {
      console.error('Script fetch error:', fetchError);
      await supabase
        .from('jobs')
        .update({ 
          status: 'failed', 
          error_message: 'Failed to fetch script content',
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch script content' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Use OpenAI for script breakdown
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('No OpenAI API key found');
      await supabase
        .from('jobs')
        .update({ 
          status: 'failed', 
          error_message: 'OpenAI API key not configured',
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a professional script breakdown assistant. Analyze the script and return a structured JSON breakdown with characters, scenes, props, and locations. Always return valid JSON.'
            },
            {
              role: 'user',
              content: `Please analyze this script and provide a detailed breakdown in JSON format with the following structure:
              {
                "characters": [{"name": "Character Name", "importance": "lead/supporting/background"}],
                "scenes": [{"id": 1, "location": "Location", "description": "Scene description", "characters": ["character names"]}],
                "props": ["prop1", "prop2"],
                "locations": ["location1", "location2"]
              }

              Script content:
              ${scriptContent.substring(0, 8000)}`
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }

      const openaiData = await openaiResponse.json();
      const breakdown = JSON.parse(openaiData.choices[0].message.content);

      // Update job with results
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: 'done',
          output_data: breakdown,
          ai_model: 'gpt-4o-mini',
          ai_provider: 'openai',
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (updateError) {
        console.error('Job update error:', updateError);
      }

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Script Breakdown Complete',
          message: `Breakdown for "${filename}" has been completed successfully`,
          type: 'success'
        });

      return new Response(
        JSON.stringify({
          success: true,
          job_id: job.id,
          breakdown
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (aiError) {
      console.error('AI processing error:', aiError);
      
      // Update job as failed
      await supabase
        .from('jobs')
        .update({ 
          status: 'failed', 
          error_message: aiError instanceof Error ? aiError.message : String(aiError),
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);

      return new Response(
        JSON.stringify({ error: 'Failed to process script with AI' }),
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('Error in script-breakdown-enhanced function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: corsHeaders }
    );
  }
});