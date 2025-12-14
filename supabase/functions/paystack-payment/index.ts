import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Token Packages Configuration
 * 
 * Developers can easily adjust pricing and tokens:
 * - tokens: Number of tokens user receives
 * - amount: Price in Naira (₦)
 * - name: Display name for the package
 * 
 * To add a new package, simply add a new entry here.
 */
const TOKEN_PACKAGES: Record<string, { tokens: number; amount: number; name: string }> = {
  starter: { tokens: 50, amount: 500, name: 'Starter Pack' },      // ₦500 = 50 tokens
  standard: { tokens: 150, amount: 1000, name: 'Standard Pack' },  // ₦1000 = 150 tokens
  premium: { tokens: 500, amount: 3000, name: 'Premium Pack' },    // ₦3000 = 500 tokens
  pro: { tokens: 1500, amount: 8000, name: 'Pro Pack' },           // ₦8000 = 1500 tokens
};

/**
 * Paystack Payment Edge Function
 * 
 * Handles payment initialization and verification for token purchases.
 * 
 * Setup Instructions:
 * 1. Get your Paystack secret key from https://dashboard.paystack.co/#/settings/developer
 * 2. Add to Supabase secrets: PAYSTACK_SECRET_KEY=sk_live_xxx or sk_test_xxx
 * 
 * Usage:
 *   POST /paystack-payment
 *   Body: { packageId: 'starter' | 'standard' | 'premium' | 'pro', callbackUrl: string }
 *   
 *   For verification:
 *   POST /paystack-payment
 *   Body: { reference: string }
 */

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

    const body = await req.json();
    
    // Get Paystack secret key
    // TODO: Add PAYSTACK_SECRET_KEY to Supabase secrets before going live
    // Use: supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxxxx
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    const isDevMode = !paystackSecretKey || paystackSecretKey === 'sk_test_placeholder_key';

    // Check if this is a verification request
    if (body.reference) {
      return await verifyPayment(
        body.reference, 
        paystackSecretKey || '', 
        supabaseClient, 
        user.id, 
        isDevMode
      );
    }

    // Initiate payment
    const { packageId, callbackUrl } = body;

    const pkg = TOKEN_PACKAGES[packageId];
    if (!pkg) {
      return new Response(JSON.stringify({ 
        error: 'Invalid package',
        available_packages: Object.keys(TOKEN_PACKAGES),
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's email from profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const email = profile?.email || user.email;
    const reference = `nolly_${user.id.slice(0, 8)}_${Date.now()}`;

    console.log('Payment initiate:', { userId: user.id, packageId, reference, isDevMode });

    // Development mode - return mock response
    if (isDevMode) {
      console.log('DEV MODE: Paystack key not configured - returning mock response');
      return new Response(JSON.stringify({
        success: true,
        message: 'Development mode - Paystack key not configured. Add PAYSTACK_SECRET_KEY to Supabase secrets.',
        data: {
          authorization_url: `${callbackUrl || '/dashboard'}?reference=${reference}&dev_mode=true`,
          access_code: 'mock_access_code',
          reference: reference,
        },
        package: pkg,
        dev_mode: true,
        setup_instructions: 'To enable payments: supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxxxx',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize transaction with Paystack
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        amount: pkg.amount * 100, // Paystack uses kobo (1 Naira = 100 kobo)
        reference: reference,
        callback_url: callbackUrl || `${req.headers.get('origin')}/payment/verify`,
        metadata: {
          user_id: user.id,
          package_id: packageId,
          tokens: pkg.tokens,
          custom_fields: [
            { display_name: 'Package', variable_name: 'package', value: pkg.name },
            { display_name: 'Tokens', variable_name: 'tokens', value: pkg.tokens.toString() },
          ],
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Paystack error:', paystackData);
      return new Response(JSON.stringify({ 
        error: paystackData.message || 'Payment initialization failed' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Payment initialized:', { reference, authorization_url: paystackData.data.authorization_url });

    return new Response(JSON.stringify({
      success: true,
      data: paystackData.data,
      package: pkg,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Paystack payment error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function verifyPayment(
  reference: string,
  paystackSecretKey: string,
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  isDevMode: boolean
): Promise<Response> {
  console.log('Payment verification:', { reference, userId, isDevMode });

  // Handle dev mode verification
  if (isDevMode || reference.includes('dev_mode')) {
    // In dev mode, add starter pack tokens
    const tokensToAdd = 50;
    
    const { error: rpcError } = await supabaseClient.rpc('add_user_credits', {
      p_user_id: userId,
      p_amount: tokensToAdd,
    });

    if (rpcError) {
      console.error('Dev mode add credits error:', rpcError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: rpcError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('DEV MODE: Tokens added:', { userId, tokens: tokensToAdd });

    return new Response(JSON.stringify({
      success: true,
      message: 'Development mode - tokens added for testing',
      tokens_added: tokensToAdd,
      dev_mode: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify transaction with Paystack
  const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: {
      'Authorization': `Bearer ${paystackSecretKey}`,
    },
  });

  const verifyData = await verifyResponse.json();

  if (!verifyData.status || verifyData.data.status !== 'success') {
    console.error('Payment verification failed:', verifyData);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Payment verification failed',
      details: verifyData.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Extract tokens from metadata
  const tokensToAdd = verifyData.data.metadata?.tokens || 50;

  // Add tokens to user's account
  const { error: rpcError } = await supabaseClient.rpc('add_user_credits', {
    p_user_id: userId,
    p_amount: tokensToAdd,
  });

  if (rpcError) {
    console.error('Add credits after payment error:', rpcError);
    // Payment succeeded but credits failed - this is critical
    // Log for manual resolution
    console.error('CRITICAL: Payment succeeded but credits not added', {
      userId,
      reference,
      tokens: tokensToAdd,
      amount: verifyData.data.amount,
    });
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Payment verified but credits could not be added. Please contact support.',
      reference: verifyData.data.reference,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('Payment verified and tokens added:', { 
    userId, 
    tokens: tokensToAdd, 
    reference: verifyData.data.reference 
  });

  return new Response(JSON.stringify({
    success: true,
    message: 'Payment verified successfully',
    tokens_added: tokensToAdd,
    transaction: {
      reference: verifyData.data.reference,
      amount: verifyData.data.amount / 100, // Convert from kobo to Naira
      currency: verifyData.data.currency,
    },
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
