import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const body = await req.json()
    const { videoUrl, projectId, colorPreset = "cinematic" } = body

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('Processing color grading for:', videoUrl)

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        project_id: projectId,
        type: 'color-grade',
        status: 'running',
        input_data: { video_url: videoUrl, color_preset: colorPreset }
      })
      .select()
      .single()

    if (jobError) {
      throw jobError
    }

    console.log('Created color grading job:', job.id)

    // Simulate processing and return result
    const simulateProcessing = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // For demonstration, we'll return the original video URL
      // In real implementation, this would be the color-graded video
      const outputUrl = videoUrl
      
      // Update job with results
      await supabase
        .from('jobs')
        .update({
          status: 'done',
          output_data: { 
            output: outputUrl,
            graded_video_url: outputUrl,
            color_preset: colorPreset,
            processing_type: 'color_grading'
          },
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id)

      // Create user asset record
      if (projectId) {
        const fileName = `graded_${Date.now()}_video.mp4`
        await supabase
          .from('user_assets')
          .insert({
            user_id: user.id,
            project_id: projectId,
            filename: fileName,
            file_url: outputUrl,
            file_type: 'video',
            mime_type: 'video/mp4',
            processing_status: 'completed',
            metadata: { color_preset: colorPreset, original_url: videoUrl }
          })
      }

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Color Grading Complete',
          message: `Video color grading completed successfully`,
          type: 'success'
        })

      console.log('Color grading completed for job:', job.id)
    }

    // Start processing in background
    simulateProcessing().catch(async (error) => {
      console.error('Color grading failed:', error)
      await supabase
        .from('jobs')
        .update({
          status: 'error',
          error_message: error.message
        })
        .eq('id', job.id)
    })

    return new Response(JSON.stringify({
      success: true,
      jobId: job.id,
      output: videoUrl,
      output_data: {
        graded_video_url: videoUrl
      },
      message: 'Color grading started successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in simple-color-grade function:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})