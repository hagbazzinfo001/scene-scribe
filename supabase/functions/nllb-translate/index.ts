import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Replicate from "https://esm.sh/replicate@0.25.2"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN')
    if (!REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN is not set')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const body = await req.json()
    const { text, targetLanguage, sourceLanguage = 'eng_Latn' } = body

    if (!text || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "text and targetLanguage are required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('NLLB translation request:', { targetLanguage, textLength: text.length })

    // Language code mapping for African languages
    const languageCodes: Record<string, string> = {
      'yoruba': 'yor_Latn',
      'igbo': 'ibo_Latn', 
      'hausa': 'hau_Latn',
      'swahili': 'swh_Latn',
      'amharic': 'amh_Ethi',
      'french': 'fra_Latn',
      'portuguese': 'por_Latn',
      'arabic': 'arb_Arab'
    }

    const targetCode = languageCodes[targetLanguage.toLowerCase()] || targetLanguage

    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN })

    // Use NLLB-200 model for African language translation
    const output = await replicate.run(
      "cjwbw/nllb-200-distilled-600m:f8ba68d90719b6bdf29e2532e4e8dbd83c1d4185e2c3bb0e62cdcdf2ffbe4843",
      {
        input: {
          text: text,
          source_language: sourceLanguage,
          target_language: targetCode,
          max_length: 2048
        }
      }
    )

    const translatedText = typeof output === 'string' ? output : JSON.stringify(output)

    console.log('NLLB translation completed successfully')

    // Store translation for future reference if in a project context
    try {
      await supabase.from('user_assets').insert({
        user_id: user.id,
        filename: `translation_${targetLanguage}_${Date.now()}.txt`,
        file_url: `data:text/plain;base64,${btoa(translatedText)}`,
        file_type: 'script',
        storage_path: `translations/${targetLanguage}/${Date.now()}`,
        metadata: {
          originalText: text.substring(0, 100) + '...',
          sourceLanguage,
          targetLanguage,
          translationLength: translatedText.length
        },
        processing_status: 'completed'
      })
    } catch (error) {
      console.warn('Failed to store translation:', error)
    }

    return new Response(JSON.stringify({
      translatedText: translatedText,
      sourceLanguage,
      targetLanguage,
      model: "nllb-200-distilled-600m",
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in nllb-translate function:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error),
      translatedText: "Translation service temporarily unavailable. Please try again later."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})