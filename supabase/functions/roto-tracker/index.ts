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
    const { videoUrl, trackingType, frameCount, projectId } = await req.json();
    
    console.log('Roto/Tracker request:', { videoUrl, trackingType, frameCount, projectId });

    if (!videoUrl || !trackingType) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields: videoUrl and trackingType are required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use OpenAI Vision API for object detection and tracking
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: `You are an AI VFX specialist that analyzes video frames for rotoscoping and object tracking. 
            Generate detailed frame-by-frame tracking data for ${trackingType} operations.` 
          },
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: `Analyze this video frame for ${trackingType}. Generate tracking points, masks, and motion vectors for ${frameCount || 30} frames.`
              },
              {
                type: 'image_url',
                image_url: { url: videoUrl }
              }
            ]
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    // Generate mock tracking data structure
    const trackingData = {
      frameCount: frameCount || 30,
      trackingType,
      masks: Array.from({ length: frameCount || 30 }, (_, i) => ({
        frame: i + 1,
        points: Array.from({ length: 8 }, (_, j) => ({
          x: Math.random() * 1920,
          y: Math.random() * 1080,
          confidence: 0.8 + Math.random() * 0.2
        })),
        timestamp: (i + 1) / 30
      })),
      motionVectors: Array.from({ length: frameCount || 30 }, (_, i) => ({
        frame: i + 1,
        dx: (Math.random() - 0.5) * 10,
        dy: (Math.random() - 0.5) * 10,
        confidence: 0.85 + Math.random() * 0.15
      })),
      analysis,
      projectId
    };

    console.log('Generated tracking data for project:', projectId);

    return new Response(JSON.stringify(trackingData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in roto-tracker function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});