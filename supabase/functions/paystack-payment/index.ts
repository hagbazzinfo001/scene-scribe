import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token packages available for purchase
const TOKEN_PACKAGES = {
  starter: { tokens: 50, amount: 500, name: 'Starter Pack' },      // ₦500 = 50 tokens
  standard: { tokens: 150, amount: 1000, name: 'Standard Pack' },  // ₦1000 = 150 tokens
  premium: { tokens: 500, amount: 3000, name: 'Premium Pack' },    // ₦3000 = 500 tokens
  pro: { tokens: 1500, amount: 8000, name: 'Pro Pack' },           // ₦8000 = 1500 tokens
};

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
    const action = url.pathname.split('/').pop();

    // Get Paystack secret key - developers should add this in Supabase secrets
    // TODO: Add PAYSTACK_SECRET_KEY to Supabase secrets before going live
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY') || 'sk_test_placeholder_key';

    if (action === 'initiate' || req.method === 'POST') {
      const body = await req.json();
      const { packageId, callbackUrl } = body;

      // Determine if this is an initiate or verify request
      if (body.reference) {
        // This is a verify request
        return await verifyPayment(body.reference, paystackSecretKey, supabaseClient, user.id, corsHeaders);
      }

      // Initiate payment
      const pkg = TOKEN_PACKAGES[packageId as keyof typeof TOKEN_PACKAGES];
      if (!pkg) {
        return new Response(JSON.stringify({ error: 'Invalid package' }), {
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
      const reference = `nolly_${packageId}_${user.id.slice(0, 8)}_${Date.now()}`;

      // If using placeholder key, return mock response for development
      if (paystackSecretKey === 'sk_test_placeholder_key') {
        console.log('Using placeholder Paystack key - returning mock response');
        return new Response(JSON.stringify({
          success: true,
          message: 'Development mode - Paystack key not configured',
          data: {
            authorization_url: `${callbackUrl || '/dashboard'}?reference=${reference}&dev_mode=true`,
            access_code: 'mock_access_code',
            reference: reference,
          },
          package: pkg,
          dev_mode: true,
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
          amount: pkg.amount * 100, // Paystack uses kobo
          reference: reference,
          callback_url: callbackUrl || `${req.headers.get('origin')}/payment/verify`,
          metadata: {
            user_id: user.id,
            package_id: packageId,
            tokens: pkg.tokens,
          },
        }),
      });

      const paystackData = await paystackResponse.json();

      if (!paystackData.status) {
        return new Response(JSON.stringify({ error: paystackData.message || 'Payment initialization failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: paystackData.data,
        package: pkg,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Paystack payment error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function verifyPayment(
  reference: string,
  paystackSecretKey: string,
  supabaseClient: any,
  userId: string,
  corsHeaders: Record<string, string>
) {
  // Handle dev mode verification
  if (paystackSecretKey === 'sk_test_placeholder_key' || reference.includes('dev_mode')) {
    // Parse package ID from reference (format: nolly_packageId_userId_timestamp)
    const refParts = reference.split('_');
    const packageId = refParts[1] || 'starter';
    const pkg = TOKEN_PACKAGES[packageId as keyof typeof TOKEN_PACKAGES];
    const tokensToAdd = pkg?.tokens || 50;
    
    await supabaseClient.rpc('add_user_credits', {
      p_user_id: userId,
      p_amount: tokensToAdd,
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Development mode - tokens added',
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

  console.log('DEBUG: Full Paystack verify response:', JSON.stringify(verifyData, null, 2));
  console.log('DEBUG: Reference received:', reference);

  if (!verifyData.status || verifyData.data.status !== 'success') {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Payment verification failed' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Extract tokens from metadata, or parse from reference as fallback
  let tokensToAdd = verifyData.data.metadata?.tokens;
  console.log('DEBUG: Tokens from metadata:', tokensToAdd);
  
  // Fallback: parse package ID from reference (format: nolly_packageId_userId_timestamp)
  if (!tokensToAdd) {
    const refParts = reference.split('_');
    console.log('DEBUG: Reference parts:', refParts);
    const packageId = refParts[1] || 'starter';
    console.log('DEBUG: Parsed packageId:', packageId);
    const pkg = TOKEN_PACKAGES[packageId as keyof typeof TOKEN_PACKAGES];
    console.log('DEBUG: Found package:', pkg);
    tokensToAdd = pkg?.tokens || 50;
    console.log('DEBUG: Final tokensToAdd:', tokensToAdd);
  }

  // Add tokens to user's account
  await supabaseClient.rpc('add_user_credits', {
    p_user_id: userId,
    p_amount: tokensToAdd,
  });

  return new Response(JSON.stringify({
    success: true,
    message: 'Payment verified successfully',
    tokens_added: tokensToAdd,
    transaction: {
      reference: verifyData.data.reference,
      amount: verifyData.data.amount / 100,
      currency: verifyData.data.currency,
    },
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
