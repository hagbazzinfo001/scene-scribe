import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Replicate from "https://esm.sh/replicate@0.25.2"

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
    const { imageUrl, prompt } = body

    if (!imageUrl || !prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: imageUrl and prompt are required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Color-grade request:', { imageUrl, prompt })

    // Use InstantID for style-aware color grading
    const output = await replicate.run(
      "instantx/instantid:9c88af5c0f51ae59a166985fc0c66e90c3e72db7bbdc1dd38dfed6b79c28fae3",
      {
        input: {
          image: imageUrl,
          prompt: prompt + " - Apply professional color grading and cinematic enhancement",
          negative_prompt: "low quality, blurry, oversaturated",
          pose_strength: 0.4,
          canny_strength: 0.3,
          depth_strength: 0.5,
          adapter_strength: 0.8,
          num_inference_steps: 30,
          guidance_scale: 5,
          seed: Math.floor(Math.random() * 1000000)
        }
      }
    )

    console.log('Color-grade output:', output)

    const processedUrl = Array.isArray(output) ? output[0] : output;

    return new Response(JSON.stringify({ 
      success: true,
      output: processedUrl,
      download_url: processedUrl,
      processed_image_url: processedUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in color-grade function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
