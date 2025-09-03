-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project collaborators table
CREATE TABLE public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Create scripts table for uploaded scripts
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_type TEXT,
  parsed_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create breakdowns table for AI-generated breakdowns
CREATE TABLE public.breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('scenes', 'characters', 'props', 'locations', 'schedule')),
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat messages table for AI assistant
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_ai_response BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view and update their own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- RLS policies for projects
CREATE POLICY "Users can view projects they own or collaborate on" ON public.projects
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.project_collaborators 
      WHERE project_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own projects" ON public.projects
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update projects they own" ON public.projects
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete projects they own" ON public.projects
  FOR DELETE USING (owner_id = auth.uid());

-- RLS policies for project collaborators
CREATE POLICY "Users can view collaborators for projects they have access to" ON public.project_collaborators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_id AND (
        owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.project_collaborators pc 
          WHERE pc.project_id = project_id AND pc.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Project owners can manage collaborators" ON public.project_collaborators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- RLS policies for scripts
CREATE POLICY "Users can view scripts for projects they have access to" ON public.scripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.project_collaborators pc 
          WHERE pc.project_id = p.id AND pc.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create scripts for projects they have access to" ON public.scripts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.project_collaborators pc 
          WHERE pc.project_id = p.id AND pc.user_id = auth.uid() AND pc.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can update scripts for projects they have access to" ON public.scripts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.project_collaborators pc 
          WHERE pc.project_id = p.id AND pc.user_id = auth.uid() AND pc.role IN ('owner', 'editor')
        )
      )
    )
  );

-- RLS policies for breakdowns
CREATE POLICY "Users can view breakdowns for projects they have access to" ON public.breakdowns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scripts s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = script_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.project_collaborators pc 
          WHERE pc.project_id = p.id AND pc.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create breakdowns for projects they have access to" ON public.breakdowns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scripts s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = script_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.project_collaborators pc 
          WHERE pc.project_id = p.id AND pc.user_id = auth.uid() AND pc.role IN ('owner', 'editor')
        )
      )
    )
  );

-- RLS policies for chat messages
CREATE POLICY "Users can view chat messages for projects they have access to" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.project_collaborators pc 
          WHERE pc.project_id = p.id AND pc.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create chat messages for projects they have access to" ON public.chat_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.project_collaborators pc 
          WHERE pc.project_id = p.id AND pc.user_id = auth.uid()
        )
      )
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_breakdowns_updated_at BEFORE UPDATE ON public.breakdowns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();