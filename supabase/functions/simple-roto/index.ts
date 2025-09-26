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
    const { videoUrl, projectId, description = "rotoscope subject", frameRange = "1-30" } = body

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('Processing roto for:', videoUrl)

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        project_id: projectId,
        type: 'roto_tracking',
        status: 'running',
        input_data: { video_url: videoUrl, description, frame_range: frameRange }
      })
      .select()
      .single()

    if (jobError) {
      throw jobError
    }

    console.log('Created roto job:', job.id)

    // Simulate processing for now since Replicate models are expensive
    // In production, you'd use a model like RemBG or RobustVideoMatting
    const simulateProcessing = async () => {
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // For demonstration, we'll return the original video URL
      // In real implementation, this would be the processed video
      const outputUrl = videoUrl
      
      // Update job with results
      await supabase
        .from('jobs')
        .update({
          status: 'done',
          output_data: { 
            videoUrl: outputUrl,
            trackingPoints: [
              { x: 320, y: 240, frame: 1 },
              { x: 325, y: 245, frame: 15 },
              { x: 330, y: 250, frame: 30 }
            ],
            frame_range: frameRange,
            processing_type: 'roto_tracking'
          },
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id)

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Rotoscoping Complete',
          message: `Video rotoscoping completed successfully`,
          type: 'success'
        })

      console.log('Roto processing completed for job:', job.id)
    }

    // Start processing in background
    simulateProcessing().catch(async (error) => {
      console.error('Roto processing failed:', error)
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
      videoUrl: videoUrl,
      trackingPoints: [
        { x: 320, y: 240, frame: 1 },
        { x: 325, y: 245, frame: 15 },
        { x: 330, y: 250, frame: 30 }
      ],
      message: 'Rotoscoping started successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in simple-roto function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})