import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
    if (!REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN is not set');
    }

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

    const body = await req.json();
    const { scriptText, targetLangs, projectId } = body;

    if (!scriptText || !targetLangs) {
      return new Response(
        JSON.stringify({ error: "scriptText and targetLangs are required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Breakdown translate request:', { targetLangs, textLength: scriptText.length });

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
    };

    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });
    const translations: Record<string, string> = {};

    // Process each target language
    const targetLanguages = Array.isArray(targetLangs) ? targetLangs : [targetLangs];
    
    for (const targetLang of targetLanguages) {
      const targetCode = languageCodes[targetLang.toLowerCase()] || targetLang;
      
      try {
        console.log(`Translating to ${targetLang}...`);
        
        // Use NLLB-200 model for African language translation
        const output = await replicate.run(
          "cjwbw/nllb-200-distilled-600m:f8ba68d90719b6bdf29e2532e4e8dbd83c1d4185e2c3bb0e62cdcdf2ffbe4843",
          {
            input: {
              text: scriptText,
              source_language: 'eng_Latn',
              target_language: targetCode,
              max_length: 2048
            }
          }
        );

        const translatedText = typeof output === 'string' ? output : JSON.stringify(output);
        translations[targetLang] = translatedText;

        // Store translation in Supabase storage
        const fileName = `translation_${targetLang}_${Date.now()}.txt`;
        const filePath = `${user.id}/${fileName}`;
        
        try {
          // Upload to storage bucket
          const { error: uploadError } = await supabase.storage
            .from('translations')
            .upload(filePath, new Blob([translatedText], { type: 'text/plain' }));

          if (uploadError) {
            console.warn('Failed to store translation in storage:', uploadError);
          }

          // Also store in user_assets table for tracking
          await supabase.from('user_assets').insert({
            user_id: user.id,
            project_id: projectId || null,
            filename: fileName,
            file_url: `translations/${filePath}`,
            file_type: 'script',
            storage_path: filePath,
            metadata: {
              originalText: scriptText.substring(0, 100) + '...',
              sourceLanguage: 'eng_Latn',
              targetLanguage: targetLang,
              translationLength: translatedText.length,
              translationType: 'script_breakdown'
            },
            processing_status: 'completed'
          });

        } catch (storageError) {
          console.warn('Failed to store translation:', storageError);
        }

      } catch (translationError) {
        console.error(`Translation failed for ${targetLang}:`, translationError);
        translations[targetLang] = `Translation failed: ${translationError.message}`;
      }
    }

    console.log('Breakdown translate completed successfully');

    return new Response(JSON.stringify({
      success: true,
      translations: translations,
      model: "nllb-200-distilled-600m",
      supportedLanguages: Object.keys(languageCodes)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in breakdown-translate function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallbackMessage: "Translation service temporarily unavailable. Please try again later."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});