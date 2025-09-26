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

    const { filename, content_type, bucket, project_id, file_size } = await req.json();

    if (!filename || !content_type || !bucket) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: filename, content_type, bucket' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate unique file path with user ID folder structure
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${timestamp}-${sanitizedFilename}`;

    // Create signed upload URL
    const { data: signedData, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);

    if (signError) {
      console.error('Signed URL error:', signError);
      return new Response(
        JSON.stringify({ error: 'Failed to create signed URL', details: signError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Pre-insert file record based on bucket type
    let fileRecord = null;
    
    if (bucket === 'user_audio') {
      const { data, error } = await supabase
        .from('audio_files')
        .insert({
          user_id: user.id,
          project_id: project_id || null,
          filename: filename,
          file_url: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucket}/${filePath}`,
          file_size: file_size || null
        })
        .select()
        .single();
      
      if (error) {
        console.error('Audio file record error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create audio file record' }),
          { status: 500, headers: corsHeaders }
        );
      }
      fileRecord = data;
    } else if (bucket === 'user_video') {
      const { data, error } = await supabase
        .from('video_files')
        .insert({
          user_id: user.id,
          project_id: project_id || null,
          filename: filename,
          file_url: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucket}/${filePath}`,
          file_size: file_size || null
        })
        .select()
        .single();
      
      if (error) {
        console.error('Video file record error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create video file record' }),
          { status: 500, headers: corsHeaders }
        );
      }
      fileRecord = data;
    } else if (bucket === 'vfx_assets') {
      const { data, error } = await supabase
        .from('vfx_assets')
        .insert({
          user_id: user.id,
          project_id: project_id || null,
          filename: filename,
          file_url: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucket}/${filePath}`,
          file_type: content_type,
          file_size: file_size || null
        })
        .select()
        .single();
      
      if (error) {
        console.error('VFX asset record error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create VFX asset record' }),
          { status: 500, headers: corsHeaders }
        );
      }
      fileRecord = data;
    }

    return new Response(
      JSON.stringify({
        success: true,
        upload_url: signedData.signedUrl,
        file_path: filePath,
        file_record: fileRecord
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-signed-upload function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});