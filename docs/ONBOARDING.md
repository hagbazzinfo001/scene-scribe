# NollyAI Studio - Developer Onboarding Guide

Welcome to the NollyAI Studio development team! This guide will help you get started.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Project Structure](#project-structure)
4. [Running Locally](#running-locally)
5. [Adding New AI Models](#adding-new-ai-models)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+ and npm/bun
- Git
- A code editor (VS Code recommended)
- Access to Supabase project dashboard
- API keys for: OpenAI, Replicate (optional: Paystack for payments)

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd nollyai-studio
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Supabase (required)
VITE_SUPABASE_URL=https://lmxspzfqhmdnqxtzusfy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx...

# Optional: Add your project ID
VITE_SUPABASE_PROJECT_ID=lmxspzfqhmdnqxtzusfy
```

### 4. Configure Supabase Secrets

Go to Supabase Dashboard → Edge Functions → Secrets and add:

| Key | Description | Required |
|-----|-------------|----------|
| `OPENAI_API_KEY` | For script breakdown AI | Yes |
| `REPLICATE_API_TOKEN` | For 3D mesh, rotoscoping | Yes |
| `PAYSTACK_SECRET_KEY` | For payment processing | For production |

---

## Project Structure

```
nollyai-studio/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── hooks/              # Custom hooks
│   ├── pages/              # Route pages
│   ├── integrations/       # Supabase client
│   └── locales/            # i18n translations
├── supabase/
│   ├── functions/          # Edge functions (backend)
│   ├── migrations/         # Database migrations
│   └── config.toml         # Supabase config
├── docs/                   # Documentation
└── public/                 # Static assets
```

---

## Running Locally

### Start Development Server

```bash
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173`

### Edge Functions

Edge functions deploy automatically when you push changes in Lovable. For local testing, you can use the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link --project-ref lmxspzfqhmdnqxtzusfy

# Start local functions
supabase functions serve
```

---

## Adding New AI Models

### Step 1: Create the Edge Function

Create a new folder in `supabase/functions/`:

```typescript
// supabase/functions/my-new-model/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get input from request
    const { input_data } = await req.json();

    // 3. Deduct tokens
    const TOKEN_COST = 10;
    await supabase.rpc('deduct_user_credits', {
      p_user_id: user.id,
      p_amount: TOKEN_COST,
    });

    // 4. Call AI model (example: OpenAI)
    const aiResponse = await fetch('https://api.openai.com/v1/...', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ /* model params */ }),
    });

    const result = await aiResponse.json();

    // 5. Return result
    return new Response(JSON.stringify({ 
      success: true, 
      data: result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Step 2: Register in config.toml

Add to `supabase/config.toml`:

```toml
[functions.my-new-model]
verify_jwt = true
```

### Step 3: Create Frontend Hook

```typescript
// src/hooks/useMyModel.tsx
export function useMyModel() {
  const { session } = useAuth();
  
  const runModel = useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase.functions.invoke('my-new-model', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { input_data: input },
      });
      if (error) throw error;
      return data;
    },
  });

  return { runModel };
}
```

### Step 4: Add UI Component

Create a page or component that uses the hook.

---

## Common Tasks

### Adding a New Page

1. Create the page in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation item in `src/components/AppSidebar.tsx`

### Adding Translations

1. Add keys to all locale files in `src/locales/`
2. Use `useTranslation` hook: `const { t } = useTranslation()`

### Updating Database Schema

1. Create migration in Supabase Dashboard or via CLI
2. Types will auto-update in `src/integrations/supabase/types.ts`

### Testing Edge Functions

```bash
# Call function directly
curl -X POST https://lmxspzfqhmdnqxtzusfy.supabase.co/functions/v1/my-function \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

---

## Troubleshooting

### "Row Level Security" Errors

- Check RLS policies in Supabase Dashboard
- Ensure user is authenticated
- Verify the user owns the resource

### Edge Function 500 Errors

- Check function logs in Supabase Dashboard
- Verify all environment secrets are set
- Check CORS headers are included

### Token Balance Not Updating

- Verify `add_user_credits` / `deduct_user_credits` RPC functions exist
- Check `profiles` table has `credits_remaining` column
- Invalidate React Query cache after mutations

### Payment Not Working

1. Check `PAYSTACK_SECRET_KEY` is set in Supabase secrets
2. Verify callback URL is correct
3. Check Paystack dashboard for transaction logs

---

## Useful Links

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Replicate Docs](https://replicate.com/docs)
- [Paystack Docs](https://paystack.com/docs)
- [Lovable Docs](https://docs.lovable.dev)

---

## Getting Help

- Check `docs/TECHNICAL_OVERVIEW.md` for architecture details
- Review existing edge functions for patterns
- Ask in the team chat for specific questions

Happy coding! 🎬
