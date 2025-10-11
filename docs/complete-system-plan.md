# NollyAI Studio - Complete System Implementation Plan

## 🎯 Core Workflow
User Login → Create Project → Upload Files → Process with AI Plugins → Preview/Edit → Download Results

---

## 📋 System Components Status & Action Plan

### 1️⃣ **AUTHENTICATION & USER MANAGEMENT**
**Status:** ✅ Working
**Components:**
- Auth page (`/auth`) - Email/password signup & login
- User profiles table with credits system
- Session management with localStorage

**Action Items:**
- ✅ Already implemented
- 🔧 Add password reset flow
- 🔧 Add email verification toggle recommendation

---

### 2️⃣ **PROJECT MANAGEMENT**
**Status:** ⚠️ Needs Testing
**Components:**
- Projects table with RLS
- Dashboard showing user projects
- Project workspace for file management

**Action Items:**
- ✅ Database schema exists
- 🔧 Test project creation flow
- 🔧 Ensure project_id validation in all edge functions
- 🔧 Add project deletion with cascade cleanup

**Edge Functions:**
- `create-project` - Validate and sanitize inputs

---

### 3️⃣ **SCRIPT BREAKDOWN AI**
**Status:** ⚠️ Needs Connection to Working AI
**Workflow:**
1. User uploads script file (.txt, .pdf, .fountain)
2. Backend calls OpenAI/Gemini for analysis
3. Returns JSON: { scenes, characters, props, locations, costumes }
4. Display in BreakdownResults component

**Action Items:**
- 🔧 Update `script-breakdown` edge function to use Lovable AI (Gemini)
- 🔧 Add input validation (max file size, supported formats)
- 🔧 Implement chunking for large scripts (>10k tokens)
- 🔧 Add cost estimation before processing
- 🔧 Store results in `jobs` table with proper output_data

**Edge Functions to Update:**
- `script-breakdown` - Main analyzer
- `script-breakdown-enhanced` - Advanced features
- `simple-script-breakdown` - Lightweight version

**Database:**
- scripts table ✅
- jobs table ✅
- Add caching in analysis_cache table

---

### 4️⃣ **ROTOSCOPING & TRACKING**
**Status:** ❌ Broken (projectId validation error)
**Workflow:**
1. User uploads video
2. Backend calls Replicate (chenxwh/rvm model)
3. Returns masked video with alpha channel
4. User downloads or uses in editor

**Action Items:**
- ✅ Fixed projectId validation in simple-roto
- 🔧 Test with valid Replicate API key
- 🔧 Add progress polling UI
- 🔧 Implement frame range selection
- 🔧 Add preview before downloading
- 🔧 Cost estimation (Replicate charges per second)

**Edge Functions:**
- `simple-roto` - ✅ Fixed validation
- `roto-tracking` - Uses chenxwh/rvm model
- `roto-enhanced` - Advanced features

**Storage Buckets:**
- `video-uploads` ✅
- `vfx-assets` for outputs ✅

---

### 5️⃣ **MESH GENERATOR (Image to 3D)**
**Status:** ✅ Just Fixed - Using TRELLIS model
**Workflow:**
1. User uploads image
2. Select target face count & file format
3. Backend calls Replicate (firtoz/trellis)
4. Returns .glb or .obj file
5. Preview in Three.js viewer
6. Download or save to assets

**Action Items:**
- ✅ Updated to use TRELLIS model (4876f2a8...)
- 🔧 Test complete workflow
- 🔧 Add error handling for invalid images
- 🔧 Implement retry logic for API failures
- 🔧 Add thumbnail generation for assets library

**Edge Functions:**
- `mesh-generator` - Creates job
- `job-worker` processMeshJob - ✅ Updated with TRELLIS

**Components:**
- `MeshGeneratorWorkspace.tsx` - ✅ Updated UI
- Three.js canvas for preview ✅

---

### 6️⃣ **AUTO-RIGGER**
**Status:** ❌ Stub Implementation Only
**Workflow:**
1. User uploads 3D model (.glb, .fbx, .obj)
2. Backend auto-generates rig for Maya/Blender/Unreal
3. Returns rigged model with bone structure
4. User downloads for their DCC tool

**Action Items:**
- 🔧 Research working Replicate model for auto-rigging
- 🔧 OR implement Mixamo API integration
- 🔧 Add skeleton preview UI
- 🔧 Support multiple output formats (Maya, Blender, Unreal)
- 🔧 Add rig customization options (biped, quadruped, custom)

**Edge Functions to Create/Update:**
- `auto-rigger` - Currently returns placeholder
- `vfx-auto-rigger` - Enhanced version

**Recommended Approach:**
- Use Mixamo API (free, reliable)
- OR find working Replicate model
- Add progress tracking (rigging takes 30-60 seconds)

---

### 7️⃣ **COLOR GRADING**
**Status:** ⚠️ Needs Real Processing
**Workflow:**
1. User uploads video/image
2. Adjust sliders: brightness, contrast, saturation, temperature
3. Backend applies LUT or AI-based color grading
4. Preview before/after
5. Download graded file

