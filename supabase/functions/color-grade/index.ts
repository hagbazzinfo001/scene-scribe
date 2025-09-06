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

    // Use instruct-pix2pix for prompt-based color transformations
    const output = await replicate.run(
      "fofr/flux-color",
      {
        input: {
          image: imageUrl,
          prompt,
          num_inference_steps: 20,
          guidance_scale: 7.5,
        }
      }
    )

    console.log('Color-grade output:', output)

    return new Response(JSON.stringify({ output }), {
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
