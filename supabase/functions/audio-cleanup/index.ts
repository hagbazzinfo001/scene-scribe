import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Replicate from "https://esm.sh/replicate@0.25.2"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY')
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not set')
    }

    const replicate = new Replicate({ auth: REPLICATE_API_KEY })

    const body = await req.json()
    console.log("Audio cleanup request:", body)

    // Supabase client for saving assets
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header (optional but preferred)
    const authHeader = req.headers.get('Authorization');
    const { data: userResult } = authHeader
      ? await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      : { data: { user: null } as any };

    // If it's a status check request
    if (body.predictionId) {
      console.log("Checking status for prediction:", body.predictionId)
      const prediction = await replicate.predictions.get(body.predictionId)
      console.log("Status check response:", prediction)
      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If it's an audio processing request
    if (!body.audioUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required field: audioUrl is required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log("Processing audio with URL:", body.audioUrl)
    
    const output = await replicate.run(
      "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
      { input: { audio: body.audioUrl, output_format: body.outputFormat || "wav" } }
    )

    const processedUrl = Array.isArray(output) ? output[0] : (output?.audio || output)

    // Save processed audio to asset library when project_id provided
    if (body.project_id && userResult?.user?.id && processedUrl) {
      await supabase.from('user_assets').insert({
        user_id: userResult.user.id,
        project_id: body.project_id,
        filename: `cleaned-${Date.now()}.wav`,
        file_url: processedUrl,
        file_type: 'audio',
        storage_path: `audio/${userResult.user.id}/${Date.now()}.wav`,
        metadata: { source: body.audioUrl },
        processing_status: 'completed'
      });
    }

    console.log("Audio processing response:", output)
    return new Response(JSON.stringify({ output: processedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Error in audio-cleanup function:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})