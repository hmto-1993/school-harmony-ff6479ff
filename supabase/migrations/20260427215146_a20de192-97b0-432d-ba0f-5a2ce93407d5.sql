-- Tighten class visibility to prevent assistant teachers from seeing unassigned classes,
-- while keeping organization owners/admins able to manage their own workspace.

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
  )
)
WITH CHECK (organization_id = public.get_user_org(auth.uid()));