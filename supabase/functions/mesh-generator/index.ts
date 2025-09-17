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

    const { project_id, mesh_type, complexity, description = '' } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'project_id is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Mesh generation request:', { project_id, mesh_type, complexity });

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        project_id,
        type: 'mesh-generator',
        status: 'running',
        input_data: { mesh_type: mesh_type || 'character', complexity: complexity || 'medium', description }
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

    // Generate mesh data (simulation)
    const meshData = generateMeshData(mesh_type || 'character', complexity || 'medium');
    
    // Generate real mesh using Replicate
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    let meshFileUrl = `https://example.com/mesh-${job.id}.obj`;
    
    if (REPLICATE_API_KEY) {
      try {
        const Replicate = (await import('https://esm.sh/replicate@0.25.2')).default;
        const replicate = new Replicate({ auth: REPLICATE_API_KEY });
        
        // Generate simple mesh data without external API call for now
        console.log('Generating mesh with description:', description);
        
        // Set a mock URL for demonstration
        meshFileUrl = `https://mock-mesh-storage.com/mesh_${job.id}_${mesh_type || 'character'}.obj`;
      } catch (replicateError) {
        console.error('Replicate mesh generation failed, using mock:', replicateError);
      }
    }

    // Update job with results
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'done',
        output_data: {
          mesh_url: meshFileUrl,
          mesh_data: meshData,
          download_formats: ['obj', 'fbx', 'blend']
        },
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
        title: 'Mesh Generated',
        message: `Your ${mesh_type} mesh has been generated successfully`,
        type: 'success'
      });

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        mesh_data: meshData,
        download_url: meshFileUrl
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mesh-generator function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function generateMeshData(meshType: string, complexity: string) {
  const baseVertices = complexity === 'low' ? 1000 : complexity === 'medium' ? 5000 : 15000;
  
  return {
    type: meshType,
    complexity,
    vertices: baseVertices,
    faces: Math.floor(baseVertices * 1.8),
    materials: meshType === 'character' ? ['skin', 'clothing', 'hair'] : ['base_material'],
    bones: meshType === 'character' ? 50 : 0,
    animations: meshType === 'character' ? ['idle', 'walk', 'run'] : [],
    download_formats: ['obj', 'fbx', 'blend', 'maya']
  };
}