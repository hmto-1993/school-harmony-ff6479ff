-- =========================================================================
-- STRICT MULTI-TENANT ISOLATION
-- Hard-enforce organization_id scoping on all tenant tables.
-- Replaces mixed PERMISSIVE/RESTRICTIVE rules with clean strict policies.
-- =========================================================================

-- ---------- 1. Helper: stable, security-definer org getter (already exists as get_user_org) ----------
-- Reuse public.get_user_org(_user_id uuid) and public.user_has_org_role_in(...)

-- ---------- 2. Trigger: enforce + lock organization_id on every tenant row ----------
-- enforce_organization_id() already exists (BEFORE INSERT).
-- lock_organization_id() already exists (BEFORE UPDATE) — prevents tenancy migration via UPDATE.

-- Attach triggers idempotently to all tenant tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['classes','students','grades','attendance_records','behavior_records','notifications']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_org_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_enforce_org_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_id()', t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_lock_org_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_lock_org_id BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.lock_organization_id()', t);
  END LOOP;
END $$;

-- ---------- 3. Drop ALL existing data policies on tenant tables and rebuild as STRICT ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('classes','students','grades','attendance_records','behavior_records','notifications')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Make sure RLS is enabled & forced (so even table owners go through RLS)
ALTER TABLE public.classes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;

-- ===== CLASSES =====
CREATE POLICY tenant_classes_select ON public.classes FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY tenant_classes_insert ON public.classes FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid())
              AND public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY tenant_classes_update ON public.classes FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid())
         AND public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY tenant_classes_delete ON public.classes FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid())
         AND public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- ===== STUDENTS =====
CREATE POLICY tenant_students_select ON public.students FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY tenant_students_insert ON public.students FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid())
              AND (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
                   OR (public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
                       AND public.teacher_teaches_class(auth.uid(), class_id))));
CREATE POLICY tenant_students_update ON public.students FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid())
         AND (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
              OR (public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
                  AND public.teacher_teaches_class(auth.uid(), class_id))))
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY tenant_students_delete ON public.students FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid())
         AND public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- ===== GRADES =====
CREATE POLICY tenant_grades_select ON public.grades FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY tenant_grades_insert ON public.grades FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid())
              AND (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
                   OR (public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
                       AND public.teacher_teaches_student(auth.uid(), student_id))));
CREATE POLICY tenant_grades_update ON public.grades FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid())
         AND (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
              OR (public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
                  AND public.teacher_teaches_student(auth.uid(), student_id))))
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY tenant_grades_delete ON public.grades FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid())
         AND (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
              OR (public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
                  AND public.teacher_teaches_student(auth.uid(), student_id))));

-- ===== ATTENDANCE =====
CREATE POLICY tenant_attendance_select ON public.attendance_records FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY tenant_attendance_insert ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid())
              AND (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
                   OR (public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
                       AND public.teacher_teaches_class(auth.uid(), class_id))));
CREATE POLICY tenant_attendance_update ON public.attendance_records FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid())
         AND (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
              OR (public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
                  AND public.teacher_teaches_class(auth.uid(), class_id))))
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY tenant_attendance_delete ON public.attendance_records FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid())
         AND (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
              OR (public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
                  AND public.teacher_teaches_class(auth.uid(), class_id))));

-- ===== BEHAVIOR =====
CREATE POLICY tenant_behavior_select ON public.behavior_records FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY tenant_behavior_insert ON public.behavior_records FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid())
              AND (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
                   OR (public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
                       AND public.teacher_teaches_class(auth.uid(), class_id))));
CREATE POLICY tenant_behavior_update ON public.behavior_records FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid())
         AND (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
              OR (public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
                  AND public.teacher_teaches_class(auth.uid(), class_id))))
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY tenant_behavior_delete ON public.behavior_records FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid())
         AND (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
              OR (public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
                  AND public.teacher_teaches_class(auth.uid(), class_id))));

-- ===== NOTIFICATIONS =====
CREATE POLICY tenant_notifications_select ON public.notifications FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY tenant_notifications_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid())
              AND (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
                   OR (public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
                       AND public.teacher_teaches_student(auth.uid(), student_id))));
CREATE POLICY tenant_notifications_update ON public.notifications FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY tenant_notifications_delete ON public.notifications FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid())
         AND public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- ---------- 4. Verification helper for admins ----------
CREATE OR REPLACE FUNCTION public.verify_tenant_isolation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result jsonb := '{}'::jsonb; v int;
BEGIN
  IF NOT public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins/owners may verify isolation';
  END IF;

  SELECT count(*) INTO v FROM public.profiles WHERE organization_id IS NULL;
  result := result || jsonb_build_object('profiles_without_org', v);
  SELECT count(*) INTO v FROM public.classes WHERE organization_id IS NULL;
  result := result || jsonb_build_object('classes_without_org', v);
  SELECT count(*) INTO v FROM public.students WHERE organization_id IS NULL;
  result := result || jsonb_build_object('students_without_org', v);
  SELECT count(*) INTO v FROM public.grades WHERE organization_id IS NULL;
  result := result || jsonb_build_object('grades_without_org', v);
  SELECT count(*) INTO v FROM public.attendance_records WHERE organization_id IS NULL;
  result := result || jsonb_build_object('attendance_without_org', v);
  SELECT count(*) INTO v FROM public.behavior_records WHERE organization_id IS NULL;
  result := result || jsonb_build_object('behavior_without_org', v);
  SELECT count(*) INTO v FROM public.notifications WHERE organization_id IS NULL;
  result := result || jsonb_build_object('notifications_without_org', v);
  RETURN result;
END $$;
