
-- ============================================================
-- 1) فصل المالك الرئيسي عن المطور (Super Owner)
-- ============================================================
-- المالك الرئيسي = أقدم مستخدم لديه دور admin، وليس super owner
CREATE OR REPLACE FUNCTION public.is_primary_owner(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
    AND _user_id = (
      SELECT ur.user_id
      FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.role = 'admin'::public.app_role
        AND COALESCE(p.is_super_owner_flag, false) = false
      ORDER BY p.created_at ASC NULLS LAST
      LIMIT 1
    );
$function$;

-- ============================================================
-- 2) حماية بيانات الطلاب: المعلم يرى فقط طلاب فصوله
-- ============================================================
DROP POLICY IF EXISTS tenant_students_select ON public.students;

CREATE POLICY tenant_students_select ON public.students
FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_org(auth.uid())
  AND (
    -- مالكو المنظمة والمسؤولون يرون كل الطلاب
    public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role, 'admin'::public.org_role])
    -- المعلمون يرون فقط طلاب فصولهم
    OR (
      public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
      AND class_id IS NOT NULL
      AND public.teacher_teaches_class(auth.uid(), class_id)
    )
    -- الأدمن العالمي يرى كل شيء (للدعم)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- ============================================================
-- 3) تقييد activity_class_targets
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view targets" ON public.activity_class_targets;

CREATE POLICY "Org members view activity targets" ON public.activity_class_targets
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.same_org_as_class(class_id)
);

-- ============================================================
-- 4) منع تعديل push_subscriptions صراحة
-- ============================================================
DROP POLICY IF EXISTS deny_push_subscriptions_update ON public.push_subscriptions;

CREATE POLICY deny_push_subscriptions_update ON public.push_subscriptions
AS RESTRICTIVE
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);
