# VFX Studio Backend API Documentation

## Overview
This document describes the backend API endpoints, job processing system, and worker setup for the VFX Studio application.

## Core API Endpoints

### 1. Project Management

#### POST `/functions/v1/create-project`
Creates a new project for the authenticated user.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "My VFX Project",
  "description": "Project description (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "project": {
    "id": "uuid",
    "name": "My VFX Project", 
    "description": "Project description",
    "owner_id": "user_uuid",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 2. File Upload System

#### POST `/functions/v1/get-signed-upload`
Generates a signed URL for uploading files to storage.

**Body:**
```json
{
  "filename": "video.mp4",
  "content_type": "video/mp4",
  "bucket": "user_video",
  "project_id": "uuid",
  "file_size": 1024000
}
```

**Response (200):**
```json
{
  "success": true,
  "upload_url": "https://signed-upload-url...",
  "file_path": "user_id/project_id/timestamp_video.mp4",
  "file_record": { /* file record from database */ }
}
```

#### Upload Flow:
1. Call `get-signed-upload` to get upload URL
2. PUT file to the signed URL
3. Call `confirm-upload` to mark file as ready

#### POST `/functions/v1/confirm-upload`
Confirms a file upload and marks it as ready for processing.

**Body:**
```json
{
  "assetId": "uuid",
  "fileSize": 1024000
}
```

### 3. Job Processing System

#### POST `/functions/v1/enqueue-job`
Enqueues a background processing job.

**Body:**
```json
{
  "type": "roto|auto-rigger|color-grade|script-analysis|audio-cleanup",
  "project_id": "uuid",
  "payload": { /* job-specific parameters */ }
}
```

