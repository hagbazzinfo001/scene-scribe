import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    const { action, userId, amount } = await req.json();

    if (!userId || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'userId and positive amount required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (action === 'add') {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          credits_remaining: supabase.sql`credits_remaining + ${amount}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        credits_remaining: data.credits_remaining
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (action === 'deduct') {
      // Get current credits first
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const actualDeduct = Math.min(amount, profile.credits_remaining);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          credits_remaining: Math.max(0, profile.credits_remaining - amount),
          credits_used: supabase.sql`credits_used + ${actualDeduct}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        credits_remaining: data.credits_remaining
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "add" or "deduct"' }),
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Error in manage-credits:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
