
-- ============================================================
-- Auto-bootstrap teacher infrastructure for owners and teachers
-- ============================================================

-- 1) Auto-link class creator to teacher_classes so they can grade/attend
CREATE OR REPLACE FUNCTION public.auto_link_class_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role public.org_role;
BEGIN
  IF v_user IS NULL THEN RETURN NEW; END IF;
  v_role := public.get_user_org_role(v_user);
  -- Link any owner/admin/teacher who creates a class so they can manage it
  IF v_role IN ('owner','admin','teacher') THEN
    INSERT INTO public.teacher_classes (teacher_id, class_id)
    VALUES (v_user, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_link_class_owner ON public.classes;
CREATE TRIGGER trg_auto_link_class_owner
AFTER INSERT ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.auto_link_class_owner();

-- 2) Auto-create default teacher_permissions row when a profile is created
CREATE OR REPLACE FUNCTION public.bootstrap_teacher_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.teacher_permissions (
    user_id, can_print, can_export, can_send_notifications, can_delete_records,
    can_manage_grades, can_manage_attendance, can_view_reports, can_view_grades,
    can_view_attendance, can_view_activities, can_view_dashboard, can_view_students,
    read_only_mode
  ) VALUES (
    NEW.user_id, true, true, true, true, true, true, true, true, true, true, true, true, false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bootstrap_teacher_permissions ON public.profiles;
CREATE TRIGGER trg_bootstrap_teacher_permissions
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.bootstrap_teacher_permissions();

-- 3) Backfill: create teacher_permissions for existing profiles missing them
INSERT INTO public.teacher_permissions (
  user_id, can_print, can_export, can_send_notifications, can_delete_records,
  can_manage_grades, can_manage_attendance, can_view_reports, can_view_grades,
  can_view_attendance, can_view_activities, can_view_dashboard, can_view_students,
  read_only_mode
)
SELECT p.user_id, true, true, true, true, true, true, true, true, true, true, true, true, false
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.teacher_permissions tp WHERE tp.user_id = p.user_id);

-- 4) Backfill: link existing class creators (owners) to their classes
INSERT INTO public.teacher_classes (teacher_id, class_id)
SELECT o.owner_id, c.id
FROM public.classes c
JOIN public.organizations o ON o.id = c.organization_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.teacher_classes tc
  WHERE tc.class_id = c.id AND tc.teacher_id = o.owner_id
);

-- 5) Drop redundant duplicate triggers (keep one canonical set per table)
DROP TRIGGER IF EXISTS trg_set_org_students ON public.students;
DROP TRIGGER IF EXISTS trg_set_org_grades ON public.grades;
DROP TRIGGER IF EXISTS trg_set_org_attendance ON public.attendance_records;
DROP TRIGGER IF EXISTS trg_set_org_behavior ON public.behavior_records;
DROP TRIGGER IF EXISTS trg_set_org_classes ON public.classes;
DROP TRIGGER IF EXISTS trg_set_org_notifications ON public.notifications;
DROP TRIGGER IF EXISTS trg_enforce_org_students ON public.students;
DROP TRIGGER IF EXISTS trg_enforce_org_grades ON public.grades;
DROP TRIGGER IF EXISTS trg_enforce_org_attendance_records ON public.attendance_records;
DROP TRIGGER IF EXISTS trg_enforce_org_behavior_records ON public.behavior_records;
DROP TRIGGER IF EXISTS trg_enforce_org_classes ON public.classes;
DROP TRIGGER IF EXISTS trg_enforce_org_notifications ON public.notifications;
DROP TRIGGER IF EXISTS trg_lock_org_students ON public.students;
DROP TRIGGER IF EXISTS trg_lock_org_grades ON public.grades;
DROP TRIGGER IF EXISTS trg_lock_org_attendance ON public.attendance_records;
DROP TRIGGER IF EXISTS trg_lock_org_behavior ON public.behavior_records;
DROP TRIGGER IF EXISTS trg_lock_org_classes ON public.classes;
DROP TRIGGER IF EXISTS trg_lock_org_notifications ON public.notifications;
-- Keep trg_enforce_org_id (BEFORE INSERT) and trg_lock_org_id (BEFORE UPDATE) — these are the canonical pair
