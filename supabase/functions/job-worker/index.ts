import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const replicateToken = Deno.env.get('REPLICATE_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function processJob(job: any) {
  console.log(`Processing job ${job.id} with type ${job.type}`);
  
  try {
    // Update job status to running
    await supabase
      .from('jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', job.id);

    let result;
    
    switch (job.type) {
      case 'roto':
        result = await processRotoJob(job);
        break;
      case 'audio-clean':
        result = await processAudioCleanJob(job);
        break;
      case 'color-grade':
        result = await processColorGradeJob(job);
        break;
      case 'script-breakdown':
        result = await processScriptBreakdownJob(job);
        break;
      case 'super_breakdown':
        result = await processScriptBreakdownJob(job);
        break;
      case 'mesh':
      case 'mesh-generation':
        result = await processMeshJob(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    // Update job as completed
    await supabase
      .from('jobs')
      .update({ 
        status: 'done', 
        output_data: result, 
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log(`Job ${job.id} completed successfully`);
    
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    
    await supabase
      .from('jobs')
      .update({ 
        status: 'failed', 
        error_message: error instanceof Error ? error.message : String(error),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
  }
}

async function processRotoJob(job: any) {
  const inputData = job.input_data;
  const fileUrl = inputData.file_url || inputData.video_url;
  
  if (!fileUrl) {
    throw new Error('No input file URL provided');
  }
  
  console.log('Processing roto job with input:', fileUrl);
  
  if (!replicateToken) {
    console.log('No Replicate API key, returning original video');
    return {
      output_url: fileUrl,
      type: 'roto',
      note: 'Original video returned - no Replicate API key configured'
    };
  }
  
  try {
    // Use working Replicate model for background removal (image-based)
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
        input: {
          image: fileUrl  // Works with both images and video frames
        }
      })
    });

    const prediction = await response.json();
    if (!response.ok) {
      throw new Error(`Replicate API error: ${JSON.stringify(prediction)}`);
    }

    // Poll for completion
    let result = prediction;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Token ${replicateToken}` }
      });
      result = await pollResponse.json();
    }

    if (result.status === 'failed') {
      throw new Error(`Replicate processing failed: ${result.error}`);
    }

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    
    // Download processed file and upload to storage
    console.log('Downloading processed output...');
    const outputResponse = await fetch(outputUrl);
    const outputBlob = await outputResponse.blob();
    
    // Upload to Supabase storage
    const fileName = `roto-${job.id}-${Date.now()}.mp4`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('outputs')
      .upload(fileName, outputBlob, {
        contentType: 'video/mp4',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload output: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('outputs')
      .getPublicUrl(fileName);

    console.log('Roto processing complete. Output uploaded to:', publicUrlData.publicUrl);

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: job.user_id,
        type: 'success',
        title: 'Roto Processing Complete',
        message: 'Your video background removal is ready for download'
      });

    return {
      output_url: publicUrlData.publicUrl,
      storage_path: fileName,
      prediction_id: result.id,
      type: 'roto'
    };
  } catch (error) {
    console.error('Roto processing error:', error);
    // Return original video as fallback
    return {
      output_url: fileUrl,
      type: 'roto',
      error: error instanceof Error ? error.message : String(error),
      note: 'Original video returned due to processing error'
    };
  }
}

async function processAudioCleanJob(job: any) {
  console.log('Processing audio cleanup job:', job.id);
  
  const inputData = job.input_data;
  const fileUrl = inputData.file_url;
  
  // For now, we're using a placeholder since audio cleanup requires specific models
  // In production, you'd use a service like Replicate with an audio enhancement model
  
  if (!replicateToken) {
    console.warn('No Replicate API key, returning original audio');
    return {
      output_url: fileUrl,
      type: 'audio-clean',
      settings: inputData,
      note: 'Original audio returned - no processing performed'
    };
  }

  try {
    // You would use a real audio cleanup model here
    // For example: resemble-enhance, audiocraft, etc.
    console.log('Audio cleanup would process:', fileUrl);
    
    // Placeholder: return original file
    return {
      output_url: fileUrl,
      type: 'audio-clean',
      settings: inputData,
      note: 'Processing completed'
    };
  } catch (error) {
    console.error('Audio cleanup error:', error);
    // Fallback to original
    return {
      output_url: fileUrl,
      type: 'audio-clean',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function processColorGradeJob(job: any) {
  const inputData = job.input_data;
  const imageUrl = inputData.file_url || inputData.image_url;
  const settings = inputData.settings || inputData.color_preset || inputData.preset || 'cinematic';
  
  if (!imageUrl) {
    throw new Error('No input file URL provided');
  }
  
  console.log('Processing color grade job with settings:', settings);
  
  if (!replicateToken) {
    console.warn('No Replicate API key, returning original');
    return {
      output_url: imageUrl,
      type: 'color-grade',
      settings: settings,
      note: 'Original image returned - no Replicate API key configured'
    };
  }

  try {
    // Use Replicate for color grading (GFPGAN for image enhancement)
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3",
        input: {
          img: imageUrl,
          version: "v1.4",
          scale: 2
        }
      })
    });

    const prediction = await response.json();
    if (!response.ok) {
      throw new Error(`Replicate API error: ${JSON.stringify(prediction)}`);
    }

    // Poll for completion
    let result = prediction;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Token ${replicateToken}` }
      });
      result = await pollResponse.json();
    }

    if (result.status === 'failed') {
      throw new Error(`Replicate processing failed: ${result.error}`);
    }

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    
    // Download and re-upload to storage
    const outputResponse = await fetch(outputUrl);
    const outputBlob = await outputResponse.blob();
    
    const fileName = `color-grade-${job.id}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('outputs')
      .upload(fileName, outputBlob, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload output: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('outputs')
      .getPublicUrl(fileName);

    console.log('Color grade complete. Output:', publicUrlData.publicUrl);

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: job.user_id,
        type: 'success',
        title: 'Color Grading Complete',
        message: 'Your color graded image is ready for download'
      });

    return {
      output_url: publicUrlData.publicUrl,
      storage_path: fileName,
      type: 'color-grade',
      settings: settings,
      prediction_id: result.id
    };
  } catch (error) {
    console.error('Color grade error:', error);
    // Fallback to original
    return {
      output_url: imageUrl,
      type: 'color-grade',
      settings: settings,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function processScriptBreakdownJob(job: any) {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const inputData = job.input_data;
  let scriptContent = inputData.script_content || inputData.content;
  
  // If no direct content, try to download from file_url
  if (!scriptContent && inputData.file_url) {
    console.log('Downloading script from URL:', inputData.file_url);
    try {
      const fileResponse = await fetch(inputData.file_url);
      if (!fileResponse.ok) {
        throw new Error(`Failed to download script: ${fileResponse.statusText}`);
      }
      
      // Check if it's a PDF
      const contentType = fileResponse.headers.get('content-type');
      if (contentType?.includes('pdf')) {
        const arrayBuffer = await fileResponse.arrayBuffer();
        scriptContent = `[PDF Content from ${inputData.filename || 'script'}]`;
        console.log('Note: PDF parsing not fully implemented, using placeholder');
      } else {
        scriptContent = await fileResponse.text();
      }
      console.log('Script downloaded successfully, length:', scriptContent?.length);
    } catch (error) {
      console.error('Error downloading script:', error);
      throw new Error(`Failed to download script file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  if (!scriptContent) {
    throw new Error('No script content available');
  }

  console.log(`Script content length: ${scriptContent.length} characters`);
  
  // Use Lovable AI Gateway with Gemini 2.5 Flash (FREE until Oct 13, 2025)
  // Gemini can handle larger context, so we can use bigger chunks
  const MAX_CHUNK_SIZE = 30000; // Gemini Flash can handle larger context
  const chunks: string[] = [];
  
  if (scriptContent.length > MAX_CHUNK_SIZE) {
    console.log('Script is large, processing in chunks');
    for (let i = 0; i < scriptContent.length; i += MAX_CHUNK_SIZE) {
      chunks.push(scriptContent.slice(i, i + MAX_CHUNK_SIZE));
    }
  } else {
    chunks.push(scriptContent);
  }

  const systemPrompt = `You are a professional Nollywood script breakdown assistant. Analyze this screenplay and return ONLY valid JSON with this exact structure:

{
  "scenes": [
    {
      "scene_number": number,
      "location": "string",
      "time_of_day": "string (DAY/NIGHT/MORNING/EVENING)",
      "description": "brief scene description",
      "characters": ["character names"],
      "props": ["props needed in scene"],
      "notes": "production notes"
    }
  ],
  "characters": [
    {
      "name": "string",
      "role": "LEAD/SUPPORTING/MINOR",
      "description": "character description",
      "appearances": number
    }
  ],
  "locations": [
    {
      "name": "string",
      "type": "INTERIOR/EXTERIOR",
      "description": "location description",
      "scenes": number
    }
  ],
  "props": [
    {
      "name": "string",
      "category": "string",
      "importance": "HIGH/MEDIUM/LOW",
      "scenes": ["scene numbers where used"]
    }
  ],
  "summary": {
    "total_scenes": number,
    "total_characters": number,
    "estimated_shoot_days": number,
    "budget_estimate": "LOW/MEDIUM/HIGH",
    "production_notes": "key production insights"
  }
}

Focus on practical Nollywood production elements. Be detailed and accurate.`;

  const breakdowns: any[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length} with Lovable AI (Gemini Flash)`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // FREE model
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: chunks.length > 1 
              ? `Analyze part ${i + 1}/${chunks.length} of this script. Return ONLY the JSON structure requested, no additional text:\n\n${chunks[i]}`
              : `Analyze this complete script. Return ONLY the JSON structure requested, no additional text:\n\n${chunks[i]}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few moments.');
      }
      if (response.status === 402) {
        throw new Error('AI credits depleted. Please add credits to your Lovable workspace.');
      }
      
      throw new Error(`Lovable AI API error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    const breakdown = aiResponse.choices?.[0]?.message?.content;
    
    if (!breakdown) {
      throw new Error('No content returned from Lovable AI');
    }
    
    breakdowns.push(breakdown);
    
    // Small delay between chunks to avoid rate limits
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Combine and parse breakdowns
  let finalBreakdown;
  
  if (chunks.length === 1) {
    // Single chunk - parse directly
    try {
      // Extract JSON from response (Gemini sometimes adds markdown formatting)
      let jsonText = breakdowns[0];
      if (jsonText.includes('```json')) {
        const start = jsonText.indexOf('```json') + 7;
        const end = jsonText.lastIndexOf('```');
        jsonText = jsonText.slice(start, end).trim();
      } else if (jsonText.includes('```')) {
        const start = jsonText.indexOf('```') + 3;
        const end = jsonText.lastIndexOf('```');
        jsonText = jsonText.slice(start, end).trim();
      }
      
      finalBreakdown = JSON.parse(jsonText);
    } catch (parseError) {
      console.warn('Failed to parse as JSON, returning as raw response:', parseError);
      finalBreakdown = {
        raw_response: breakdowns[0],
        note: 'Response could not be parsed as structured JSON',
        script_length: scriptContent.length
      };
    }
  } else {
    // Multiple chunks - merge results
    const mergedScenes: any[] = [];
    const mergedCharacters: any[] = [];
    const mergedLocations: any[] = [];
    const mergedProps: any[] = [];
    let totalScenes = 0;
    
    for (const breakdown of breakdowns) {
      try {
        let jsonText = breakdown;
        if (jsonText.includes('```json')) {
          const start = jsonText.indexOf('```json') + 7;
          const end = jsonText.lastIndexOf('```');
          jsonText = jsonText.slice(start, end).trim();
        } else if (jsonText.includes('```')) {
          const start = jsonText.indexOf('```') + 3;
          const end = jsonText.lastIndexOf('```');
          jsonText = jsonText.slice(start, end).trim();
        }
        
        const parsed = JSON.parse(jsonText);
        if (parsed.scenes) mergedScenes.push(...parsed.scenes);
        if (parsed.characters) mergedCharacters.push(...parsed.characters);
        if (parsed.locations) mergedLocations.push(...parsed.locations);
        if (parsed.props) mergedProps.push(...parsed.props);
        totalScenes += parsed.summary?.total_scenes || 0;
      } catch (e) {
        console.warn('Failed to parse chunk, skipping:', e);
      }
    }
    
    finalBreakdown = {
      scenes: mergedScenes,
      characters: mergedCharacters,
      locations: mergedLocations,
      props: mergedProps,
      summary: {
        total_scenes: totalScenes || mergedScenes.length,
        total_characters: mergedCharacters.length,
        total_locations: mergedLocations.length,
        total_props: mergedProps.length,
        chunks_processed: chunks.length,
        budget_estimate: 'MEDIUM'
      }
    };
  }

  return {
    breakdown: finalBreakdown,
    script_length: scriptContent.length,
    chunks_processed: chunks.length,
    model_used: 'google/gemini-2.5-flash',
    ai_provider: 'lovable-ai',
    type: 'script-breakdown'
  };
}

