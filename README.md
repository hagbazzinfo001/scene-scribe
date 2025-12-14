# NollyAI Studio 🎬

**Professional AI-Powered Video Production Studio for Nollywood**

A complete SaaS platform for film pre-production, VFX workflows, and AI-assisted content creation, specifically designed for Nollywood productions.

**Status**: ✅ **All Core Functions Working**

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🔧 Configuration

### Required Supabase Secrets

Configure these in your Supabase project dashboard → Settings → Edge Functions → Secrets:

```bash
# AI Services (required for core functionality)
OPENAI_API_KEY=sk-xxx           # Get from https://platform.openai.com/api-keys
REPLICATE_API_KEY=r8_xxx        # Get from https://replicate.com/account/api-tokens

# Payment (optional - dev mode works without)
PAYSTACK_SECRET_KEY=sk_live_xxx # Get from https://dashboard.paystack.co/#/settings/developer
```

### Environment Variables

The frontend uses these variables (already configured):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

---

## 💰 Token System

### How Tokens Work

- Users get **10 free tokens daily** (configurable)
- Tokens are used to run AI models
- Users can purchase more tokens via Paystack

### Token Configuration

**Daily Free Tokens** - Edit `supabase/functions/daily-tokens/index.ts`:
```typescript
const CONFIG = {
  DAILY_FREE_TOKENS: 10,  // Tokens per day
  RESET_HOURS: 24,        // Reset period
};
```

**Token Packages** - Edit `supabase/functions/paystack-payment/index.ts`:
```typescript
const TOKEN_PACKAGES = {
  starter: { tokens: 50, amount: 500, name: 'Starter Pack' },   // ₦500
  standard: { tokens: 150, amount: 1000, name: 'Standard Pack' }, // ₦1000
  premium: { tokens: 500, amount: 3000, name: 'Premium Pack' },   // ₦3000
  pro: { tokens: 1500, amount: 8000, name: 'Pro Pack' },          // ₦8000
};
```

> **Note**: Also update `src/hooks/useTokens.tsx` to match frontend packages.

### Admin Credit Management

Grant admin access to manage credits:
```sql
SELECT grant_admin_by_email('user@example.com');
```

Admins can add/deduct credits via the Admin dashboard at `/admin`.

---

## 🎬 Core Features

### ✅ Script Analysis & Breakdown
- AI-powered script analysis using OpenAI
- Automatic character, scene, location, and prop extraction
- PDF script upload and parsing
- Production planning insights

### ✅ VFX Tools
- **Rotoscoping/Tracking**: Video background removal
- **Color Grading**: AI-powered color correction
- **Auto-Rigger**: Generate character rigs
- **Mesh Generator**: Text-to-3D model generation

### ✅ Audio Processing
- Audio cleanup and enhancement
- Voice processing and noise reduction
- Real-time preview and download

### ✅ AI Assistant
- Context-aware chat assistant
- Project-specific guidance
- Script breakdown assistance

### ✅ Token & Billing
- Daily free tokens
- Paystack payment integration
- Admin credit management

---

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── TokenDisplay.tsx # Token balance display
├── hooks/
│   ├── useAuth.tsx     # Authentication hook
│   └── useTokens.tsx   # Token management hook
├── pages/
│   ├── Dashboard.tsx   # Main project dashboard
│   ├── Admin.tsx       # Admin panel
│   └── Payment.tsx     # Token purchase page
└── integrations/
    └── supabase/       # Supabase client & types

supabase/
├── functions/
│   ├── daily-tokens/       # Free token claims
│   ├── paystack-payment/   # Payment processing
│   ├── manage-credits/     # Admin credit management
│   ├── script-analyzer/    # Script analysis
│   ├── simple-roto/        # Video rotoscoping
│   └── mesh-generator/     # 3D mesh generation
└── config.toml             # Edge function config
```

---

## 🔐 Security

### Row-Level Security (RLS)
All tables have RLS enabled. Users can only access their own data.

### Admin Access
Admin role is stored in `user_roles` table (not in profiles to prevent privilege escalation).

```typescript
// Check admin status
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .eq('role', 'admin');
const isAdmin = roles?.length > 0;
```

---

## 🧪 Development Mode

When Paystack key is not configured, the payment system works in dev mode:
- Mock payment URLs are generated
- Tokens are added immediately for testing
- A warning message is shown to users

---

## 📝 Database Functions

```sql
-- Add credits to user
SELECT add_user_credits('user-uuid', 100);

-- Deduct credits from user
SELECT deduct_user_credits('user-uuid', 50);

-- Grant admin role
SELECT grant_admin_by_email('admin@example.com');
```

---

## 🔧 API Endpoints (Edge Functions)

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `daily-tokens` | Free token claims | Yes |
| `paystack-payment` | Payment processing | Yes |
| `manage-credits` | Admin credit management | Yes (Admin) |
| `chat-send` | AI chat assistant | Yes |
| `script-analyzer` | Script breakdown | Yes |
| `simple-roto` | Video rotoscoping | Yes |
| `simple-color-grade` | Color grading | Yes |
| `mesh-generator` | 3D model generation | Yes |

---

## 🚀 Deployment

Edge functions deploy automatically with Lovable.

To configure secrets:
1. Go to Supabase Dashboard → Settings → Edge Functions
2. Add required secrets (OPENAI_API_KEY, REPLICATE_API_KEY, PAYSTACK_SECRET_KEY)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details.
