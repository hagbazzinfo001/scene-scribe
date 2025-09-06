-- Set owner_id automatically to the current auth.uid() on insert to prevent RLS violations
CREATE OR REPLACE FUNCTION public.set_projects_owner_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If owner_id is not provided, set it to the current authenticated user
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to apply the owner setter before insert
DROP TRIGGER IF EXISTS trg_set_projects_owner ON public.projects;
CREATE TRIGGER trg_set_projects_owner
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_projects_owner_on_insert();

-- Ensure updated_at is maintained automatically on updates
DROP TRIGGER IF EXISTS trg_projects_update_updated_at ON public.projects;
CREATE TRIGGER trg_projects_update_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();