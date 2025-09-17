import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    const body = await req.json();
    const { scriptContent, projectId } = body;

    if (!scriptContent) {
      return new Response(
        JSON.stringify({ error: 'Script content is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Processing script breakdown for project:', projectId);

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        project_id: projectId,
        type: 'script_breakdown',
        status: 'running',
        input_data: { script_content: scriptContent }
      })
      .select()
      .single();

    if (jobError) {
      throw jobError;
    }

    console.log('Created script breakdown job:', job.id);

    // Simulate processing and analyze script
    const simulateProcessing = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simple script analysis
      const breakdown = analyzeScript(scriptContent);
      
      // Update job with results
      await supabase
        .from('jobs')
        .update({
          status: 'done',
          output_data: breakdown,
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Script Breakdown Complete',
          message: `Script analysis completed with ${breakdown.scenes.length} scenes found`,
          type: 'success'
        });

      console.log('Script breakdown completed for job:', job.id);
    };

    // Start processing in background
    simulateProcessing().catch(async (error) => {
      console.error('Script breakdown failed:', error);
      await supabase
        .from('jobs')
        .update({
          status: 'error',
          error_message: error.message
        })
        .eq('id', job.id);
    });

    return new Response(JSON.stringify({
      success: true,
      jobId: job.id,
      message: 'Script breakdown started successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in simple-script-breakdown function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function analyzeScript(scriptContent: string) {
  const lines = scriptContent.split('\n');
  
  // Extract characters (usually ALL CAPS names)
  const characters = new Set<string>();
  const characterRegex = /^[A-Z][A-Z\s]{2,}/;
  
  // Extract scenes (INT./EXT. format)
  const scenes: any[] = [];
  const sceneRegex = /^(INT\.|EXT\.)\s+(.+?)(\s+[-–—]\s+(.+))?$/i;
  
  // Extract props and locations
  const props = new Set<string>();
  const locations = new Set<string>();
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Scene headers
    const sceneMatch = trimmed.match(sceneRegex);
    if (sceneMatch) {
      const location = sceneMatch[2].trim();
      const timeOfDay = sceneMatch[4]?.trim() || 'DAY';
      
      scenes.push({
        scene_id: `scene_${scenes.length + 1}`,
        start_line: index + 1,
        location: location,
        time_of_day: timeOfDay,
        description: trimmed
      });
      
      locations.add(location);
    }
    
    // Character names (usually followed by dialogue)
    if (characterRegex.test(trimmed) && trimmed.length < 50) {
      characters.add(trimmed);
    }
    
    // Common props
    const propWords = ['gun', 'phone', 'car', 'money', 'bag', 'knife', 'camera', 'book'];
    propWords.forEach(prop => {
      if (trimmed.toLowerCase().includes(prop)) {
        props.add(prop);
      }
    });
  });

  return {
    scenes: scenes,
    characters: Array.from(characters).map(name => ({
      name: name,
      scenes: scenes.length
    })),
    locations: Array.from(locations).map(loc => ({
      name: loc,
      type: loc.toLowerCase().includes('house') || loc.toLowerCase().includes('room') ? 'interior' : 'exterior'
    })),
    props: Array.from(props).map(prop => ({
      name: prop,
      category: 'prop'
    })),
    summary: {
      total_scenes: scenes.length,
      estimated_pages: Math.ceil(lines.length / 50),
      genre: 'drama'
    }
  };
}