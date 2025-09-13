import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, task = 'chat' } = await req.json();

    // Check if Ollama is available locally (for development)
    const ollamaUrl = Deno.env.get('OLLAMA_URL') || 'http://localhost:11434';
    
    let response;
    try {
      // Try to use local Ollama instance
      const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:3b', // Lightweight model
          prompt: prompt,
          stream: false
        })
      });

      if (ollamaResponse.ok) {
        const data = await ollamaResponse.json();
        response = data.response;
      } else {
        throw new Error('Ollama not available');
      }
    } catch (ollamaError) {
      console.log('Ollama not available, using fallback');
      
      // Fallback to simple template responses
      response = getFallbackResponse(prompt, task);
    }

    return new Response(JSON.stringify({
      success: true,
      response: response,
      provider: 'ollama-local'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in ollama-local function:', error);
    return new Response(JSON.stringify({
      error: 'Local AI service unavailable',
      fallback: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getFallbackResponse(prompt: string, task: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  if (task === 'script_breakdown' || lowerPrompt.includes('script') || lowerPrompt.includes('breakdown')) {
    return `Script breakdown analysis:
- Characters: Extract main speaking roles from dialogue
- Scenes: Identify INT./EXT. locations and times
- Props: List required objects mentioned in action lines
- Locations: Note all filming locations needed
- Special FX: Identify any VFX or practical effects required

This analysis helps create accurate production budgets and schedules for Nollywood productions.`;
  }
  
  if (lowerPrompt.includes('vfx') || lowerPrompt.includes('visual effects')) {
    return `VFX planning for Nollywood productions:
- Pre-visualization: Plan shots requiring visual effects
- Asset creation: 3D models, textures, environments
- Compositing: Layer practical footage with digital elements
- Color grading: Achieve cinematic look and consistency
- Post-production: Timeline and delivery planning

Budget-friendly VFX solutions available for independent African filmmakers.`;
  }
  
  if (lowerPrompt.includes('audio') || lowerPrompt.includes('sound')) {
    return `Audio post-production for film:
- Dialogue cleanup: Remove background noise and enhance clarity
- Sound design: Create atmosphere and effects
- Music integration: Score and soundtrack placement
- Mixing: Balance all audio elements
- Mastering: Final audio polish for distribution

Professional audio quality essential for competitive Nollywood releases.`;
  }
  
  return `I'm your AI assistant for Nollywood film production. I can help with:
- Script breakdown and analysis
- Pre-production planning
- VFX and post-production workflows
- Budget optimization for African indie films
- Technical guidance for filmmakers

What specific aspect of your production would you like assistance with?`;
}