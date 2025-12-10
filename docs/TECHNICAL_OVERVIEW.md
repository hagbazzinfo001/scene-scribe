# NollyAI Studio - Technical Overview

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Frontend Structure](#frontend-structure)
3. [Backend (Supabase Edge Functions)](#backend-supabase-edge-functions)
4. [Database Design](#database-design)
5. [Token/Credit System](#tokencredit-system)
6. [Payment Flow (Paystack)](#payment-flow-paystack)
7. [AI Job Pipeline](#ai-job-pipeline)
8. [Authentication](#authentication)

---

## Architecture Overview

NollyAI Studio is built on the **Lovable + Supabase** platform:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│  - TypeScript, Tailwind CSS, shadcn/ui components           │
│  - React Query for data fetching                             │
│  - React Router for navigation                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Platform                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Auth       │  │   Database   │  │   Storage    │       │
│  │ (JWT-based)  │  │ (PostgreSQL) │  │  (Buckets)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Edge Functions (Deno)                │       │
│  │  - AI model integrations                          │       │
│  │  - Payment processing                             │       │
│  │  - Background job processing                      │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  - OpenAI (GPT-4o-mini, GPT-4.1)                            │
│  - Replicate (TripoSR, RVM, NLLB)                           │
│  - Paystack (Payments)                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── TokenDisplay.tsx
│   ├── AppSidebar.tsx
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useAuth.tsx     # Authentication context
│   ├── useTokens.tsx   # Token management
│   └── ...
├── pages/              # Route pages
│   ├── Dashboard.tsx
│   ├── Payment.tsx
│   ├── ScriptBreakdown.tsx
│   └── ...
├── integrations/       # External service integrations
│   └── supabase/
│       ├── client.ts   # Supabase client instance
│       └── types.ts    # Auto-generated types
└── locales/            # i18n translations
    ├── en.json
    ├── fr.json
    └── de.json
```

---

## Backend (Supabase Edge Functions)

All backend logic runs in Supabase Edge Functions (Deno runtime):

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `paystack-payment` | Handle payment initiation & verification | Yes |
| `daily-tokens` | Manage daily free token claims | Yes |
| `script-breakdown-translate` | AI script analysis | Yes |
| `mesh-generator` | 3D model generation | Yes |
| `simple-roto` | Video rotoscoping | Yes |
| `job-worker` | Background job processor | No (cron) |

### Creating a New Edge Function

```bash
# Functions are in supabase/functions/
supabase/functions/
├── my-function/
│   └── index.ts
```

```typescript
// Basic edge function template
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Your logic here
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

---

## Database Design

### Core Tables

```sql
-- User profiles (extends auth.users)
profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  credits_remaining INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMP
)

-- User projects
projects (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES auth.users,
  name TEXT,
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- AI processing jobs
jobs (
  id UUID PRIMARY KEY,
  user_id UUID,
  project_id UUID,
  type TEXT,           -- 'script-breakdown', 'roto', 'mesh', etc.
  status TEXT,         -- 'queued', 'processing', 'done', 'failed'
  input_data JSONB,
  output_data JSONB,
  error TEXT,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
)

-- Script breakdowns
breakdowns (
  id UUID PRIMARY KEY,
  user_id UUID,
  project_id UUID,
  raw_text TEXT,
  breakdown JSONB,     -- Parsed scenes, characters, props
  created_at TIMESTAMP
)
```

### Row Level Security (RLS)

All tables have RLS policies ensuring users can only access their own data:

```sql
-- Example: Users can only see their own projects
CREATE POLICY "Users can view own projects"
ON projects FOR SELECT
USING (auth.uid() = owner_id);
```

---

## Token/Credit System

### Token Flow

```
User Action → Check Balance → Deduct Tokens → Run AI Model → Update Balance
```

### Token Costs by Model

| AI Model | Token Cost |
|----------|------------|
| Script Breakdown | ~5 per page |
| Translation | ~1 per page |
| Rotoscoping | ~10 per minute |
| 3D Mesh | ~15 per model |
| Audio Cleanup | ~3 per minute |

### Daily Free Tokens

- Users receive **10 free tokens** every 24 hours
- Tracked via `user_settings.settings_data.last_free_token_timestamp`
- Claim endpoint: `daily-tokens?action=claim`

### Database Functions

```sql
-- Add credits
add_user_credits(p_user_id UUID, p_amount INTEGER)

-- Deduct credits  
deduct_user_credits(p_user_id UUID, p_amount INTEGER)
```

---

## Payment Flow (Paystack)

### Integration Flow

```
1. User selects token package
2. Frontend calls paystack-payment edge function
3. Edge function initializes Paystack transaction
4. User redirected to Paystack checkout
5. After payment, user redirected back with reference
6. Frontend calls verify endpoint with reference
7. Edge function verifies with Paystack API
8. If successful, tokens added to user account
```

### Token Packages

| Package | Tokens | Price (₦) |
|---------|--------|-----------|
| Starter | 50 | 500 |
| Standard | 150 | 1,000 |
| Premium | 500 | 3,000 |
| Pro | 1,500 | 8,000 |

### Configuration

Add `PAYSTACK_SECRET_KEY` to Supabase secrets:
1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Add key: `PAYSTACK_SECRET_KEY`
3. Value: Your Paystack secret key (sk_live_xxx or sk_test_xxx)

---

## AI Job Pipeline

### Job States

```
QUEUED → PROCESSING → DONE/FAILED
```

### Background Processing

Jobs are processed by `job-worker` edge function, triggered by pg_cron every minute:

```sql
-- Cron job setup
SELECT cron.schedule(
  'process-ai-jobs',
  '* * * * *',
  $$ SELECT net.http_post(...) $$
);
```

### Job Processing Flow

```typescript
// 1. Create job
await supabase.from('jobs').insert({
  type: 'script-breakdown',
  user_id: userId,
  input_data: { script_text: '...' },
  status: 'queued'
});

// 2. Worker picks up job
// 3. Calls appropriate AI model
// 4. Updates job with results
await supabase.from('jobs').update({
  status: 'done',
  output_data: { breakdown: {...} }
});
```

---

## Authentication

### Supabase Auth

- Email/password signup & login
- Google OAuth support
- JWT tokens for API authentication

### Protected Routes

```tsx
// useAuth hook provides user state
const { user, loading, signIn, signOut } = useAuth();

// Edge functions verify JWT
const authHeader = req.headers.get('Authorization');
const { data: { user } } = await supabase.auth.getUser(token);
```

### User Roles

```sql
-- user_roles table
user_roles (
  user_id UUID,
  role app_role  -- 'admin', 'moderator', 'user'
)
```

---

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx...
```

### Supabase Secrets (Edge Functions)
```
SUPABASE_URL          # Auto-provided
SUPABASE_SERVICE_ROLE_KEY  # Auto-provided
OPENAI_API_KEY        # For GPT models
REPLICATE_API_TOKEN   # For TripoSR, RVM
PAYSTACK_SECRET_KEY   # For payments
```

---

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/functions/v1/daily-tokens` | GET | Check token status |
| `/functions/v1/daily-tokens?action=claim` | GET | Claim daily tokens |
| `/functions/v1/paystack-payment` | POST | Initiate/verify payment |
| `/functions/v1/script-breakdown-translate` | POST | Run script analysis |
| `/functions/v1/mesh-generator` | POST | Generate 3D mesh |
| `/functions/v1/simple-roto` | POST | Run rotoscoping |
