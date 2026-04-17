-- 1) Recovery log table
CREATE TABLE IF NOT EXISTS public.data_recovery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  ran_by uuid,
  ran_at timestamptz NOT NULL DEFAULT now(),
  source_table text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb
);

ALTER TABLE public.data_recovery_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/owners view recovery log" ON public.data_recovery_log;
CREATE POLICY "Admins/owners view recovery log"
ON public.data_recovery_log FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role, 'admin'::public.org_role])
);

-- 2) Comprehensive recovery function
CREATE OR REPLACE FUNCTION public.recover_all_user_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_org uuid;
  run_id uuid := gen_random_uuid();
  v_count int;
  result jsonb := '{}'::jsonb;
  before_scan jsonb := '{}'::jsonb;
  after_scan jsonb := '{}'::jsonb;
  fixed jsonb := '{}'::jsonb;
BEGIN
  -- AUTHORIZATION
  IF NOT public.has_role(caller, 'admin'::public.app_role)
     AND NOT public.user_has_org_role_in(caller, ARRAY['owner'::public.org_role, 'admin'::public.org_role]) THEN
    RAISE EXCEPTION 'Only admins or organization owners can run data recovery';
  END IF;

  caller_org := public.get_user_org(caller);
  IF caller_org IS NULL THEN
    caller_org := public.resolve_default_org();
  END IF;
  IF caller_org IS NULL THEN
    RAISE EXCEPTION 'No organization available for recovery';
  END IF;

  -- BEFORE scan
  SELECT count(*) INTO v_count FROM public.students WHERE organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = students.organization_id);
  before_scan := before_scan || jsonb_build_object('students_orphan', v_count);
  SELECT count(*) INTO v_count FROM public.attendance_records WHERE organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = attendance_records.organization_id);
  before_scan := before_scan || jsonb_build_object('attendance_orphan', v_count);
  SELECT count(*) INTO v_count FROM public.grades WHERE organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = grades.organization_id);
  before_scan := before_scan || jsonb_build_object('grades_orphan', v_count);
  SELECT count(*) INTO v_count FROM public.behavior_records WHERE organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = behavior_records.organization_id);
  before_scan := before_scan || jsonb_build_object('behavior_orphan', v_count);
  SELECT count(*) INTO v_count FROM public.notifications WHERE organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = notifications.organization_id);
  before_scan := before_scan || jsonb_build_object('notifications_orphan', v_count);
  SELECT count(*) INTO v_count FROM public.classes WHERE organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = classes.organization_id);
  before_scan := before_scan || jsonb_build_object('classes_orphan', v_count);

  -- 1) CLASSES: assign orphaned classes to caller's org
  WITH upd AS (
    UPDATE public.classes c
       SET organization_id = caller_org
     WHERE c.organization_id IS NULL
        OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = c.organization_id)
     RETURNING c.id, c.organization_id
  ), log_ins AS (
    INSERT INTO public.data_recovery_log (run_id, ran_by, source_table, record_id, action, new_value)
    SELECT run_id, caller, 'classes', upd.id, 'reassign_org', jsonb_build_object('organization_id', caller_org) FROM upd
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;
  fixed := fixed || jsonb_build_object('classes', v_count);

  -- 2) STUDENTS: inherit from class first, then caller's org
  WITH upd AS (
    UPDATE public.students s
       SET organization_id = COALESCE(c.organization_id, caller_org)
       FROM public.classes c
     WHERE s.class_id = c.id
       AND (s.organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = s.organization_id))
     RETURNING s.id, s.organization_id
  ), log_ins AS (
    INSERT INTO public.data_recovery_log (run_id, ran_by, source_table, record_id, action, new_value)
    SELECT run_id, caller, 'students', upd.id, 'reassign_org_from_class', jsonb_build_object('organization_id', upd.organization_id) FROM upd
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;
  fixed := fixed || jsonb_build_object('students_from_class', v_count);

  WITH upd AS (
    UPDATE public.students
       SET organization_id = caller_org
     WHERE organization_id IS NULL
        OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = students.organization_id)
     RETURNING id
  ), log_ins AS (
    INSERT INTO public.data_recovery_log (run_id, ran_by, source_table, record_id, action, new_value)
    SELECT run_id, caller, 'students', upd.id, 'reassign_org_default', jsonb_build_object('organization_id', caller_org) FROM upd
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;
  fixed := fixed || jsonb_build_object('students_default', v_count);

  -- 3) GRADES: inherit from student
  WITH upd AS (
    UPDATE public.grades g
       SET organization_id = COALESCE(s.organization_id, caller_org)
       FROM public.students s
     WHERE g.student_id = s.id
       AND (g.organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = g.organization_id))
     RETURNING g.id, g.organization_id
  ), log_ins AS (
    INSERT INTO public.data_recovery_log (run_id, ran_by, source_table, record_id, action, new_value)
    SELECT run_id, caller, 'grades', upd.id, 'reassign_org_from_student', jsonb_build_object('organization_id', upd.organization_id) FROM upd
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;
  fixed := fixed || jsonb_build_object('grades', v_count);

  -- 4) ATTENDANCE: inherit from student/class
  WITH upd AS (
    UPDATE public.attendance_records a
       SET organization_id = COALESCE(s.organization_id, c.organization_id, caller_org)
       FROM public.students s, public.classes c
     WHERE a.student_id = s.id
       AND a.class_id = c.id
       AND (a.organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = a.organization_id))
     RETURNING a.id, a.organization_id
  ), log_ins AS (
    INSERT INTO public.data_recovery_log (run_id, ran_by, source_table, record_id, action, new_value)
    SELECT run_id, caller, 'attendance_records', upd.id, 'reassign_org_from_student', jsonb_build_object('organization_id', upd.organization_id) FROM upd
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;
  fixed := fixed || jsonb_build_object('attendance', v_count);

  -- 5) BEHAVIOR: inherit from student
  WITH upd AS (
    UPDATE public.behavior_records b
       SET organization_id = COALESCE(s.organization_id, caller_org)
       FROM public.students s
     WHERE b.student_id = s.id
       AND (b.organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = b.organization_id))
     RETURNING b.id, b.organization_id
  ), log_ins AS (
    INSERT INTO public.data_recovery_log (run_id, ran_by, source_table, record_id, action, new_value)
    SELECT run_id, caller, 'behavior_records', upd.id, 'reassign_org_from_student', jsonb_build_object('organization_id', upd.organization_id) FROM upd
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;
  fixed := fixed || jsonb_build_object('behavior', v_count);

  -- 6) NOTIFICATIONS: inherit from student
  WITH upd AS (
    UPDATE public.notifications n
       SET organization_id = COALESCE(s.organization_id, caller_org)
       FROM public.students s
     WHERE n.student_id = s.id
       AND (n.organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = n.organization_id))
     RETURNING n.id, n.organization_id
  ), log_ins AS (
    INSERT INTO public.data_recovery_log (run_id, ran_by, source_table, record_id, action, new_value)
    SELECT run_id, caller, 'notifications', upd.id, 'reassign_org_from_student', jsonb_build_object('organization_id', upd.organization_id) FROM upd
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;
  fixed := fixed || jsonb_build_object('notifications', v_count);

  -- AFTER scan
  SELECT count(*) INTO v_count FROM public.students WHERE organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = students.organization_id);
  after_scan := after_scan || jsonb_build_object('students_orphan', v_count);
  SELECT count(*) INTO v_count FROM public.attendance_records WHERE organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = attendance_records.organization_id);
  after_scan := after_scan || jsonb_build_object('attendance_orphan', v_count);
  SELECT count(*) INTO v_count FROM public.grades WHERE organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = grades.organization_id);
  after_scan := after_scan || jsonb_build_object('grades_orphan', v_count);
  SELECT count(*) INTO v_count FROM public.behavior_records WHERE organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = behavior_records.organization_id);
  after_scan := after_scan || jsonb_build_object('behavior_orphan', v_count);
  SELECT count(*) INTO v_count FROM public.notifications WHERE organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = notifications.organization_id);
  after_scan := after_scan || jsonb_build_object('notifications_orphan', v_count);
  SELECT count(*) INTO v_count FROM public.classes WHERE organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = classes.organization_id);
  after_scan := after_scan || jsonb_build_object('classes_orphan', v_count);

  -- Totals in caller's org now
  SELECT count(*) INTO v_count FROM public.students WHERE organization_id = caller_org;
  result := result || jsonb_build_object('students_in_org', v_count);
  SELECT count(*) INTO v_count FROM public.classes WHERE organization_id = caller_org;
  result := result || jsonb_build_object('classes_in_org', v_count);

  RETURN jsonb_build_object(
    'run_id', run_id,
    'organization_id', caller_org,
    'before', before_scan,
    'after', after_scan,
    'fixed', fixed,
    'totals', result,
    'ran_at', now()
  );
END $$;

REVOKE ALL ON FUNCTION public.recover_all_user_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recover_all_user_data() TO authenticated;