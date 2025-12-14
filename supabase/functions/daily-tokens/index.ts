import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Daily Free Tokens Configuration
 * 
 * Developers can easily adjust these values:
 * - DAILY_FREE_TOKENS: Number of tokens given daily (default: 10)
 * - RESET_HOURS: Hours between free token claims (default: 24)
 */
const CONFIG = {
  DAILY_FREE_TOKENS: 10,  // Change this to adjust daily free tokens
  RESET_HOURS: 24,        // Change this to adjust reset period
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.log('Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'check';

    console.log('Daily tokens request:', { userId: user.id, action });

    // Get user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('credits_remaining, credits_used')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError);
      throw profileError;
    }

    // Get user settings for last free token timestamp
    const { data: settings, error: settingsError } = await supabaseClient
      .from('user_settings')
      .select('settings_data')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Settings fetch error:', settingsError);
    }

    const lastFreeTokenTimestamp = settings?.settings_data?.last_free_token_timestamp;
    const now = new Date();
    
    // Calculate time until next free tokens
    let canClaimFreeTokens = true;
    let hoursUntilReset = 0;
    let minutesUntilReset = 0;

    if (lastFreeTokenTimestamp) {
      const lastClaim = new Date(lastFreeTokenTimestamp);
      const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastClaim < CONFIG.RESET_HOURS) {
        canClaimFreeTokens = false;
        const timeUntilReset = CONFIG.RESET_HOURS - hoursSinceLastClaim;
        hoursUntilReset = Math.floor(timeUntilReset);
        minutesUntilReset = Math.floor((timeUntilReset - hoursUntilReset) * 60);
      }
    }

    // Handle claim action
    if (action === 'claim') {
      if (!canClaimFreeTokens) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Free tokens already claimed today',
          hours_until_reset: hoursUntilReset,
          minutes_until_reset: minutesUntilReset,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Add free tokens using RPC
      const { error: rpcError } = await supabaseClient.rpc('add_user_credits', {
        p_user_id: user.id,
        p_amount: CONFIG.DAILY_FREE_TOKENS,
      });

      if (rpcError) {
        console.error('Add credits error:', rpcError);
        throw rpcError;
      }

      // Update last free token timestamp in user_settings
      const newSettingsData = {
        ...(settings?.settings_data || {}),
        last_free_token_timestamp: now.toISOString(),
      };

      const { error: upsertError } = await supabaseClient
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings_data: newSettingsData,
          updated_at: now.toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('Settings upsert error:', upsertError);
        // Don't throw - tokens were already added
      }

      // Get updated credits
      const { data: updatedProfile } = await supabaseClient
        .from('profiles')
        .select('credits_remaining')
        .eq('id', user.id)
        .single();

      console.log('Free tokens claimed:', { userId: user.id, tokens: CONFIG.DAILY_FREE_TOKENS });

      return new Response(JSON.stringify({
        success: true,
        message: `You received ${CONFIG.DAILY_FREE_TOKENS} free tokens!`,
        tokens_added: CONFIG.DAILY_FREE_TOKENS,
        new_balance: updatedProfile?.credits_remaining || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: check status
    return new Response(JSON.stringify({
      success: true,
      current_balance: profile?.credits_remaining || 0,
      credits_used: profile?.credits_used || 0,
      daily_free_tokens: CONFIG.DAILY_FREE_TOKENS,
      can_claim_free_tokens: canClaimFreeTokens,
      hours_until_reset: hoursUntilReset,
      minutes_until_reset: minutesUntilReset,
      last_claim: lastFreeTokenTimestamp || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Daily tokens error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
