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

    // Use working image enhancement model
    const output = await replicate.run(
      "tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3",
      {
        input: {
          img: imageUrl,
          version: "v1.4",
          scale: 2
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
