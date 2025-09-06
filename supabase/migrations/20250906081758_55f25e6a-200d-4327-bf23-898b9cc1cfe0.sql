-- Fix circular reference in projects RLS policy
DROP POLICY IF EXISTS "Users can view projects they own or collaborate on" ON public.projects;

CREATE POLICY "Users can view projects they own or collaborate on" ON public.projects
FOR SELECT USING (
  owner_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM project_collaborators pc 
    WHERE pc.project_id = projects.id AND pc.user_id = auth.uid()
  )
);

-- Create jobs table for tracking AI operations
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('script_analysis', 'vfx_analysis', 'roto_tracker', 'auto_rigger', 'color_grade', 'voice_clean')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  input_data JSONB NOT NULL,
  output_data JSONB,
  error_message TEXT,
  ai_provider TEXT NOT NULL DEFAULT 'openai',
  ai_model TEXT NOT NULL DEFAULT 'gpt-5-2025-08-07',
  tokens_used INTEGER,
  cost_estimate DECIMAL(10,6),
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  user_id UUID NOT NULL DEFAULT auth.uid()
);

-- Enable RLS on jobs table
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for jobs
CREATE POLICY "Users can view jobs for projects they have access to" ON public.jobs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = jobs.project_id AND (
      p.owner_id = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM project_collaborators pc 
        WHERE pc.project_id = p.id AND pc.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create jobs for projects they have access to" ON public.jobs
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = jobs.project_id AND (
      p.owner_id = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM project_collaborators pc 
        WHERE pc.project_id = p.id AND pc.user_id = auth.uid() AND pc.role IN ('owner', 'editor')
      )
    )
  )
);

-- Create ai_usage_analytics table for migration planning
CREATE TABLE public.ai_usage_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_estimate DECIMAL(10,6) NOT NULL DEFAULT 0,
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on analytics table
ALTER TABLE public.ai_usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for analytics
CREATE POLICY "Users can view their own analytics" ON public.ai_usage_analytics
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own analytics" ON public.ai_usage_analytics
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_ai_usage_analytics_user_created ON public.ai_usage_analytics(user_id, created_at DESC);
CREATE INDEX idx_jobs_project_created ON public.jobs(project_id, created_at DESC);