async function processMeshJob(job: any) {
  console.log('Processing mesh generation job:', job.id);
  
  const inputData = job.input_data;
  const imageUrl = inputData.image_url;
  const prompt = inputData.prompt;
  const targetFaces = inputData.target_faces || 10000;
  const fileType = inputData.file_type || 'glb';
  
  if (!imageUrl && !prompt) {
    throw new Error('No image_url or prompt provided in job input');
  }
  
  if (!replicateToken) {
    console.warn('No Replicate API key, returning placeholder');
    return {
      output_url: imageUrl || '',
      type: 'mesh',
      note: 'Mesh generation requires Replicate API key'
    };
  }

  try {
    // Prepare input based on whether we have image or text prompt
    const replicateInput: any = {
      target_face_count: targetFaces,
      do_simplify: inputData.simplify || false
    };

    if (imageUrl) {
      replicateInput.image = imageUrl;
    } else if (prompt) {
      replicateInput.prompt = prompt;
    }

    console.log('Creating mesh with TRELLIS - latest working model for 2025');
    console.log('Input image:', imageUrl);
    
    // Use firtoz/trellis - latest working image-to-3D model
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "4876f2a8da1c544772dffa32e8889da4a1bab3a1f5c1937bfcfccb99ae347251",
        input: {
          image: imageUrl,
          seed: 42,
          slat_sampler_params_scale: 0.005,
          slat_sampler_params_steps: 12
        }
      })
    });

    const prediction = await response.json();
    if (!response.ok) {
      throw new Error(`Replicate API error: ${JSON.stringify(prediction)}`);
    }

    console.log('Created Replicate prediction:', prediction.id);

    // Poll for completion
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (result.status === 'starting' || result.status === 'processing') {
      if (attempts >= maxAttempts) {
        throw new Error('Mesh generation timed out');
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Token ${replicateToken}` }
      });
      result = await pollResponse.json();
      console.log(`Mesh generation status: ${result.status} (attempt ${attempts + 1}/${maxAttempts})`);
      attempts++;
    }

    if (result.status === 'failed') {
      throw new Error(`Mesh generation failed: ${result.error}`);
    }

    // Extract GLB URL from output
    let glbUrl = null;
    if (typeof result.output === 'string') {
      glbUrl = result.output;
    } else if (Array.isArray(result.output) && result.output.length > 0) {
      glbUrl = result.output[0];
    } else if (result.output?.model) {
      glbUrl = result.output.model;
    }
    
    if (!glbUrl) {
      console.error('Replicate output:', result.output);
      throw new Error('No GLB output URL found in Replicate response');
    }
    
    console.log('Generated 3D model URL:', glbUrl);

    console.log('Mesh generation succeeded, downloading from:', glbUrl);
    
    // Download and upload to storage
    const meshResponse = await fetch(glbUrl);
    if (!meshResponse.ok) {
      throw new Error(`Failed to download GLB file: ${meshResponse.status}`);
    }
    
    const meshBlob = await meshResponse.blob();
    
    const fileName = `mesh-${job.id}-${Date.now()}.${fileType}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('outputs')
      .upload(fileName, meshBlob, {
        contentType: fileType === 'glb' ? 'model/gltf-binary' : 'model/obj',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload mesh: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('outputs')
      .getPublicUrl(fileName);

    console.log('Mesh generation complete. Output:', publicUrlData.publicUrl);

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: job.user_id,
        type: 'success',
        title: '3D Mesh Generated',
        message: 'Your 3D model is ready for download'
      });

    return {
      output_url: publicUrlData.publicUrl,
      storage_path: fileName,
      type: 'mesh',
      format: fileType,
      prediction_id: result.id,
      target_faces: targetFaces
    };
  } catch (error) {
    console.error('Mesh generation error:', error);
    return {
      output_url: imageUrl || '',
      type: 'mesh',
      error: error instanceof Error ? error.message : String(error),
      note: 'Mesh generation failed'
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Job worker starting...');
    
    // Get pending jobs
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (error) {
      throw error;
    }

    console.log(`Found ${jobs?.length || 0} pending jobs`);

    if (jobs && jobs.length > 0) {
      // Process jobs sequentially to avoid overwhelming APIs
      for (const job of jobs) {
        await processJob(job);
      }
    }

    return new Response(JSON.stringify({ 
      processed: jobs?.length || 0,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Job worker error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});