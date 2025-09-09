import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { asset_id } = await req.json();
    
    if (!asset_id) {
      return new Response(JSON.stringify({ error: 'Missing asset_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call the database function to delete asset
    const { data, error } = await supabase
      .rpc('delete_user_asset', { asset_id });

    if (error) {
      throw error;
    }

    const result = data as { success: boolean; error?: string; storage_path?: string };
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If we have a storage path, try to delete from storage
    if (result.storage_path) {
      try {
        // Extract bucket and path from storage_path
        const pathParts = result.storage_path.split('/');
        const bucket = pathParts[0] || 'uploads';
        const filePath = pathParts.slice(1).join('/');
        
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from(bucket)
            .remove([filePath]);
          
          if (storageError) {
            console.warn('Storage deletion failed:', storageError);
          }
        }
      } catch (storageErr) {
        console.warn('Storage cleanup error:', storageErr);
        // Don't fail the request if storage cleanup fails
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Delete asset error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});