**Action Items:**
- 🔧 Implement real color grading with Replicate
- 🔧 Add preset LUTs (Cinematic, Vintage, Moody, etc.)
- 🔧 Create real-time preview with WebGL
- 🔧 Support both images and videos
- 🔧 Add undo/redo history

**Edge Functions:**
- `color-grade` - Main processor
- `vfx-color-grade-advanced` - With AI enhancement
- `simple-color-grade` - Basic adjustments

**UI Components:**
- `AdvancedColorGrading.tsx` - ✅ Exists
- `ColorGradeControls.tsx` - ✅ Exists

**Replicate Models to Research:**
- Image: Use Stability AI or similar
- Video: Find video LUT/grading model

---

### 8️⃣ **AUDIO CLEANUP**
**Status:** ⚠️ Placeholder Implementation
**Workflow:**
1. User uploads audio file
2. Select cleanup options (noise reduction, echo removal, etc.)
3. Backend processes with AI
4. Returns cleaned audio
5. Play preview and download

**Action Items:**
- 🔧 Integrate audio processing API (Replicate or Audio API)
- 🔧 Add waveform visualization
- 🔧 Implement noise profile sampling
- 🔧 Add batch processing for multiple files
- 🔧 Support multiple formats (mp3, wav, m4a)

**Edge Functions:**
- `audio-cleanup` - Main processor
- `simple-audio-clean` - Basic version

**Storage:**
- `audio-uploads` bucket ✅
- `user_audio` bucket ✅

---

### 9️⃣ **AI CHAT ASSISTANT**
**Status:** ⚠️ Needs Connection to AI
**Workflow:**
1. User asks questions about their project/script
2. Backend streams response from Lovable AI (Gemini)
3. Chat history persists in database
4. Context-aware responses based on project data

