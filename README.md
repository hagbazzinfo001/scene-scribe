# NollyAI Studio - AI-Powered Nollywood Production Platform

## Project Overview

**URL**: https://lovable.dev/projects/dbaaf3e4-d141-4427-9311-4daa16986642

NollyAI Studio is a comprehensive AI-powered platform designed specifically for Nollywood film production. It provides automated script breakdown, video processing, audio enhancement, 3D asset generation, and production planning tools.

## Core Features

### 🎬 Script Analysis & Breakdown
- AI-powered script analysis using LLaMA-2-13B
- Automatic character, scene, location, and prop extraction
- Production planning and scheduling assistance
- Budget estimation and resource planning

### 🎥 Video Processing (VFX)
- **Rotoscoping/Tracking**: Object tracking and background removal using Robust Video Matting
- **Color Grading**: Professional color enhancement using Stable Diffusion XL
- **Mesh Generation**: 3D asset creation from text descriptions

### 🎵 Audio Processing
- Audio cleanup and enhancement
- Voice processing and noise reduction
- Background music generation

### 💬 AI Assistant
- Context-aware chat assistant for production questions
- Project-specific guidance and recommendations
- Integration with Anthropic Claude for intelligent responses

### 📚 Asset Management
- Centralized asset library for all project files
- Version control and metadata tracking
- Secure file storage and sharing

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling with custom design system
- **shadcn/ui** for consistent UI components
- **React Query** for state management and API caching
- **React Router** for navigation

### Backend
- **Supabase** for database, authentication, and file storage
- **Supabase Edge Functions** (Deno runtime) for serverless API endpoints
- **PostgreSQL** database with Row Level Security (RLS)
- **Replicate API** for AI model execution

### AI Models & Services
- **LLaMA-2-13B**: Script analysis and breakdown
- **Anthropic Claude**: Intelligent chat assistant
- **Stable Diffusion XL**: Image and color processing
- **Robust Video Matting**: Video object tracking/segmentation
- **Various Replicate models**: Audio processing, 3D generation

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Replicate account (for AI features)
- Anthropic API key (for chat features)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup

#### Required Supabase Secrets
Configure these in your Supabase project dashboard under Settings > Edge Functions:

```
REPLICATE_API_KEY=your_replicate_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

#### Database Setup
The project includes migration files in `supabase/migrations/` that set up:
- User profiles and authentication
- Projects and asset management
- Job processing system
- Chat message history
- Notifications system
- Usage analytics

## Development Guide

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui base components
│   ├── AssetLibrary.tsx
│   ├── ChatAssistant.tsx
│   └── ...
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── services/           # API service layers
├── types/              # TypeScript type definitions
└── integrations/       # Supabase integration

supabase/
├── functions/          # Edge Functions (serverless API)
├── migrations/         # Database schema migrations
└── config.toml         # Supabase configuration
```

### Adding New Features

#### 1. Create New Edge Function
```bash
# Create function directory
mkdir supabase/functions/your-function

# Create index.ts with proper structure
```

#### 2. Edge Function Template
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Your function logic here
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
```

#### 3. Frontend Service Integration
```typescript
// src/services/yourService.ts
import { supabase } from '@/integrations/supabase/client'

export const callYourFunction = async (data: any) => {
  const { data: result, error } = await supabase.functions.invoke('your-function', {
    body: data
  })
  
  if (error) throw error
  return result
}
```

### Database Schema

#### Core Tables
- `profiles`: User profile information
- `projects`: Film project data
- `user_assets`: File storage and metadata
- `jobs`: Background job processing
- `chat_messages`: AI chat history
- `notifications`: User notifications
- `ai_usage_analytics`: API usage tracking

#### Security
All tables implement Row Level Security (RLS) to ensure users can only access their own data.

### API Endpoints (Edge Functions)

#### Script Analysis
- `script-breakdown`: Analyze scripts and extract production elements
- `script-analyzer`: Alternative script analysis with different models

#### Video Processing
- `roto-tracking`: Video object tracking and masking
- `vfx-roto`: Advanced rotoscoping with SAM2
- `color-grade`: Professional color grading

#### Audio Processing
- `audio-cleanup`: Audio enhancement and noise reduction

#### 3D & Assets
- `mesh-generator`: 3D model generation from text
- `auto-rigger`: Character rigging automation

#### Utilities
- `chat-send`: AI chat assistant
- `get-signed-upload`: Secure file upload URLs
- `get-signed-download`: Secure file download URLs

## Deployment

### Supabase Deployment
1. Push code changes - Edge Functions deploy automatically
2. Run migrations: `supabase db push`
3. Configure secrets in Supabase dashboard

### Frontend Deployment
Use Lovable's built-in deployment:
1. Open project in Lovable
2. Click Share → Publish
3. Configure custom domain if needed

## Troubleshooting

### Common Issues

#### Edge Function Errors
- Check Supabase function logs
- Verify API keys are configured
- Ensure proper CORS headers

#### Authentication Issues
- Verify user session is valid
- Check RLS policies on database tables
- Ensure proper Authorization headers

#### File Upload/Download Issues
- Check storage bucket permissions
- Verify signed URL generation
- Ensure file paths include user ID

#### AI Model Failures
- Verify Replicate API key
- Check model version IDs are current
- Monitor API rate limits and usage

### Debug Tools
- Supabase Dashboard → Edge Functions → Logs
- Browser Developer Tools → Network tab
- Console logs in edge functions

## API Keys and Configuration

### Replicate API Key
Used for AI model execution. Get from [Replicate.com](https://replicate.com)

### Anthropic API Key
Used for Claude chat assistant. Get from [Anthropic Console](https://console.anthropic.com)

### Supabase Configuration
- Database URL and keys are auto-configured
- Storage buckets: `audio-uploads`, `video-uploads`, `vfx-assets`, `user-assets`

## Contributing

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Use semantic design tokens from `src/index.css`
- Implement responsive design patterns

### Testing
- Test edge functions with console logging
- Verify RLS policies with different user accounts
- Test file upload/download flows

### Security
- Never expose API keys in frontend code
- Use RLS policies for data access control
- Implement proper error handling
- Validate user inputs in edge functions

## Support

For development questions:
1. Check this README first
2. Review Supabase function logs
3. Test with sample data
4. Check browser console for client-side errors

## License

This project is built with Lovable and follows their terms of service.