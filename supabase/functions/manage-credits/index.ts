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

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify user has admin role
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !userRoles) {
      console.log('Authorization failed for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const { action, userId, amount } = body;

    // Input validation
    if (!action || typeof action !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid action parameter' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!userId || typeof userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid userId parameter' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (typeof amount !== 'number' || amount < 0 || amount > 100000 || !Number.isInteger(amount)) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount: must be integer between 0 and 100000' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['add', 'deduct'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action: must be "add" or "deduct"' }),
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
    // Return generic error message to client, log details server-side
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
