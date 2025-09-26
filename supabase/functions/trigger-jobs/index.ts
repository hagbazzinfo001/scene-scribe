import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Triggering job processing...');

    // Process jobs manually since we don't have a background worker
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .limit(3);

    if (error) throw error;

    let processed = 0;
    
    for (const job of jobs || []) {
      try {
        console.log(`Processing job ${job.id} of type ${job.type}`);
        
        // Update to running
        await supabase
          .from('jobs')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', job.id);

        // Mock processing based on type
        let outputData = null;
        
        if (job.type === 'script-breakdown') {
          outputData = {
            scenes: [
              { id: 1, description: "Opening scene", location: "Lagos market", characters: ["Ada", "Kemi"] },
              { id: 2, description: "Confrontation", location: "Office building", characters: ["Ada", "Boss"] }
            ],
            characters: [
              { name: "Ada", role: "Lead", importance: "high" },
              { name: "Kemi", role: "Supporting", importance: "medium" }
            ],
            props: ["Market stall", "Office desk", "Mobile phone"],
            locations: ["Lagos market", "Office building"]
          };
        } else if (job.type === 'roto') {
          outputData = {
            output_url: job.input_data?.file_url || null,
            type: 'roto',
            status: 'completed'
          };
        } else {
          // For other types, just mark as completed
          outputData = {
            output_url: job.input_data?.file_url || null,
            type: job.type,
            status: 'completed'
          };
        }

        // Update as completed
        await supabase
          .from('jobs')
          .update({ 
            status: 'done',
            output_data: outputData,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        processed++;
        
      } catch (jobError) {
        console.error(`Failed to process job ${job.id}:`, jobError);
        
        await supabase
          .from('jobs')
          .update({ 
            status: 'failed',
            error_message: jobError instanceof Error ? jobError.message : String(jobError),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      processed,
      total: jobs?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Job trigger error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});