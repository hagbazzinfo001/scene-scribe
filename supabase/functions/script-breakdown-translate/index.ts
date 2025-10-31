import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
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
    const { rawText, projectId, targetLangs = [], filename } = body;

    if (!rawText || rawText.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Valid script text is required (minimum 10 characters)" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Script breakdown request:', { 
      textLength: rawText.length, 
      targetLangs,
      projectId 
    });

    // 1. Generate breakdown using Lovable AI
    const breakdownPrompt = `You are a professional 1st AD and script supervisor. Parse this screenplay into a structured breakdown.

For each scene, extract:
- scene_id (sequential number)
- slugline (e.g., "INT. MARKET - DAY")  
- description (one sentence summary)
- characters (array of character names mentioned)
- props (array of important props/objects)
- vfx (array of VFX needs, e.g., "crowd multiply", "smoke effect")
- estimated_pages (float, estimated page count for this scene)
- notes (any production notes)

Script:
${rawText}

Return ONLY valid JSON array of scenes. No markdown, no explanation.`;

    const breakdownResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional script breakdown assistant. Return only valid JSON." },
          { role: "user", content: breakdownPrompt }
        ],
        max_tokens: 2000
      })
    });

    if (!breakdownResp.ok) {
      const errorText = await breakdownResp.text();
      console.error('Lovable AI error:', breakdownResp.status, errorText);
      
      if (breakdownResp.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI service error: ${breakdownResp.status}`);
    }

    const breakdownJson = await breakdownResp.json();
    let breakdownText = breakdownJson.choices?.[0]?.message?.content || '[]';
    
    // Clean up markdown if present
    breakdownText = breakdownText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let breakdownObj;
    try {
      breakdownObj = JSON.parse(breakdownText);
      if (!Array.isArray(breakdownObj)) {
        throw new Error('Breakdown must be an array of scenes');
      }
    } catch (parseError) {
      console.error('Failed to parse breakdown JSON:', breakdownText);
      // Fallback: create minimal breakdown
      breakdownObj = [{
        scene_id: 1,
        slugline: "SCRIPT BREAKDOWN",
        description: "Script parsed successfully - manual breakdown needed",
        characters: [],
        props: [],
        vfx: [],
        estimated_pages: rawText.length / 1800, // rough estimate
        notes: "Automatic parsing incomplete"
      }];
    }

    console.log('Parsed breakdown:', JSON.stringify(breakdownObj).substring(0, 200));

    // 2. Save breakdown to database
    const { data: breakdownRow, error: insertErr } = await supabase
      .from('breakdowns')
      .insert({
        user_id: user.id,
        project_id: projectId || null,
        original_filename: filename || 'script.txt',
        raw_text: rawText,
        breakdown: breakdownObj,
        type: 'full'
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Database insert error:', insertErr);
      throw new Error(`Failed to save breakdown: ${insertErr.message}`);
    }

    console.log('Breakdown saved:', breakdownRow.id);

    // 3. Process translations if requested
    const translations: Record<string, any> = {};
    
    if (Array.isArray(targetLangs) && targetLangs.length > 0 && REPLICATE_API_TOKEN) {
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

      for (const targetLang of targetLangs) {
        const targetCode = languageCodes[targetLang.toLowerCase()] || targetLang;
        
        try {
          console.log(`Translating to ${targetLang}...`);
          
          // Build scene-by-scene text
          const scenesText = breakdownObj
            .map((s: any) => `Scene ${s.scene_id}: ${s.slugline}\n${s.description}`)
            .join('\n\n');

          // Use NLLB-200 for translation via Replicate
          const output = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${REPLICATE_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              version: 'f8ba68d90719b6bdf29e2532e4e8dbd83c1d4185e2c3bb0e62cdcdf2ffbe4843',
              input: {
                text: scenesText,
                source_language: 'eng_Latn',
                target_language: targetCode,
                max_length: 2048
              }
            })
          });

          if (!output.ok) {
            console.error(`Translation API error for ${targetLang}:`, await output.text());
            throw new Error(`Translation service error: ${output.status}`);
          }

          const prediction = await output.json();
          
          // Poll for result (Replicate is async)
          let translatedText = '';
          if (prediction.status === 'succeeded') {
            translatedText = prediction.output || '';
          } else if (prediction.urls?.get) {
            // Poll for result
            let pollAttempts = 0;
            while (pollAttempts < 30) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const statusResp = await fetch(prediction.urls.get, {
                headers: { 'Authorization': `Token ${REPLICATE_API_TOKEN}` }
              });
              
              const statusData = await statusResp.json();
              
              if (statusData.status === 'succeeded') {
                translatedText = typeof statusData.output === 'string' 
                  ? statusData.output 
                  : JSON.stringify(statusData.output);
                break;
              } else if (statusData.status === 'failed') {
                throw new Error('Translation job failed');
              }
              
              pollAttempts++;
            }
            
            if (!translatedText) {
              throw new Error('Translation timeout');
            }
          }

          translations[targetLang] = translatedText;

          // Save translation to database
          const { error: transErr } = await supabase
            .from('translations')
            .insert({
              breakdown_id: breakdownRow.id,
              language: targetLang,
              translated_text: translatedText,
              file_path: null
            });

          if (transErr) {
            console.error('Translation save error:', transErr);
          }

        } catch (translationError) {
          console.error(`Translation failed for ${targetLang}:`, translationError);
          translations[targetLang] = `Translation unavailable: ${translationError instanceof Error ? translationError.message : 'Unknown error'}`;
        }
      }
    }

    console.log('Script breakdown completed successfully');

    return new Response(JSON.stringify({
      success: true,
      breakdownId: breakdownRow.id,
      breakdown: breakdownObj,
      translations,
      stats: {
        totalScenes: breakdownObj.length,
        totalPages: breakdownObj.reduce((sum: number, s: any) => sum + (s.estimated_pages || 0), 0),
        translationsGenerated: Object.keys(translations).length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in script-breakdown-translate function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Processing failed',
      fallbackMessage: "Script processing temporarily unavailable. Please try again later."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
