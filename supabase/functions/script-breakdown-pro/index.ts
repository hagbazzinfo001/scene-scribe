import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface BreakdownScene {
  scene_number: number;
  slugline: string;
  int_ext: 'INT' | 'EXT';
  time: 'DAY' | 'NIGHT' | 'MORNING' | 'EVENING';
  location: string;
  description: string;
  characters: string[];
  props: string[];
  wardrobe: string[];
  vfx_sfx: string[];
  production_notes: string[];
  estimated_pages: number;
}

interface ComprehensiveBreakdown {
  scenes: BreakdownScene[];
  characters: {
    name: string;
    type: 'main' | 'supporting' | 'extra';
    scene_count: number;
    scenes: number[];
  }[];
  props: { name: string; scenes: number[]; quantity?: number }[];
  locations: { name: string; int_ext: string; time: string[]; scenes: number[] }[];
  wardrobe: { character: string; items: string[]; changes: number }[];
  vfx_requirements: { type: string; complexity: 'low' | 'medium' | 'high'; scenes: number[] }[];
  production_requirements: {
    stunts: string[];
    animals: string[];
    children: number;
    vehicles: string[];
    crowd_scenes: number[];
    special_equipment: string[];
  };
  statistics: {
    total_scenes: number;
    total_pages: number;
    total_characters: number;
    total_locations: number;
    shooting_days_estimate: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { scriptText, jobId, projectId, translateTo = [] } = await req.json();

    if (!scriptText || !jobId) {
      return new Response(JSON.stringify({ error: 'scriptText and jobId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing script breakdown for job ${jobId}, length: ${scriptText.length}`);

    // Update job status to processing
    await supabase.from('jobs').update({
      status: 'processing',
      updated_at: new Date().toISOString()
    }).eq('id', jobId);

    // STEP 1: Segment script using GPT-4.1-mini (cost-effective)
    console.log('Step 1: Segmenting script...');
    const segmentationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are a professional script supervisor. Segment the script into scenes with sluglines. Return ONLY valid JSON array.'
          },
          {
            role: 'user',
            content: `Segment this script into scenes. For each scene extract:
- scene_number
- slugline (e.g., "INT. OFFICE - DAY")
- int_ext (INT or EXT)
- time (DAY, NIGHT, MORNING, EVENING)
- location (specific place)
- description (brief scene description)
- estimated_pages (0.125 increments)

Return as JSON array. Script:

${scriptText}`
          }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!segmentationResponse.ok) {
      throw new Error(`Segmentation failed: ${segmentationResponse.statusText}`);
    }

    const segmentData = await segmentationResponse.json();
    let scenes: BreakdownScene[] = [];
    
    try {
      const content = segmentData.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedScenes = JSON.parse(jsonMatch[0]);
        scenes = parsedScenes.map((s: any, idx: number) => ({
          ...s,
          scene_number: s.scene_number || idx + 1,
          characters: [],
          props: [],
          wardrobe: [],
          vfx_sfx: [],
          production_notes: []
        }));
      }
    } catch (e) {
      console.error('Failed to parse segmentation:', e);
      throw new Error('Failed to parse script scenes');
    }

    console.log(`Segmented into ${scenes.length} scenes`);

    // STEP 2: Extract comprehensive details using GPT-4o-mini
    console.log('Step 2: Extracting comprehensive breakdown...');
    
    const breakdownResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional 1st AD. Extract ALL production elements from the script. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: `Analyze this script and extract:

1. For each scene: characters (speaking + background), props, wardrobe items, VFX/SFX needs, production notes
2. Character list: name, type (main/supporting/extra), scene appearances
3. All props with quantities
4. All locations with INT/EXT and times
5. Wardrobe per character
6. VFX requirements with complexity (low/medium/high)
7. Production requirements: stunts, animals, children count, vehicles, crowd scenes, special equipment

Return as JSON with structure:
{
  "scene_details": [{"scene_number": 1, "characters": [], "props": [], "wardrobe": [], "vfx_sfx": [], "production_notes": []}],
  "characters": [{"name": "", "type": "", "scenes": []}],
  "props": [{"name": "", "scenes": [], "quantity": 1}],
  "locations": [{"name": "", "int_ext": "", "time": [], "scenes": []}],
  "wardrobe": [{"character": "", "items": [], "changes": 1}],
  "vfx_requirements": [{"type": "", "complexity": "", "scenes": []}],
  "production_requirements": {"stunts": [], "animals": [], "children": 0, "vehicles": [], "crowd_scenes": [], "special_equipment": []}
}

Script:
${scriptText}`
          }
        ],
        max_completion_tokens: 4000,
        temperature: 0.3
      }),
    });

    if (!breakdownResponse.ok) {
      throw new Error(`Breakdown extraction failed: ${breakdownResponse.statusText}`);
    }

    const breakdownData = await breakdownResponse.json();
    let extracted: any = {};
    
    try {
      const content = breakdownData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse breakdown:', e);
      extracted = {
        scene_details: [],
        characters: [],
        props: [],
        locations: [],
        wardrobe: [],
        vfx_requirements: [],
        production_requirements: {}
      };
    }

    // Merge scene details
    if (extracted.scene_details && Array.isArray(extracted.scene_details)) {
      extracted.scene_details.forEach((detail: any) => {
        const scene = scenes.find(s => s.scene_number === detail.scene_number);
        if (scene) {
          scene.characters = detail.characters || [];
          scene.props = detail.props || [];
          scene.wardrobe = detail.wardrobe || [];
          scene.vfx_sfx = detail.vfx_sfx || [];
          scene.production_notes = detail.production_notes || [];
        }
      });
    }

    // Build comprehensive breakdown
    const breakdown: ComprehensiveBreakdown = {
      scenes,
      characters: extracted.characters || [],
      props: extracted.props || [],
      locations: extracted.locations || [],
      wardrobe: extracted.wardrobe || [],
      vfx_requirements: extracted.vfx_requirements || [],
      production_requirements: extracted.production_requirements || {
        stunts: [],
        animals: [],
        children: 0,
        vehicles: [],
        crowd_scenes: [],
        special_equipment: []
      },
      statistics: {
        total_scenes: scenes.length,
        total_pages: scenes.reduce((sum, s) => sum + s.estimated_pages, 0),
        total_characters: extracted.characters?.length || 0,
        total_locations: extracted.locations?.length || 0,
        shooting_days_estimate: Math.ceil(scenes.reduce((sum, s) => sum + s.estimated_pages, 0) / 5)
      }
    };

    console.log('Comprehensive breakdown completed');

    // STEP 3: Translations (if requested)
    const translations: Record<string, string> = {};
    
    if (translateTo && translateTo.length > 0) {
      console.log(`Step 3: Translating to ${translateTo.length} languages...`);
      
      // Use NLLB via Replicate for African languages
      const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
      if (REPLICATE_API_TOKEN) {
        const languageCodes: Record<string, string> = {
          'yoruba': 'yor_Latn',
          'igbo': 'ibo_Latn',
          'hausa': 'hau_Latn',
          'swahili': 'swh_Latn'
        };

        for (const lang of translateTo) {
          try {
            const targetCode = languageCodes[lang.toLowerCase()];
            if (!targetCode) continue;

            const translationRes = await fetch('https://api.replicate.com/v1/predictions', {
              method: 'POST',
              headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                version: 'f8ba68d90719b6bdf29e2532e4e8dbd83c1d4185e2c3bb0e62cdcdf2ffbe4843',
                input: {
                  text: scriptText.substring(0, 5000), // Limit for translation
                  source_language: 'eng_Latn',
                  target_language: targetCode,
                  max_length: 2048
                }
              })
            });

            if (translationRes.ok) {
              const predData = await translationRes.json();
              translations[lang] = predData.id; // Store prediction ID
              
              // Store translation record
              await supabase.from('translations').insert({
                breakdown_id: jobId,
                language: lang,
                translated_text: `Translation queued: ${predData.id}`,
                file_path: null
              });
            }
          } catch (err) {
            console.error(`Translation failed for ${lang}:`, err);
          }
        }
      }
    }

    // Store breakdown in database
    await supabase.from('breakdowns').insert({
      user_id: user.id,
      project_id: projectId || null,
      breakdown: breakdown,
      raw_text: scriptText,
      original_filename: 'script.txt',
      type: 'comprehensive'
    });

    // Update job with results
    await supabase.from('jobs').update({
      status: 'done',
      output_data: breakdown,
      completed_at: new Date().toISOString()
    }).eq('id', jobId);

    // Send notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: 'Script Breakdown Complete',
      message: `Analyzed ${breakdown.statistics.total_scenes} scenes with ${breakdown.statistics.total_characters} characters`,
      type: 'success'
    });

    console.log(`Job ${jobId} completed successfully`);

    return new Response(JSON.stringify({
      success: true,
      breakdown,
      translations,
      costs: {
        segmentation_estimate: '$0.05',
        breakdown_estimate: '$0.07',
        total_estimate: '$0.12'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Script breakdown error:', error);
    
    // Try to update job as failed
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const body = await req.json().catch(() => ({}));
      if (body.jobId) {
        await supabase.from('jobs').update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
          completed_at: new Date().toISOString()
        }).eq('id', body.jobId);
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      details: 'Script breakdown processing failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
