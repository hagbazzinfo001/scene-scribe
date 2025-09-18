# Meshify Integration Documentation

## Overview

The Meshify pipeline converts text prompts (and optional reference images) into downloadable 3D mesh files (GLB format). It consists of:

1. **Frontend API** - Enqueue jobs and retrieve results
2. **Edge Functions** - Handle authentication and job management  
3. **Worker Process** - Processes jobs using Replicate API
4. **Database** - Tracks jobs, assets, and user credits

## Architecture

```
Frontend → Edge Function → Database → Worker → Replicate API → Storage
```

## Required Secrets

Configure these secrets in your Supabase project:

- `REPLICATE_API_TOKEN` - Your Replicate API token
- `SUPABASE_URL` - Supabase project URL  
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

## Database Schema

### mesh_assets table
- `id` - UUID primary key
- `project_id` - Links to projects table
- `owner_id` - User who owns this asset
- `prompt` - Text description for mesh generation
- `input_image_path` - Optional reference image URL
- `output_path` - Storage path of generated GLB file
- `status` - pending | running | done | error
- `credits_cost` - Credits deducted for this generation
- `result_meta` - JSON metadata from Replicate

### jobs table (enhanced)
- `asset_id` - Links to mesh_assets table
- `type` - Set to 'meshify' for mesh generation jobs

## API Endpoints

### POST /functions/v1/meshify-enqueue

Enqueue a new mesh generation job.

**Request:**
```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "prompt": "A low-poly medieval castle with towers",
  "input_image_url": "https://example.com/reference.jpg" // optional
}
```

**Response (201):**
```json
{
  "asset_id": "550e8400-e29b-41d4-a716-446655440001", 
  "job_id": "550e8400-e29b-41d4-a716-446655440002",
  "status": "pending",
  "message": "Mesh generation job enqueued successfully"
}
```

**Error Responses:**
- `401` - Authentication required
- `400` - Missing required fields
- `402` - Insufficient credits (need 25 credits)

### GET /functions/v1/get-mesh-asset?asset_id={uuid}

Retrieve mesh asset with download URL (if complete).

**Response:**
```json
{
  "asset": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "status": "done",
    "prompt": "A low-poly medieval castle",
    "output_path": "user123/project456/mesh_asset123.glb",
    "size": 2048576,
    "created_at": "2024-01-01T12:00:00Z"
  },
  "signed_download": "https://storage.supabase.co/v1/object/sign/..."
}
```

## Worker Setup

### Prerequisites

1. Node.js installed
2. npm packages: `@supabase/supabase-js`, `node-fetch`

### Installation

```bash
cd workers
npm install @supabase/supabase-js node-fetch
```

### Environment Variables

Create `.env` file in workers directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REPLICATE_API_TOKEN=your-replicate-token
```

### Running the Worker

```bash
# Development
node meshify-worker.js

# Production (with PM2)
pm2 start meshify-worker.js --name="meshify-worker"
```

## Frontend Usage Example

```javascript
// Enqueue mesh generation
async function generateMesh(projectId, prompt, imageUrl = null) {
  const response = await fetch('/functions/v1/meshify-enqueue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      project_id: projectId,
      prompt: prompt,
      input_image_url: imageUrl
    })
  });
  
  const data = await response.json();
  return data.asset_id;
}

// Poll for completion
async function checkMeshStatus(assetId) {
  const response = await fetch(`/functions/v1/get-mesh-asset?asset_id=${assetId}`, {
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  });
  
  const data = await response.json();
  
  if (data.asset.status === 'done') {
    // Download is ready
    return data.signed_download;
  }
  
  return null; // Still processing
}
```

## Credits & Pricing

- **Cost per mesh**: 25 credits
- Credits are deducted when job is enqueued
- Failed jobs do not get automatically refunded (implement refund logic if needed)

## Production Considerations

### Performance
- Run multiple worker instances for scalability
- Use message queues (Redis/Bull) for high-volume processing
- Implement rate limiting on endpoints

### Security
- Validate file outputs (size limits, virus scanning)
- Implement job timeouts to prevent stuck jobs
- Log all operations for debugging

### Monitoring
- Track job success/failure rates
- Monitor storage usage
- Set up alerts for worker health

## Troubleshooting

### Common Issues

**"Insufficient credits" error:**
- Check user's `profiles.credits_remaining` 
- Verify credit deduction logic

**Worker not processing jobs:**
- Check environment variables are set
- Verify Supabase connection
- Check Replicate API token validity

**Upload failures:**
- Verify `user_assets` bucket exists and is private
- Check storage RLS policies
- Ensure worker has service role permissions

### Debugging

**View worker logs:**
```bash
# If using PM2
pm2 logs meshify-worker

# Direct execution logs
node meshify-worker.js
```

**Check job status in database:**
```sql
SELECT id, type, status, error, created_at 
FROM jobs 
WHERE type = 'meshify' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Monitor storage usage:**
```sql
SELECT owner_id, COUNT(*), SUM(size) as total_size
FROM mesh_assets 
WHERE status = 'done'
GROUP BY owner_id;
```

## Testing

### Manual Testing

1. **Create test user** with sufficient credits (>25)

2. **Test enqueue endpoint:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/meshify-enqueue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{"project_id":"test-project-id","prompt":"a simple red cube"}'
```

3. **Run worker locally:**
```bash
REPLICATE_API_TOKEN=your-token \
SUPABASE_URL=your-url \
SUPABASE_SERVICE_ROLE_KEY=your-key \
node workers/meshify-worker.js
```

4. **Check completion:**
```bash
curl "https://your-project.supabase.co/functions/v1/get-mesh-asset?asset_id=ASSET_ID" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

### Expected Results

- Enqueue returns 201 with asset_id and job_id
- Worker logs show prediction creation and polling
- Database shows job progressing: pending → running → done
- Asset status updates: pending → running → done
- Signed download URL is returned when complete
- GLB file downloads successfully

## File Structure

```
├── supabase/functions/
│   ├── meshify-enqueue/index.ts
│   └── get-mesh-asset/index.ts
├── workers/
│   ├── meshify-worker.js
│   └── package.json
└── docs/
    └── meshify-integration.md
```