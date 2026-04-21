
-- =========================================================================
-- 1) STUDENTS: prevent teachers from modifying sensitive fields & class_id
-- =========================================================================
CREATE OR REPLACE FUNCTION public.protect_student_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean := public.has_role(v_caller, 'admin'::public.app_role);
  v_is_org_admin boolean := public.user_has_org_role_in(v_caller, ARRAY['owner'::public.org_role, 'admin'::public.org_role]);
BEGIN
  -- Admins / org owners can modify anything
  IF v_is_admin OR v_is_org_admin THEN
    RETURN NEW;
  END IF;

  -- Teachers: lock sensitive PII fields
  NEW.national_id   := OLD.national_id;
  NEW.parent_phone  := OLD.parent_phone;
  NEW.academic_number := OLD.academic_number;

  -- Teachers cannot move a student to a class they don't teach
  IF OLD.class_id IS DISTINCT FROM NEW.class_id THEN
    IF NEW.class_id IS NOT NULL AND NOT public.teacher_teaches_class(v_caller, NEW.class_id) THEN
      NEW.class_id := OLD.class_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_student_sensitive_fields ON public.students;
CREATE TRIGGER trg_protect_student_sensitive_fields
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.protect_student_sensitive_fields();

-- =========================================================================
-- 2) TEACHER_CLASSES: enforce same-organization assignment
-- =========================================================================
CREATE OR REPLACE FUNCTION public.enforce_teacher_class_same_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_teacher_org uuid;
  v_class_org uuid;
BEGIN
  SELECT organization_id INTO v_teacher_org FROM public.profiles WHERE user_id = NEW.teacher_id LIMIT 1;
  SELECT organization_id INTO v_class_org   FROM public.classes  WHERE id = NEW.class_id LIMIT 1;

  IF v_teacher_org IS NOT NULL AND v_class_org IS NOT NULL AND v_teacher_org <> v_class_org THEN
    RAISE EXCEPTION 'Cross-organization teacher-class assignment is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_teacher_class_same_org ON public.teacher_classes;
CREATE TRIGGER trg_enforce_teacher_class_same_org
  BEFORE INSERT OR UPDATE ON public.teacher_classes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_teacher_class_same_org();

-- Org owners/admins can read teacher assignments inside their org
DROP POLICY IF EXISTS "Org owners can view teacher assignments" ON public.teacher_classes;
CREATE POLICY "Org owners can view teacher assignments"
  ON public.teacher_classes
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role, 'admin'::public.org_role])
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = teacher_classes.teacher_id
          AND p.organization_id = public.get_user_org(auth.uid())
      )
    )
  );

-- =========================================================================
-- 3) PUSH_SUBSCRIPTIONS: explicit DENY UPDATE (restrictive)
-- =========================================================================
DROP POLICY IF EXISTS "deny_update_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "deny_update_push_subscriptions"
  ON public.push_subscriptions
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (false)
  WITH CHECK (false);

-- =========================================================================
-- 4) STORAGE: make sensitive buckets private + clean overlapping policies
-- =========================================================================
UPDATE storage.buckets SET public = false WHERE id IN ('letterheads', 'library', 'excuses', 'activities', 'reports');

-- Remove the broad teacher INSERT policy on excuses (keep the strict one)
DROP POLICY IF EXISTS "admins and class teachers can insert excuses" ON storage.objects;
