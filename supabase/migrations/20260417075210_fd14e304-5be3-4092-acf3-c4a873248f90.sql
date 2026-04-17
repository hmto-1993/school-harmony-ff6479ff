-- 1) Recovery mode flag
INSERT INTO public.site_settings (id, value)
VALUES ('recovery_mode', 'true')
ON CONFLICT (id) DO UPDATE SET value = 'true', updated_at = now();

-- 2) Helper: is recovery mode enabled?
CREATE OR REPLACE FUNCTION public.is_recovery_mode()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT value = 'true' FROM public.site_settings WHERE id = 'recovery_mode'), false);
$$;

-- 3) Helper: get current user's national_id from profiles
CREATE OR REPLACE FUNCTION public.get_user_national_id(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT national_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- 4) Recovery action log
CREATE TABLE IF NOT EXISTS public.recovery_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recovery_action_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/owners read recovery log" ON public.recovery_action_log;
CREATE POLICY "Admins/owners read recovery log"
ON public.recovery_action_log
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.user_has_org_role_in(auth.uid(), ARRAY['owner'::org_role,'admin'::org_role])
);

DROP POLICY IF EXISTS "Authenticated insert recovery log" ON public.recovery_action_log;
CREATE POLICY "Authenticated insert recovery log"
ON public.recovery_action_log
FOR INSERT TO authenticated
WITH CHECK (true);

-- 5) Relaxed SELECT policies (recovery-mode aware)
-- STUDENTS
DROP POLICY IF EXISTS "recovery_students_select" ON public.students;
CREATE POLICY "recovery_students_select"
ON public.students
FOR SELECT TO authenticated
USING (
  public.is_recovery_mode() AND (
    organization_id IS NULL
    OR organization_id = public.get_user_org(auth.uid())
    OR national_id = public.get_user_national_id(auth.uid())
  )
);

-- CLASSES
DROP POLICY IF EXISTS "recovery_classes_select" ON public.classes;
CREATE POLICY "recovery_classes_select"
ON public.classes
FOR SELECT TO authenticated
USING (
  public.is_recovery_mode() AND (
    organization_id IS NULL
    OR organization_id = public.get_user_org(auth.uid())
  )
);

-- GRADES (creator OR org OR student-of-creator)
DROP POLICY IF EXISTS "recovery_grades_select" ON public.grades;
CREATE POLICY "recovery_grades_select"
ON public.grades
FOR SELECT TO authenticated
USING (
  public.is_recovery_mode() AND (
    organization_id IS NULL
    OR organization_id = public.get_user_org(auth.uid())
    OR recorded_by = auth.uid()
  )
);

-- ATTENDANCE
DROP POLICY IF EXISTS "recovery_attendance_select" ON public.attendance_records;
CREATE POLICY "recovery_attendance_select"
ON public.attendance_records
FOR SELECT TO authenticated
USING (
  public.is_recovery_mode() AND (
    organization_id IS NULL
    OR organization_id = public.get_user_org(auth.uid())
    OR recorded_by = auth.uid()
  )
);

-- BEHAVIOR
DROP POLICY IF EXISTS "recovery_behavior_select" ON public.behavior_records;
CREATE POLICY "recovery_behavior_select"
ON public.behavior_records
FOR SELECT TO authenticated
USING (
  public.is_recovery_mode() AND (
    organization_id IS NULL
    OR organization_id = public.get_user_org(auth.uid())
    OR recorded_by = auth.uid()
  )
);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "recovery_notifications_select" ON public.notifications;
CREATE POLICY "recovery_notifications_select"
ON public.notifications
FOR SELECT TO authenticated
USING (
  public.is_recovery_mode() AND (
    organization_id IS NULL
    OR organization_id = public.get_user_org(auth.uid())
    OR created_by = auth.uid()
  )
);

-- 6) Re-run primary owner recovery to guarantee owner access
SELECT public.recover_primary_owner();

-- 7) Log activation
INSERT INTO public.recovery_action_log (actor_id, action, details)
VALUES (NULL, 'recovery_mode_enabled', jsonb_build_object('at', now()));