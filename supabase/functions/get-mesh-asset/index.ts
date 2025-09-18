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

    const url = new URL(req.url);
    const asset_id = url.searchParams.get('asset_id');

    if (!asset_id) {
      return new Response(
        JSON.stringify({ error: 'asset_id parameter is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get mesh asset (RLS will ensure user can only access their own assets)
    const { data: asset, error: assetError } = await supabase
      .from('mesh_assets')
      .select('*')
      .eq('id', asset_id)
      .single();

    if (assetError) {
      console.error('Asset fetch error:', assetError);
      return new Response(
        JSON.stringify({ error: 'Asset not found or access denied' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Return asset info (with signed download URL if completed)
    let response = { asset };

    if (asset.status === 'done' && asset.output_path) {
      try {
        // Create signed URL for download (valid for 5 minutes)
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('user_assets')
          .createSignedUrl(asset.output_path, 300);

        if (urlError) {
          console.error('Signed URL error:', urlError);
        } else {
          response.signed_download = signedUrlData.signedUrl;
        }
      } catch (urlCreateError) {
        console.error('Error creating signed URL:', urlCreateError);
        // Don't fail the request if signed URL creation fails
      }
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-mesh-asset function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});