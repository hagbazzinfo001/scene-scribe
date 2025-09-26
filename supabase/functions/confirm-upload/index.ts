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

    const { assetId, fileSize } = await req.json();

    if (!assetId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: assetId' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get asset record
    const { data: asset, error: assetError } = await supabase
      .from('user_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .single();

    if (assetError || !asset) {
      return new Response(
        JSON.stringify({ error: 'Asset not found or access denied' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Determine bucket based on file type
    const bucketMap = {
      'script': 'scripts',
      'audio': 'audio-uploads', 
      'video': 'video-uploads',
      'image': 'vfx-assets'
    };
    const bucket = bucketMap[asset.file_type as keyof typeof bucketMap];

    // Verify file exists in storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from(bucket)
      .list(asset.storage_path.split('/').slice(0, -1).join('/'), {
        search: asset.storage_path.split('/').pop()
      });

    if (fileError || !fileData || fileData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'File not found in storage' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Create signed URL for file access
    const { data: signedData, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(asset.storage_path, 24 * 60 * 60); // 24 hours

    if (signError) {
      console.error('Signed URL error:', signError);
      return new Response(
        JSON.stringify({ error: 'Failed to create file URL' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Update asset record with file URL and size
    const { data: updatedAsset, error: updateError } = await supabase
      .from('user_assets')
      .update({
        file_url: signedData.signedUrl,
        file_size: fileSize || fileData[0]?.metadata?.size || null,
        processing_status: 'uploaded'
      })
      .eq('id', assetId)
      .select()
      .single();

    if (updateError) {
      console.error('Asset update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update asset record' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Auto-trigger super breakdown job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        project_id: asset.project_id,
        type: 'super_breakdown',
        input_data: {
          asset_id: asset.id,
          file_type: asset.file_type,
          file_url: signedData.signedUrl,
          filename: asset.filename
        },
        status: 'pending'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      // Don't fail the upload, just log the error
    }

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'upload_complete',
        title: 'Upload Complete',
        message: `${asset.filename} has been uploaded and queued for analysis.`
      });

    return new Response(
      JSON.stringify({
        success: true,
        asset: updatedAsset,
        jobId: job?.id || null,
        message: 'Upload confirmed and analysis queued'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in confirm-upload function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});