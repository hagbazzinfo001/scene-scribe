import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Free script breakdown using pattern matching and basic NLP
function analyzeScript(scriptContent: string) {
  const lines = scriptContent.split('\n');
  const analysis = {
    characters: new Set<string>(),
    scenes: new Set<string>(),
    props: new Set<string>(),
    locations: new Set<string>(),
    summary: {
      totalScenes: 0,
      totalCharacters: 0,
      estimatedPages: Math.ceil(lines.length / 50),
      genre: 'Drama' // Default
    }
  };

  // Extract characters (ALL CAPS names before dialogue)
  const characterRegex = /^([A-Z][A-Z\s]+)$/;
  
  // Extract scenes (INT./EXT. patterns)
  const sceneRegex = /(INT\.|EXT\.)\s*([^-\n]+)/i;
  
  // Common film props to look for
  const commonProps = [
    'gun', 'phone', 'car', 'knife', 'bag', 'money', 'documents', 
    'laptop', 'camera', 'keys', 'watch', 'ring', 'newspaper',
    'bottle', 'glass', 'cigarette', 'book', 'letter', 'photograph'
  ];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Character detection
    if (characterRegex.test(trimmedLine) && trimmedLine.length < 30) {
      analysis.characters.add(trimmedLine);
    }
    
    // Scene detection
    const sceneMatch = trimmedLine.match(sceneRegex);
    if (sceneMatch) {
      analysis.scenes.add(trimmedLine);
      analysis.summary.totalScenes++;
      
      // Extract location from scene header
      const location = sceneMatch[2].split('-')[0].trim();
      if (location) {
        analysis.locations.add(location);
      }
    }
    
    // Props detection
    const lowerLine = trimmedLine.toLowerCase();
    commonProps.forEach(prop => {
      if (lowerLine.includes(prop)) {
        analysis.props.add(prop);
      }
    });
  });

  analysis.summary.totalCharacters = analysis.characters.size;

  // Determine genre based on content
  const content = scriptContent.toLowerCase();
  if (content.includes('gun') || content.includes('fight') || content.includes('chase')) {
    analysis.summary.genre = 'Action';
  } else if (content.includes('love') || content.includes('romance') || content.includes('wedding')) {
    analysis.summary.genre = 'Romance';
  } else if (content.includes('laugh') || content.includes('funny') || content.includes('joke')) {
    analysis.summary.genre = 'Comedy';
  } else if (content.includes('ghost') || content.includes('spirit') || content.includes('supernatural')) {
    analysis.summary.genre = 'Supernatural';
  }

  return {
    characters: Array.from(analysis.characters).slice(0, 20),
    scenes: Array.from(analysis.scenes).slice(0, 25),
    props: Array.from(analysis.props).slice(0, 15),
    locations: Array.from(analysis.locations).slice(0, 15),
    summary: analysis.summary,
    productionNotes: generateProductionNotes(analysis)
  };
}

function generateProductionNotes(analysis: any) {
  const notes = [];
  
  if (analysis.characters.size > 10) {
    notes.push("Large cast - consider scheduling efficiency and budget for multiple actors");
  }
  
  if (analysis.scenes.size > 20) {
    notes.push("Multiple locations - plan for transportation and location fees");
  }
  
  if (analysis.props.has('gun') || analysis.props.has('knife')) {
    notes.push("Weapon props required - ensure proper permits and safety protocols");
  }
  
  if (analysis.props.has('car')) {
    notes.push("Vehicle scenes - budget for car rental and driving permits");
  }
  
  return notes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scriptContent, projectId } = await req.json();

    if (!scriptContent) {
      return new Response(
        JSON.stringify({ error: "Script content is required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Processing script breakdown for project:', projectId);
    
    // Perform free script analysis
    const breakdown = analyzeScript(scriptContent);
    
    // Save breakdown to database if project ID provided
    if (projectId) {
      try {
        await supabase.from('breakdowns').insert({
          project_id: projectId,
          characters: breakdown.characters,
          scenes: breakdown.scenes,
          props: breakdown.props,
          locations: breakdown.locations,
          summary: breakdown.summary,
          production_notes: breakdown.productionNotes,
          breakdown_data: breakdown,
          processing_status: 'completed'
        });
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Continue with response even if database save fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      breakdown: breakdown,
      message: "Script breakdown completed using free pattern analysis",
      provider: "free-analysis"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in script-breakdown-free function:', error);
    return new Response(JSON.stringify({
      error: 'Script breakdown analysis failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});