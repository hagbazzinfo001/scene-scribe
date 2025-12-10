import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Daily free tokens configuration
const DAILY_FREE_TOKENS = 10;
const RESET_HOURS = 24;

serve(async (req) => {
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
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'check';

    // Get user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    // Get user settings for last free token timestamp
    const { data: settings } = await supabaseClient
      .from('user_settings')
      .select('settings_data')
      .eq('user_id', user.id)
      .single();

    const lastFreeTokenTimestamp = settings?.settings_data?.last_free_token_timestamp;
    const now = new Date();
    
    // Calculate time until next free tokens
    let canClaimFreeTokens = true;
    let hoursUntilReset = 0;
    let minutesUntilReset = 0;

    if (lastFreeTokenTimestamp) {
      const lastClaim = new Date(lastFreeTokenTimestamp);
      const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastClaim < RESET_HOURS) {
        canClaimFreeTokens = false;
        const timeUntilReset = RESET_HOURS - hoursSinceLastClaim;
        hoursUntilReset = Math.floor(timeUntilReset);
        minutesUntilReset = Math.floor((timeUntilReset - hoursUntilReset) * 60);
      }
    }

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

      // Add free tokens
      await supabaseClient.rpc('add_user_credits', {
        p_user_id: user.id,
        p_amount: DAILY_FREE_TOKENS,
      });

      // Update last free token timestamp
      const newSettingsData = {
        ...(settings?.settings_data || {}),
        last_free_token_timestamp: now.toISOString(),
      };

      await supabaseClient
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings_data: newSettingsData,
          updated_at: now.toISOString(),
        }, { onConflict: 'user_id' });

      // Get updated credits
      const { data: updatedProfile } = await supabaseClient
        .from('profiles')
        .select('credits_remaining')
        .eq('id', user.id)
        .single();

      return new Response(JSON.stringify({
        success: true,
        message: `You received ${DAILY_FREE_TOKENS} free tokens!`,
        tokens_added: DAILY_FREE_TOKENS,
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
      daily_free_tokens: DAILY_FREE_TOKENS,
      can_claim_free_tokens: canClaimFreeTokens,
      hours_until_reset: hoursUntilReset,
      minutes_until_reset: minutesUntilReset,
      last_claim: lastFreeTokenTimestamp || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Daily tokens error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
