import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Replicate from "https://esm.sh/replicate@0.25.2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

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
    const { videoUrl, sceneDescription, trackingType } = body

    if (!videoUrl || !sceneDescription) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: videoUrl and sceneDescription are required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Roto-tracker request:', { videoUrl, sceneDescription, trackingType })

    // Use CoTracker for motion tracking and segmentation
    const output = await replicate.run(
      "facebookresearch/co-tracker:28b396d79d4b67f40ce3409b90ddfafccd3c30b59ac57b0c6f3fc11b8b21071e",
      {
        input: {
          video: videoUrl,
          grid_size: 10,
          grid_query_frame: 0,
          backward_tracking: true,
          forward_tracking: true
        }
      }
    )

    console.log('Roto-tracker output:', output)

    // Process the tracking data into a usable format
    const trackingData = {
      videoUrl: output?.video || videoUrl,
      trackingPoints: output?.tracks || [],
      masks: output?.masks || [],
      metadata: {
        frameCount: output?.frame_count || 0,
        resolution: output?.resolution || "1920x1080",
        duration: output?.duration || 0,
        trackingType: trackingType || "object",
        sceneDescription
      }
    }

    return new Response(JSON.stringify(trackingData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in roto-tracker function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})