**Action Items:**
- 🔧 Connect to Lovable AI Gateway (Gemini 2.5 Flash)
- 🔧 Implement streaming responses
- 🔧 Add chat history persistence
- 🔧 Make it context-aware (know about user's projects/scripts)
- 🔧 Add suggested prompts
- 🔧 Implement RAG for project-specific knowledge

**Edge Functions:**
- `ai-assistant` - Main chat
- `ai-assistant-enhanced` - With project context
- `chat-send` - Message handler

**Database:**
- `chat_history` table ✅
- `chat_messages` table ✅

**Cost Control:**
- Use Gemini 2.5 Flash (FREE during promo)
- Track tokens in ai_usage_analytics

---

### 🔟 **JOB PROCESSING SYSTEM**
**Status:** ✅ Working with Issues
**Workflow:**
1. User initiates task → Creates job in DB
2. Cron triggers job-worker every minute
3. Worker processes pending jobs sequentially
4. Updates job status (pending → running → done/failed)
5. Frontend polls job status
6. Sends notification when complete

**Action Items:**
- ✅ Core system works
- 🔧 Add proper error recovery
- 🔧 Implement job priority queue
- 🔧 Add estimated time remaining
- 🔧 Better progress updates (%)
- 🔧 Implement job cancellation
- 🔧 Add retry logic for failed jobs (max 3 attempts)

**Edge Functions:**
- `job-worker` - Main processor ✅
- `enqueue-job` - Job creation
- `job-status` - Status checker

**Database:**
- `jobs` table with RLS ✅
- `dev_logs` for debugging ✅

---

### 1️⃣1️⃣ **STORAGE & ASSET MANAGEMENT**
**Status:** ⚠️ Needs Testing
**Workflow:**
1. User uploads files via FileUploadZone
2. Files stored in appropriate buckets
3. Assets displayed in AssetLibrary
4. User can download, delete, or share

**Action Items:**
- 🔧 Test all bucket permissions
- 🔧 Add file preview for all types
- 🔧 Implement bulk upload
- 🔧 Add search/filter in asset library
- 🔧 Generate thumbnails for videos
- 🔧 Add storage quota management

**Storage Buckets:**
- ✅ scripts
- ✅ vfx-assets
- ✅ audio-uploads
- ✅ video-uploads
- ✅ rigs
- ✅ outputs
- ✅ translations

**RLS Policies:**
- Ensure users only access their own files
- Add project-level sharing

---

### 1️⃣2️⃣ **CREDITS & BILLING SYSTEM**
**Status:** ⚠️ Basic Implementation
**Current:**
- Profiles table has credits_remaining, credits_used
- No recharge mechanism

**Action Items:**
- 🔧 Add Stripe integration for credit purchase
- 🔧 Create pricing tiers (Basic, Pro, Enterprise)
- 🔧 Track credit usage per operation:
  - Script Breakdown: 10 credits
  - Roto/Tracking: 25 credits per minute
  - Mesh Generation: 25 credits
  - Auto-Rigger: 30 credits
  - Color Grade: 15 credits
  - Audio Cleanup: 10 credits
  - AI Chat: 2 credits per message
- 🔧 Add credit history log
- 🔧 Send low credit warnings
- 🔧 Implement usage analytics dashboard

**Database:**
- Add `credit_transactions` table
- Add `subscription_plans` table
- Update `ai_usage_analytics` ✅

---

### 1️⃣3️⃣ **NOTIFICATIONS SYSTEM**
**Status:** ✅ Working
**Current:**
- NotificationCenter component
- Database table with RLS

**Action Items:**
- 🔧 Add real-time updates with Supabase Realtime
- 🔧 Implement push notifications
- 🔧 Add email notifications (job complete, low credits)
- 🔧 Add notification preferences
- 🔧 Group similar notifications

---

## 🔒 SECURITY CHECKLIST

### Authentication
- ✅ RLS enabled on all tables
- ✅ Auth middleware in edge functions
- 🔧 Add rate limiting
- 🔧 Implement CSRF protection
- 🔧 Add IP whitelisting for admin

### Input Validation
- 🔧 Validate all file uploads (size, type, content)
- 🔧 Sanitize text inputs (prevent XSS)
- 🔧 Validate UUIDs before DB queries
- 🔧 Check file content (not just extension)

### API Security
- ✅ API keys in Supabase secrets
- 🔧 Add request signing
- 🔧 Implement API rate limits
- 🔧 Log suspicious activity

### Data Privacy
- 🔧 Auto-delete old jobs after 30 days
- 🔧 Encrypt sensitive user data
- 🔧 Add GDPR compliance (data export/delete)
- 🔧 Audit log for admin actions

---

## 🚀 IMPLEMENTATION PHASES

### **Phase 1: Critical Fixes (Week 1)**
1. ✅ Fix Mesh Generator (TRELLIS model)
2. ✅ Fix Roto projectId validation
3. 🔧 Connect Script Breakdown to Lovable AI
4. 🔧 Test complete job processing workflow
5. 🔧 Fix any blocking edge function errors

### **Phase 2: Core Features (Week 2-3)**
1. 🔧 Implement real Color Grading
2. 🔧 Implement real Audio Cleanup
3. 🔧 Connect AI Chat Assistant
4. 🔧 Add progress tracking UI for all jobs
5. 🔧 Implement auto-rigger with Mixamo or Replicate

### **Phase 3: UX & Polish (Week 4)**
1. 🔧 Add before/after previews for all tools
2. 🔧 Implement real-time notifications
3. 🔧 Add usage analytics dashboard
4. 🔧 Create onboarding tutorial
5. 🔧 Add keyboard shortcuts

### **Phase 4: Credits & Monetization (Week 5)**
1. 🔧 Integrate Stripe
2. 🔧 Add subscription plans
3. 🔧 Implement credit purchase flow
4. 🔧 Add usage tracking
5. 🔧 Create admin dashboard

### **Phase 5: Testing & Launch (Week 6)**
1. 🔧 End-to-end testing all workflows
2. 🔧 Load testing (handle 100+ concurrent users)
3. 🔧 Security audit
4. 🔧 Performance optimization
5. 🔧 Deploy to production

---

## 📊 COST ESTIMATION PER OPERATION

| Operation | Provider | Model | Cost | Credits |
|-----------|----------|-------|------|---------|
| Script Breakdown | Lovable AI | Gemini 2.5 Flash | FREE | 10 |
| Roto/Tracking | Replicate | chenxwh/rvm | ~$0.05/min | 25/min |
| Mesh Generation | Replicate | firtoz/trellis | ~$0.042 | 25 |
| Auto-Rigger | Mixamo | API | FREE | 30 |
| Color Grade | Replicate | TBD | ~$0.03 | 15 |
| Audio Cleanup | Replicate | TBD | ~$0.02 | 10 |
| AI Chat | Lovable AI | Gemini 2.5 Flash | FREE | 2/msg |

**Note:** Lovable AI is FREE until Oct 13, 2025 for Gemini models.

---

## 🎯 SUCCESS METRICS

### Technical
- ✅ All edge functions return 2xx status for valid requests
- ✅ Average job processing time < 2 minutes
- ✅ Zero SQL injection vulnerabilities
- ✅ 99.9% uptime

### User Experience
- ✅ User can complete full workflow in < 5 minutes
- ✅ Clear error messages for all failures
- ✅ Progress indicators for all long operations
- ✅ Mobile-responsive UI

### Business
- Track user signups
- Monitor credit usage per user
- Track job completion rates
- Measure user retention (30-day)

---

## 🛠️ TESTING STRATEGY

### Unit Tests
- Edge function input validation
- Database RLS policies
- Credit deduction logic

### Integration Tests
- Complete workflow: Upload → Process → Download
- Job worker picks up and processes jobs
- Notifications sent correctly

### Load Tests
- 100 concurrent uploads
- Job queue doesn't overflow
- API rate limits work

### Security Tests
- SQL injection attempts
- XSS attempts
- Unauthorized access attempts
- API key exposure checks

---

## 📝 NEXT STEPS

Which phase should we start with?
1. **Phase 1 Critical Fixes** - Get everything working first
2. **Specific Feature** - Focus on one feature you want working perfectly
3. **Security Hardening** - Lock down the system
4. **Full System Test** - Test everything end-to-end

Let me know what you'd like to prioritize!
