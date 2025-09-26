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

    const { asset_id } = await req.json();

    if (!asset_id) {
      return new Response(
        JSON.stringify({ error: 'asset_id is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get asset record to delete from storage
    const { data: asset, error: fetchError } = await supabase
      .from('user_assets')
      .select('*')
      .eq('id', asset_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !asset) {
      return new Response(
        JSON.stringify({ error: 'Asset not found or access denied' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('user_assets')
      .delete()
      .eq('id', asset_id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Database deletion error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete asset' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Try to delete from storage (best effort)
    if (asset.storage_path) {
      try {
        const bucketName = asset.file_type === 'video' ? 'video-uploads' :
                          asset.file_type === 'audio' ? 'audio-uploads' :
                          asset.file_type === 'image' ? 'uploads' :
                          'uploads';
        
        await supabase.storage
          .from(bucketName)
          .remove([asset.storage_path]);
      } catch (storageError) {
        console.error('Storage deletion error (non-fatal):', storageError);
        // Continue - database deletion was successful
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Asset deleted successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-asset function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: corsHeaders }
    );
  }
});