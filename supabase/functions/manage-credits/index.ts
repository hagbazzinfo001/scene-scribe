import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Credit Management Edge Function
 * 
 * Allows admins to add or deduct credits from user accounts.
 * 
 * Usage:
 *   POST /manage-credits
 *   Body: { action: 'add' | 'deduct', userId: string, amount: number }
 * 
 * Configuration:
 *   - Requires admin role in user_roles table
 *   - Uses RPC functions: add_user_credits, deduct_user_credits
 * 
 * Developer Notes:
 *   - To grant admin access, run: SELECT grant_admin_by_email('user@example.com');
 *   - Amount must be integer between 1 and 100000
 */

serve(async (req) => {
  // Handle CORS preflight
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
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.log('Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has admin role
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.log('Role check error:', roleError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userRoles) {
      console.log('User not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const { action, userId, amount } = body;

    console.log('Credit management request:', { action, userId, amount, adminId: user.id });

    // Input validation
    if (!action || typeof action !== 'string' || !['add', 'deduct'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action: must be "add" or "deduct"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId || typeof userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid userId: must be a valid UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedAmount = typeof amount === 'string' ? parseInt(amount, 10) : amount;
    if (typeof parsedAmount !== 'number' || isNaN(parsedAmount) || parsedAmount < 1 || parsedAmount > 100000 || !Number.isInteger(parsedAmount)) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount: must be integer between 1 and 100000' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute credit operation using RPC functions
    if (action === 'add') {
      const { error: rpcError } = await supabase.rpc('add_user_credits', {
        p_user_id: userId,
        p_amount: parsedAmount,
      });

      if (rpcError) {
        console.error('Add credits error:', rpcError);
        return new Response(
          JSON.stringify({ error: rpcError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get updated balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits_remaining, credits_used')
        .eq('id', userId)
        .single();

      console.log('Credits added successfully:', { userId, amount: parsedAmount, newBalance: profile?.credits_remaining });

      return new Response(JSON.stringify({
        success: true,
        action: 'add',
        amount: parsedAmount,
        credits_remaining: profile?.credits_remaining ?? 0,
        credits_used: profile?.credits_used ?? 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // Deduct credits
      const { error: rpcError } = await supabase.rpc('deduct_user_credits', {
        p_user_id: userId,
        p_amount: parsedAmount,
      });

      if (rpcError) {
        console.error('Deduct credits error:', rpcError);
        return new Response(
          JSON.stringify({ error: rpcError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get updated balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits_remaining, credits_used')
        .eq('id', userId)
        .single();

      console.log('Credits deducted successfully:', { userId, amount: parsedAmount, newBalance: profile?.credits_remaining });

      return new Response(JSON.stringify({
        success: true,
        action: 'deduct',
        amount: parsedAmount,
        credits_remaining: profile?.credits_remaining ?? 0,
        credits_used: profile?.credits_used ?? 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Manage credits error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
