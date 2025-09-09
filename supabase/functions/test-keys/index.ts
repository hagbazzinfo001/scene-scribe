import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const testResults: any = {};

    // Test Replicate API
    const replicateToken = Deno.env.get('REPLICATE_API_KEY');
    if (replicateToken) {
      try {
        const replicateResponse = await fetch('https://api.replicate.com/v1/models', {
          headers: { 'Authorization': `Token ${replicateToken}` }
        });
        testResults.replicate = {
          status: replicateResponse.ok ? 'success' : 'failed',
          statusCode: replicateResponse.status
        };
      } catch (err) {
        testResults.replicate = { status: 'error', error: err.message };
      }
    } else {
      testResults.replicate = { status: 'missing', error: 'REPLICATE_API_KEY not set' };
    }

    // Test OpenAI API
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiKey) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${openaiKey}` }
        });
        testResults.openai = {
          status: openaiResponse.ok ? 'success' : 'failed',
          statusCode: openaiResponse.status
        };
      } catch (err) {
        testResults.openai = { status: 'error', error: err.message };
      }
    } else {
      testResults.openai = { status: 'missing', error: 'OPENAI_API_KEY not set' };
    }

    // Test Supabase connection
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseKey) {
      testResults.supabase = { status: 'configured' };
    } else {
      testResults.supabase = { 
        status: 'missing', 
        error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set' 
      };
    }

    return new Response(JSON.stringify({ 
      timestamp: new Date().toISOString(),
      results: testResults 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test keys error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});