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
    const { characterType, animationStyle, rigComplexity } = await req.json();

    const prompt = `
Create an auto-rigging plan for a ${characterType} character for Nollywood animation:

Character Type: ${characterType}
Animation Style: ${animationStyle}
Rig Complexity: ${rigComplexity}

Provide a JSON response with:
{
  "rigPlan": {
    "characterType": "${characterType}",
    "rigType": "humanoid/creature/prop",
    "boneStructure": [
      {
        "boneName": "Bone name",
        "parent": "Parent bone",
        "constraints": ["Constraint types"],
        "priority": "high/medium/low"
      }
    ],
    "controllers": [
      {
        "name": "Controller name",
        "type": "FK/IK/Custom",
        "bodyPart": "Body part it controls",
        "complexity": "simple/advanced"
      }
    ],
    "facialRig": {
      "eyeControls": "Eye control setup",
      "mouthControls": "Mouth control setup",
      "eyebrowControls": "Eyebrow control setup"
    },
    "estimatedTime": "Hours to complete",
    "recommendedSoftware": ["Software recommendations"],
    "specialFeatures": ["Unique rig features needed"]
  }
}`;

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
            content: 'You are a character rigging expert for animation. Always respond with valid JSON format.'
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
    const rigPlanText = data.choices[0].message.content;
    
    let rigPlan;
    try {
      rigPlan = JSON.parse(rigPlanText);
    } catch (parseError) {
      console.error('Failed to parse JSON:', rigPlanText);
      throw new Error('Failed to parse rig plan');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      rigPlan 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-rigger function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});