-- Ensure triggers exist for projects table to satisfy RLS and timestamps

-- Trigger: set owner_id on insert using existing function
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_projects_set_owner_on_insert'
  ) THEN
    CREATE TRIGGER trg_projects_set_owner_on_insert
    BEFORE INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.set_projects_owner_on_insert();
  END IF;
END $$;

-- Trigger: auto-update updated_at column on updates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_projects_updated_at'
  ) THEN
    CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
