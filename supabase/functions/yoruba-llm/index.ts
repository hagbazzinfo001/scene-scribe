import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { message, projectId } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Yoruba LLM request:', { message, projectId });

    // For now, use a simple Yoruba cultural film assistant
    // In production, this would connect to a real Yoruba LLM model
    const yorubaResponse = generateYorubaFilmAdvice(message);

    // Save to chat history
    try {
      await supabase.from('chat_messages').insert([
        {
          project_id: projectId || null,
          user_id: user.id,
          message: message,
          is_ai_response: false
        },
        {
          project_id: projectId || null,
          user_id: user.id,
          message: yorubaResponse,
          is_ai_response: true,
          metadata: { model: 'yoruba-film-assistant' }
        }
      ]);
    } catch (err) {
      console.error('Failed to save chat history:', err);
    }

    // Track usage for ROI
    try {
      await supabase.from('ai_usage_analytics').insert({
        user_id: user.id,
        project_id: projectId || null,
        provider: 'yoruba-llm',
        model: 'yoruba-film-assistant',
        endpoint: 'yoruba-llm',
        tokens_used: message.length + yorubaResponse.length,
        cost_estimate: 0.001, // Very cheap local processing
        success: true
      });
    } catch (err) {
      console.error('Failed to track usage:', err);
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: yorubaResponse,
        language: 'yoruba'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in yoruba-llm function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function generateYorubaFilmAdvice(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Cultural film advice based on Yoruba traditions and Nollywood context
  if (lowerMessage.includes('character') || lowerMessage.includes('akọrin')) {
    return "Ninu eya Yoruba, awọn ohun kikọ to dara ju lo ni: Baba agba (Elder), Iya agba (Elder woman), Omo ọdẹ (Hunter's child), Babalawo (Priest), ati Ọba (King). O le lo awọn orukọ Yoruba gẹgẹbi Adunni, Folake, Kunle, Segun. Ranti pe awọn aṣa Yoruba yẹ ki o wa ninu ohun kikọ rẹ - Ijọ, Orin, ati Asa Yoruba.";
  }
  
  if (lowerMessage.includes('story') || lowerMessage.includes('itan')) {
    return "Awọn itan Yoruba ti o dara fun fiimu ni: Itan Òrìṣà (Stories of Orishas), Itan Odu Ifa, Itan Ọba ati Olori (Kings and Queens), Itan ijagun (War stories), ati Itan ifẹ (Love stories). Lo awọn asa bi Egungun festival, Osun festival, abi New Yam festival lati ṣe itan rẹ di alagbara.";
  }
  
  if (lowerMessage.includes('location') || lowerMessage.includes('ibi')) {
    return "Awọn ibi to dara fun fiimu Yoruba ni: Ile Oba (Palace), Igbo (Forest), Oja (Market), Ile-isin (Church/Mosque), Agbala (Compound), ati Odò (River). Ni Lagos, o le lo Tafawa Balewa Square, National Theatre, abi Lekki Conservation Centre. Ranti pe awọn ibi Yoruba traditional yẹ ki o ni architectural features ti o tọ.";
  }
  
  if (lowerMessage.includes('music') || lowerMessage.includes('orin')) {
    return "Fun fiimu Yoruba, lo awọn ohun elo orin aṣa bi: Talking drum (Gangan), Bata drums, Sekere, Agogo, ati Flute (Fere). Awọn akọrin bi King Sunny Ade, Ebenezer Obey, ati Yusuf Olatunji ni inspirations to dara. Ṣe akoonu orin to ba aṣa Yoruba mu - praise singing (Oriki), worship songs, ati traditional chants.";
  }
  
  if (lowerMessage.includes('costume') || lowerMessage.includes('aṣọ')) {
    return "Awọn aṣọ Yoruba traditional ni: Agbada (men), Buba ati Iro (women), Gele (headwrap), Fila (men's cap), Ipele (shoulder cloth), ati Sanyan (silk). Awọn awọ pataki ni: Dudu (black) fun ọlà, Pupa (red) fun agbara, Funfun (white) fun mimọ. Ma ṣe gbagbe accessories bi Coral beads, Ivory bangles, ati traditional shoes.";
  }
  
  if (lowerMessage.includes('budget') || lowerMessage.includes('owo')) {
    return "Fun budget Nollywood Yoruba film: 60% fun cast ati crew, 20% fun equipment ati location, 15% fun post-production, 5% fun marketing. O le din owo ku nipa lilo local talents, shooting ni familiar locations, ati pa awọn scenes pọ to wa ni ipo kanna. Ranti pe quality content ṣe pataki ju expensive production lọ.";
  }
  
  // Default cultural advice
  return "Kú àbọ̀! (Welcome!) Fun fiimu Yoruba to dara, ranti awọn ohun pataki wọnyi: Aṣa Yoruba gbọdọ wa ninu (Culture must be present), Awọn character yẹ ki wọn sọrọ Yoruba to peye (Characters should speak proper Yoruba), Lo awọn proverbs ati saying (Òwe) lati mu script rẹ di alagbara, ati ṣe sure pe story rẹ ni moral lesson to gba awọn viewers lọ́kàn. Orukọ Yoruba, aṣọ traditional, ati awọn ibi Yoruba yẹ ki wọn wa ninu fiimu rẹ. Àṣẹ! (May it be so!)";
}