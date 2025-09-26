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

  const { filename, contentType, projectId, fileType } = await req.json();

  const isUUID = (v: string) =>
    typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

  const validProjectId = isUUID(projectId) ? projectId : null;

  if (!filename || !contentType || !fileType) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required fields: filename, contentType, fileType',
        hint: 'projectId is optional; it will be set to null if not provided or invalid.' 
      }),
      { status: 400, headers: corsHeaders }
    );
  }

    // Validate file type
    const validFileTypes = ['script', 'audio', 'video', 'image'];
    if (!validFileTypes.includes(fileType)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid file type. Valid types: ${validFileTypes.join(', ')}` 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check user credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', user.id)
      .single();

    if (profile && profile.credits_remaining <= 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits. Please upgrade your plan.',
          code: 'INSUFFICIENT_CREDITS'
        }),
        { status: 402, headers: corsHeaders }
      );
    }

  // Generate unique file path
  const timestamp = Date.now();
  const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const projectSegment = validProjectId ?? 'general';
  const storagePath = `${user.id}/${projectSegment}/${timestamp}_${cleanFilename}`;

    // Determine bucket based on file type
    const bucketMap = {
      'script': 'scripts',
      'audio': 'audio-uploads', 
      'video': 'video-uploads',
      'image': 'vfx-assets'
    };
    const bucket = bucketMap[fileType as keyof typeof bucketMap];

    // Create signed upload URL
    const { data: signedData, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (signError) {
      console.error('Signed URL error:', signError);
      return new Response(
        JSON.stringify({ error: 'Failed to create upload URL', details: signError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

  // Create file record in user_assets table
  const { data: asset, error: insertError } = await supabase
    .from('user_assets')
    .insert({
      user_id: user.id,
      project_id: validProjectId, // nullable when not provided/invalid
      filename: filename,
      file_url: '', // Will be set after upload confirmation
      file_type: fileType,
      mime_type: contentType,
      storage_path: storagePath,
      processing_status: 'pending'
    })
    .select()
    .single();

    if (insertError) {
      console.error('Asset insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create asset record', details: insertError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        uploadUrl: signedData.signedUrl,
        assetId: asset.id,
        storagePath: storagePath,
        bucket: bucket
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in upload-asset function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: corsHeaders }
    );
  }
});