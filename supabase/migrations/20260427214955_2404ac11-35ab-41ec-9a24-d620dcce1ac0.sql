-- Fix class creation for independent subscribers and assistant teachers
-- The existing default organization_id could point to the first organization,
-- so class inserts from non-primary users failed RLS WITH CHECK.

CREATE OR REPLACE FUNCTION public.enforce_class_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_org uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF v_caller IS NOT NULL THEN
      v_org := public.get_user_org(v_caller);
      IF v_org IS NOT NULL THEN
        NEW.organization_id := v_org;
      END IF;
    END IF;

    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := public.resolve_default_org();
    END IF;

    IF NEW.organization_id IS NULL THEN
      RAISE EXCEPTION 'organization_id is required';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
      NEW.organization_id := OLD.organization_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_class_organization_id ON public.classes;
CREATE TRIGGER trg_enforce_class_organization_id
BEFORE INSERT OR UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_class_organization_id();

DROP TRIGGER IF EXISTS trg_auto_link_class_owner ON public.classes;
CREATE TRIGGER trg_auto_link_class_owner
AFTER INSERT ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_class_owner();

DROP POLICY IF EXISTS tenant_classes_insert ON public.classes;
CREATE POLICY tenant_classes_insert
ON public.classes
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_org(auth.uid())
  AND public.user_has_org_role_in(
    auth.uid(),
    ARRAY['owner'::public.org_role, 'admin'::public.org_role, 'teacher'::public.org_role]
  )
);

DROP POLICY IF EXISTS tenant_classes_update ON public.classes;
CREATE POLICY tenant_classes_update
ON public.classes
FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_org(auth.uid())
  AND public.user_has_org_role_in(
    auth.uid(),
    ARRAY['owner'::public.org_role, 'admin'::public.org_role, 'teacher'::public.org_role]
  )
)
WITH CHECK (organization_id = public.get_user_org(auth.uid()));