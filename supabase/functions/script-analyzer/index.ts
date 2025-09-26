import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scriptContent, scriptId } = await req.json();
    
    if (!scriptContent || !scriptId) {
      throw new Error('Script content and ID are required');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Analyze script with OpenAI
    const analysisPrompt = `
Analyze this Nollywood film script and extract the following information in JSON format:

{
  "scenes": [
    {
      "number": 1,
      "location": "Interior/Exterior - Location Name",
      "timeOfDay": "Day/Night",
      "description": "Scene description",
      "characters": ["Character1", "Character2"],
      "props": ["Prop1", "Prop2"],
      "vfxNeeds": "low/medium/high",
      "vfxDescription": "Description of VFX requirements if any",
      "sfxNeeds": "low/medium/high",
      "duration": "estimated minutes"
    }
  ],
  "characters": [
    {
      "name": "Character Name",
      "description": "Character description",
      "ageRange": "Age range",
      "importance": "lead/supporting/background"
    }
  ],
  "locations": [
    {
      "name": "Location Name",
      "type": "interior/exterior",
      "description": "Location description",
      "sceneCount": 1
    }
  ],
  "props": [
    {
      "name": "Prop Name",
      "category": "Category",
      "importance": "essential/nice-to-have",
      "scenes": [1, 2, 3]
    }
  ],
  "overallAnalysis": {
    "genre": "Genre",
    "estimatedBudget": "low/medium/high",
    "complexity": "simple/moderate/complex",
    "vfxIntensity": "low/medium/high",
    "recommendedCrewSize": "small/medium/large",
    "shootingDays": "estimated number"
  }
}

Script:
${scriptContent}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are an expert script breakdown analyst for Nollywood films. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse JSON:', analysisText);
      throw new Error('Failed to parse analysis result');
    }

    // Save breakdown to database
    const { data: breakdown, error: breakdownError } = await supabase
      .from('breakdowns')
      .insert([
        {
          script_id: scriptId,
          type: 'full_analysis',
          content: analysis
        }
      ])
      .select()
      .single();

    if (breakdownError) {
      console.error('Database error:', breakdownError);
      throw new Error('Failed to save breakdown to database');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
      breakdownId: breakdown.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in script-analyzer function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error),
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});