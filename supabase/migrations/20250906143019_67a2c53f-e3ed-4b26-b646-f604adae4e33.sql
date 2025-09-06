-- Add triggers for projects table to set owner and maintain updated_at
DROP TRIGGER IF EXISTS trg_set_projects_owner ON public.projects;
CREATE TRIGGER trg_set_projects_owner
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_projects_owner_on_insert();

DROP TRIGGER IF EXISTS trg_projects_update_updated_at ON public.projects;
CREATE TRIGGER trg_projects_update_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();