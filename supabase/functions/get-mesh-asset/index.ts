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

    const url = new URL(req.url);
    const assetId = url.pathname.split('/').pop();

    if (!assetId) {
      return new Response(
        JSON.stringify({ error: 'Asset ID is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get mesh asset
    const { data: asset, error: assetError } = await supabase
      .from('mesh_assets')
      .select('*')
      .eq('id', assetId)
      .eq('owner_id', user.id)
      .single();

    if (assetError || !asset) {
      return new Response(
        JSON.stringify({ error: 'Asset not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    let response: any = { asset };

    // Get signed download URL if asset is completed
    if (asset.status === 'completed' && asset.output_path) {
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('outputs')
        .createSignedUrl(asset.output_path, 3600); // 1 hour expiry

      if (!signedError && signedUrlData) {
        (response as any).signed_download = signedUrlData.signedUrl;
      }
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in get-mesh-asset function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});