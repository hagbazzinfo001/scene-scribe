import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sceneDescription, vfxType } = await req.json();
    
    let prompt = '';
    
    if (vfxType === 'roto') {
      prompt = `
Create a detailed rotoscoping plan for this scene:

Scene: ${sceneDescription}

Provide a JSON response with:
{
  "rotoPlanning": {
    "elements": [
      {
        "element": "Element to rotoscope",
        "complexity": "simple/medium/complex",
        "frames": "estimated frame count",
        "priority": "high/medium/low",
        "technique": "manual/assisted/automatic",
        "notes": "Special considerations"
      }
    ],
    "estimatedTime": "Hours needed",
    "recommendedSoftware": ["Software1", "Software2"],
    "trackingPoints": [
      {
        "point": "Point to track",
        "type": "position/rotation/scale",
        "stability": "stable/medium/unstable"
      }
    ]
  }
}`;
    } else if (vfxType === 'color-grade') {
      prompt = `
Create an auto color grading plan for this scene:

Scene: ${sceneDescription}

Provide a JSON response with:
{
  "colorGrading": {
    "mood": "Intended mood/feeling",
    "primaryLook": "Overall color treatment",
    "corrections": [
      {
        "adjustment": "Type of adjustment",
        "reason": "Why this adjustment",
        "intensity": "subtle/moderate/strong"
      }
    ],
    "luts": ["Recommended LUT styles"],
    "keyFrames": [
      {
        "timecode": "00:00:00",
        "adjustments": "Specific adjustments for this moment"
      }
    ]
  }
}`;
    }

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
            content: 'You are a VFX supervisor specializing in Nollywood productions. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const planText = data.choices[0].message.content;
    
    let plan;
    try {
      plan = JSON.parse(planText);
    } catch (parseError) {
      console.error('Failed to parse JSON:', planText);
      throw new Error('Failed to parse VFX plan');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      plan 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in vfx-planner function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error),
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});