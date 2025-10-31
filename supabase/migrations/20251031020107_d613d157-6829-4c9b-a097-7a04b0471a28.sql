-- Drop existing breakdowns table if incompatible
DROP TABLE IF EXISTS public.breakdowns CASCADE;

-- Create breakdowns table for structured script analysis
CREATE TABLE public.breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  original_filename TEXT,
  raw_text TEXT,
  breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  type TEXT DEFAULT 'standard',
  content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on breakdowns
ALTER TABLE public.breakdowns ENABLE ROW LEVEL SECURITY;

-- RLS policy for breakdowns - users manage their own
CREATE POLICY "breakdown_user" ON public.breakdowns
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create translations table for multi-language support
CREATE TABLE IF NOT EXISTS public.translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breakdown_id UUID REFERENCES public.breakdowns(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on translations
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- RLS policy for translations - users access translations for their breakdowns
CREATE POLICY "translations_user" ON public.translations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.breakdowns b 
      WHERE b.id = translations.breakdown_id 
      AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.breakdowns b 
      WHERE b.id = translations.breakdown_id 
      AND b.user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at on breakdowns
CREATE TRIGGER update_breakdowns_updated_at
  BEFORE UPDATE ON public.breakdowns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster queries
CREATE INDEX idx_breakdowns_user ON public.breakdowns(user_id);
CREATE INDEX idx_breakdowns_project ON public.breakdowns(project_id);
CREATE INDEX idx_breakdowns_script ON public.breakdowns(script_id);
CREATE INDEX idx_translations_breakdown ON public.translations(breakdown_id);