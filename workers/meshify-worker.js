/**
 * Meshify Worker - Processes 3D mesh generation jobs
 * 
 * Run with: node meshify-worker.js
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REPLICATE_API_TOKEN
 * 
 * This worker polls the jobs table for pending 'meshify' jobs,
 * calls Replicate API to generate 3D meshes, and uploads results to Supabase Storage.
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Environment validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

if (!SUPABASE_URL || !SUPABASE_KEY || !REPLICATE_TOKEN) {
  console.error('Missing required environment variables:');
  console.error('- SUPABASE_URL:', !!SUPABASE_URL);
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_KEY);
  console.error('- REPLICATE_API_TOKEN:', !!REPLICATE_TOKEN);
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { 
  auth: { persistSession: false },
  global: { fetch }
});

/**
 * Downloads file from URL to local path
 */
async function downloadFile(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  
  const buffer = await response.buffer();
  fs.writeFileSync(filePath, buffer);
  return buffer.length;
}

/**
 * Calls Replicate API to generate 3D mesh from prompt
 */
async function generateMeshWithReplicate(prompt, inputImageUrl = null) {
  console.log('Calling Replicate API for mesh generation...');
  
  // Using a stable text-to-3D model (you can change this to other mesh generation models)
  const modelVersion = "lucataco/realitycapture:55bb49a9e9d67b8f055e8e3eae6b65d65eb1bb6a9acaef49651e7ae97c4bb36d";
  
  const input = {
    prompt: prompt,
    steps: 20,
    guidance_scale: 7.5
  };
  
  // Add image input if provided
  if (inputImageUrl) {
    input.image = inputImageUrl;
  }

  // Create prediction
  const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${REPLICATE_TOKEN}`
    },
    body: JSON.stringify({
      version: modelVersion,
      input: input
    })
  });

  if (!predictionResponse.ok) {
    const errorText = await predictionResponse.text();
    throw new Error(`Replicate API error: ${predictionResponse.status} - ${errorText}`);
  }

  const prediction = await predictionResponse.json();
  const predictionId = prediction.id;
  console.log('Created Replicate prediction:', predictionId);

  // Poll for completion
  let status = prediction.status;
  let predictionData = prediction;
  const maxPolls = 60; // Max 5 minutes of polling
  let pollCount = 0;

  while ((status === 'processing' || status === 'starting') && pollCount < maxPolls) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    const checkResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Token ${REPLICATE_TOKEN}` }
    });
    
    if (!checkResponse.ok) {
      throw new Error(`Failed to check prediction status: ${checkResponse.statusText}`);
    }
    
    predictionData = await checkResponse.json();
    status = predictionData.status;
    pollCount++;
    
    console.log(`Prediction status: ${status} (poll ${pollCount}/${maxPolls})`);
  }

  if (status !== 'succeeded') {
    throw new Error(`Prediction failed with status: ${status}. Error: ${JSON.stringify(predictionData.error)}`);
  }

  return predictionData;
}

/**
 * Processes a single meshify job
 */
async function processJob(job) {
  console.log(`Processing job ${job.id} for asset ${job.asset_id}`);
  
  // Update job status to running
  await supabase
    .from('jobs')
    .update({ 
      status: 'running', 
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id);

  // Update mesh asset status to running
  await supabase
    .from('mesh_assets')
    .update({ 
      status: 'running', 
      updated_at: new Date().toISOString()
    })
    .eq('id', job.asset_id);

  try {
    const inputData = job.input_data || {};
    const prompt = inputData.prompt;
    const inputImageUrl = inputData.input_image_url || null;

    if (!prompt) {
      throw new Error('No prompt provided in job input data');
    }

    console.log(`Generating mesh for prompt: "${prompt}"`);

    // Call Replicate API
    const predictionData = await generateMeshWithReplicate(prompt, inputImageUrl);
    
    // Find GLB/GLTF file in output
    const outputUrls = Array.isArray(predictionData.output) ? predictionData.output : [predictionData.output];
    const meshUrl = outputUrls.find(url => 
      url && (url.includes('.glb') || url.includes('.gltf') || url.includes('model'))
    );
    
    if (!meshUrl) {
      throw new Error(`No mesh file found in Replicate output: ${JSON.stringify(outputUrls)}`);
    }

    console.log('Downloading generated mesh from:', meshUrl);

    // Download mesh file to temp location
    const tempDir = '/tmp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `mesh_${job.asset_id}.glb`);
    const fileSize = await downloadFile(meshUrl, tempFilePath);
    
    console.log(`Downloaded mesh file (${fileSize} bytes) to ${tempFilePath}`);

    // Upload to Supabase Storage
    const storagePath = `${job.user_id}/${job.project_id}/mesh_${job.asset_id}.glb`;
    
    const fileBuffer = fs.readFileSync(tempFilePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user_assets')
      .upload(storagePath, fileBuffer, {
        contentType: 'model/gltf-binary',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${JSON.stringify(uploadError)}`);
    }

    console.log('Uploaded mesh to storage path:', storagePath);

    // Update mesh_assets with completion data
    await supabase
      .from('mesh_assets')
      .update({
        status: 'done',
        output_path: storagePath,
        size: fileSize,
        result_meta: {
          replicate_prediction_id: predictionData.id,
          model_version: predictionData.version,
          processing_time: predictionData.metrics?.predict_time,
          output_urls: outputUrls
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', job.asset_id);

    // Update job with success
    await supabase
      .from('jobs')
      .update({
        status: 'done',
        output_data: { 
          storage_path: storagePath,
          file_size: fileSize,
          mesh_url: meshUrl
        },
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    // Create success notification
    await supabase
      .from('notifications')
      .insert([{
        user_id: job.user_id,
        type: 'success',
        title: 'Mesh Generation Complete',
        message: `Your 3D mesh "${prompt}" has been generated successfully and is ready for download.`
      }]);

    console.log(`Job ${job.id} completed successfully`);

    // Cleanup temp file
    fs.unlinkSync(tempFilePath);

  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);

    // Update job with error
    await supabase
      .from('jobs')
      .update({
        status: 'error',
        error: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    // Update mesh asset with error
    await supabase
      .from('mesh_assets')
      .update({
        status: 'error',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.asset_id);

    // Create error notification
    await supabase
      .from('notifications')
      .insert([{
        user_id: job.user_id,
        type: 'error',
        title: 'Mesh Generation Failed',
        message: `Failed to generate 3D mesh: ${error.message}`
      }]);
  }
}

/**
 * Main polling loop
 */
async function pollAndProcess() {
  try {
    // Fetch pending meshify jobs
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('type', 'meshify')
      .limit(1);

    if (error) {
      console.error('Error fetching jobs:', error);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.log('No pending meshify jobs found');
      return;
    }

    const job = jobs[0];
    await processJob(job);

  } catch (error) {
    console.error('Error in polling loop:', error);
  }
}

/**
 * Worker main loop
 */
async function startWorker() {
  console.log('Meshify Worker starting...');
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Replicate Token present:', !!REPLICATE_TOKEN);
  
  // Test connection
  try {
    const { data, error } = await supabase.from('jobs').select('count').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
      process.exit(1);
    }
    console.log('Supabase connection successful');
  } catch (err) {
    console.error('Failed to connect to Supabase:', err);
    process.exit(1);
  }

  // Main worker loop
  while (true) {
    try {
      await pollAndProcess();
    } catch (error) {
      console.error('Worker loop error:', error);
    }
    
    // Wait 10 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

// Start the worker
startWorker().catch(error => {
  console.error('Fatal worker error:', error);
  process.exit(1);
});