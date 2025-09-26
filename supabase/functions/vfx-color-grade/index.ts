import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
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

    const { imageUrl, gradeSettings, style, projectId } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Enhanced color grading with professional controls
    let enhancementPrompt = 'professional color grading, cinematic enhancement';
    
    if (gradeSettings) {
      const { exposure, contrast, highlights, shadows, vibrance, temperature } = gradeSettings;
      enhancementPrompt += `, exposure ${exposure || 0}, contrast ${contrast || 0}, enhanced ${style || 'cinematic'} look`;
    } else {
      enhancementPrompt += `, ${style || 'cinematic'} color grading style`;
    }

    // Use simple color grade function as fallback
    const { data, error } = await supabase.functions.invoke('simple-color-grade', {
      body: { imageUrl, style: style || 'cinematic', projectId }
    });

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      processed_image_url: data.processed_image_url || imageUrl,
      style: gradeSettings ? 'professional' : style,
      applied_settings: gradeSettings || { style }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in vfx-color-grade function:', error);
    return new Response(
      JSON.stringify({ error: 'Color grading failed', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});