**Response (202):**
```json
{
  "success": true,
  "job": {
    "id": "job_uuid",
    "type": "roto",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### GET `/functions/v1/job-status/{job_id}`
Returns the current status and results of a job.

**Response (200):**
```json
{
  "success": true,
  "job": {
    "id": "job_uuid",
    "type": "roto",
    "status": "done|pending|running|error",
    "result": { /* job results */ },
    "error": "error message if status=error"
  }
}
```

### 4. File Download

#### GET `/functions/v1/get-signed-download?bucket=user_video&path=file_path`
Generates a signed URL for downloading files.

**Response (200):**
```json
{
  "downloadUrl": "https://signed-download-url...",
  "expiresAt": "2024-01-01T01:00:00Z"
}
```

## Plugin-Specific Endpoints

### ROTO/Tracking Plugin

#### POST `/functions/v1/vfx-roto`
Processes video for object tracking and mask generation.

**Payload Example:**
```json
{
  "project_id": "uuid",
  "video_file_path": "user_video/path/video.mp4",
  "frame_range": "0-100",
  "description": "Track the person walking",
  "preset": "Track Person",
  "tightness": 75,
  "smoothing": 60,
  "output_format": "video_alpha"
}
```

**UI Controls:**
- Video picker dropdown
- Frame range selector (start/end frames)
- Description text field
- Preset dropdown: [Track Person, Track Object, Track Face, Track Clothing]
- Tightness slider (0-100)
- Smoothing slider (0-100)
- Output format radio: [Video with Alpha, PNG Sequence]

### Auto-Rigger Plugin

#### POST `/functions/v1/vfx-auto-rigger`
Auto-rigs 3D character models for animation.

**Payload Example:**
```json
{
  "project_id": "uuid",
  "character_file_path": "vfx_assets/character.fbx",
  "rig_type": "Biped",
  "joint_size": 50,
  "ik_fk": 75
}
```

**UI Controls:**
- File upload (FBX/OBJ models)
- Rig type dropdown: [Biped, Quadruped, Humanoid, Custom]
- Joint size slider (0-100)
- IK/FK blend slider (0-100)

### Audio Cleanup Plugin

#### POST `/functions/v1/audio-cleanup`
Cleans and enhances audio using AI noise reduction.

**Payload Example:**
```json
{
  "audioUrl": "https://audio-file-url...",
  "project_id": "uuid",
  "preset": "Heavy Denoise",
  "aggression": 75
}
```

**UI Controls:**
- Audio file upload
- Preset selector: [Light Denoise, Heavy Denoise, Dialogue Enhance]
- Aggression slider (0-100)
- Before/after audio player

### Color Grade Plugin

#### POST `/functions/v1/vfx-color-grade`
Applies color grading to video files.

**Payload Example:**
```json
{
  "project_id": "uuid",
  "video_file_path": "user_video/input.mp4",
  "preset": "Filmic",
  "exposure": 0.5,
  "contrast": 20,
  "saturation": 110
}
```

**UI Controls:**
- Video file selector
- Preset gallery: [Filmic, Warm, Cool, Nollywood-Standard]
- Exposure slider (-3 to +3)
- Contrast slider (-100 to +100)
- Saturation slider (0-200)

## Database Schema

### Key Tables

**jobs** - Background processing jobs
```sql
{
  id: uuid,
  user_id: uuid,
  project_id: uuid,
  type: text,
  status: text, -- pending|running|done|error
  payload: jsonb, -- job input parameters
  result: jsonb, -- job output data
  error: text,
  created_at: timestamptz,
  updated_at: timestamptz,
  completed_at: timestamptz
}
```

**user_assets** - Generated/uploaded files
```sql
{
  id: uuid,
  user_id: uuid,
  project_id: uuid,
  filename: text,
  file_url: text,
  file_type: text,
  storage_path: text,
  metadata: jsonb,
  processing_status: text
}
```

## Worker Setup

### Local Development

1. **Install Dependencies:**
```bash
npm install @supabase/supabase-js replicate
```

2. **Set Environment Variables:**
```bash
export SUPABASE_URL="https://lmxspzfqhmdnqxtzusfy.supabase.co"
export SUPABASE_SERVICE_KEY="your_service_role_key"
export REPLICATE_API_KEY="your_replicate_api_key"
```

3. **Run Roto Worker:**
```bash
node workers/roto-worker.js
```

4. **Test Worker:**
```bash
node workers/roto-worker.js --test
```

### Production Deployment

Workers can be deployed as:
- Docker containers on cloud platforms
- Serverless functions with longer timeouts
- Background services on VPS/dedicated servers

### Example Worker Test

```bash
# Create a test job
curl -X POST https://lmxspzfqhmdnqxtzusfy.supabase.co/functions/v1/enqueue-job \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "roto",
    "project_id": "your-project-id",
    "payload": {
      "video_file_path": "user_video/test_video.mp4",
      "frame_range": "0-50",
      "description": "Track the person in the center",
      "preset": "Track Person",
      "tightness": 75,
      "smoothing": 60
    }
  }'

# Check job status
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://lmxspzfqhmdnqxtzusfy.supabase.co/functions/v1/job-status/JOB_ID
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": "Error description",
  "details": "Additional error details",
  "job_id": "uuid (if applicable)"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request (missing/invalid parameters)
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error
- 503: Service Unavailable (missing API keys)

## Model Integration

### Cost Estimation

Each plugin includes cost estimation based on:
- Model provider pricing (Replicate, OpenAI)
- Input size (file duration, resolution)
- Processing complexity

### Model Selection

UI includes model quality/speed tradeoffs:
- **Economical**: Fast processing, lower quality
- **Balanced**: Medium processing time and quality  
- **Premium**: Slow processing, highest quality

### Supported Models

- **Roto/Tracking**: Segment Anything 2 (SAM2)
- **Audio Cleanup**: Auffusion, Meta MusicGen
- **Auto-Rigger**: Mixamo API integration
- **Color Grade**: Custom LUT application
- **Script Analysis**: GPT-5 or Claude models

## Security

- All endpoints require JWT authentication
- File access is user-scoped (RLS policies)
- Signed URLs have time-based expiration
- API keys stored in Supabase secrets
- User data isolation in storage buckets

## Monitoring & Logging

- Job processing logs stored in `dev_logs` table
- Real-time job status updates via Supabase realtime
- User notifications for job completion/errors
- Performance metrics in `ai_usage_analytics` table