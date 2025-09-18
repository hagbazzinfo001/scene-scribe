-- Create mesh_assets table for 3D mesh generation
CREATE TABLE IF NOT EXISTS public.mesh_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id),
  owner_id uuid NOT NULL,
  prompt text,
  input_image_path text,
  output_path text,
  mime text DEFAULT 'model/gltf-binary',
  size integer,
  status text DEFAULT 'pending', -- pending,running,done,error
  credits_cost numeric DEFAULT 0,
  result_meta jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mesh_assets ENABLE ROW LEVEL SECURITY;

-- RLS policy for mesh_assets - users can only access their own assets
CREATE POLICY "Users can manage their own mesh assets" 
ON public.mesh_assets 
FOR ALL 
USING (auth.uid() = owner_id) 
WITH CHECK (auth.uid() = owner_id);

-- Update jobs table to ensure it has all needed columns
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS asset_id uuid;

-- Create index for efficient job polling
CREATE INDEX IF NOT EXISTS idx_jobs_status_type ON public.jobs(status, job_type);
CREATE INDEX IF NOT EXISTS idx_mesh_assets_owner ON public.mesh_assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_mesh_assets_status ON public.mesh_assets(status);

-- Add trigger for updated_at on mesh_assets
CREATE TRIGGER update_mesh_assets_updated_at
BEFORE UPDATE ON public.mesh_assets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();