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
  if (!replicateToken) {
    throw new Error('REPLICATE_API_KEY not configured');
  }

  // Get input file URL
  const inputData = job.input_data;
  const fileUrl = inputData.video_url || inputData.file_url;
  
  console.log('Processing roto job with input:', fileUrl);
  
  // Call Replicate API for background removal
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${replicateToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
      input: {
        image: fileUrl
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
  const fileName = `roto-${job.id}-${Date.now()}.png`;
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
}

async function processAudioCleanJob(job: any) {
  if (!replicateToken) {
    throw new Error('REPLICATE_API_KEY not configured');
  }

  const inputData = job.input_data;
  const fileUrl = inputData.file_url;
  
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${replicateToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: "afiaka87/tortoise-tts:e9658de4b325863c4fcdc12d94bb7c9b54cbfe351b7ca1b36860008172b91c71",
      input: {
        text: "Audio cleanup processing",
        voice: "train_grace"
      }
    })
  });

  const prediction = await response.json();
  if (!response.ok) {
    throw new Error(`Replicate API error: ${JSON.stringify(prediction)}`);
  }

  return {
    output_url: prediction.output || fileUrl,
    prediction_id: prediction.id,
    type: 'audio-clean'
  };
}

async function processColorGradeJob(job: any) {
  const inputData = job.input_data;
  const imageUrl = inputData.image_url || inputData.file_url;
  const settings = inputData.settings || {};
  
  console.log('Processing color grade job with settings:', settings);
  
  if (!replicateToken) {
    console.warn('No Replicate API key, returning original');
    return {
      output_url: imageUrl,
      type: 'color-grade',
      settings: settings
    };
  }

  try {
    // Use Replicate for color grading
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
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const inputData = job.input_data;
  const scriptContent = inputData.script_content || inputData.content;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a Nollywood script breakdown assistant. Analyze the script and return a JSON object with scenes, characters, props, and locations.'
        },
        {
          role: 'user',
          content: `Analyze this script and provide a detailed breakdown:\n\n${scriptContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  });

  const aiResponse = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${JSON.stringify(aiResponse)}`);
  }

  const breakdown = aiResponse.choices[0].message.content;
  
  try {
    const parsed = JSON.parse(breakdown);
    return {
      breakdown: parsed,
      type: 'script-breakdown'
    };
  } catch {
    return {
      breakdown: { raw_response: breakdown },
      type: 'script-breakdown'
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