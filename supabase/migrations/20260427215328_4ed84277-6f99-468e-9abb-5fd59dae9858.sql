-- Add creator ownership for class INSERT ... RETURNING without exposing all org classes to teachers.

ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_classes_created_by ON public.classes(created_by);

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
      NEW.created_by := COALESCE(NEW.created_by, v_caller);
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
    IF OLD.created_by IS DISTINCT FROM NEW.created_by THEN
      NEW.created_by := OLD.created_by;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS tenant_classes_select ON public.classes;
CREATE POLICY tenant_classes_select
ON public.classes
FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_org(auth.uid())
  AND (
    public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role, 'admin'::public.org_role])
    OR public.teacher_teaches_class(auth.uid(), id)
    OR created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS tenant_classes_update ON public.classes;
CREATE POLICY tenant_classes_update
ON public.classes
FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_org(auth.uid())
  AND (
    public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role, 'admin'::public.org_role])
    OR public.teacher_teaches_class(auth.uid(), id)
    OR created_by = auth.uid()
  )
)
WITH CHECK (organization_id = public.get_user_org(auth.uid()));

-- Backfill ownership for existing linked classes when possible.
UPDATE public.classes c
SET created_by = tc.teacher_id
FROM public.teacher_classes tc
WHERE c.id = tc.class_id
  AND c.created_by IS NULL;