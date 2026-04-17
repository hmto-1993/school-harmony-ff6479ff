-- 1) Backup tables for students and shared_views (acting as "reports")
CREATE TABLE IF NOT EXISTS public.students_backup (LIKE public.students INCLUDING DEFAULTS);
CREATE TABLE IF NOT EXISTS public.reports_backup (LIKE public.shared_views INCLUDING DEFAULTS);

ALTER TABLE public.students_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports_backup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_read_students_backup ON public.students_backup;
CREATE POLICY admin_read_students_backup ON public.students_backup
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS admin_read_reports_backup ON public.reports_backup;
CREATE POLICY admin_read_reports_backup ON public.reports_backup
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Invalid records quarantine
CREATE TABLE IF NOT EXISTS public.invalid_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_id uuid,
  reason text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  detected_by uuid
);
ALTER TABLE public.invalid_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_manage_invalid_records ON public.invalid_records;
CREATE POLICY admin_manage_invalid_records ON public.invalid_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) Ensure enforce_organization_id triggers exist on all core tables
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['students','classes','grades','attendance_records','behavior_records','notifications']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_org_%I ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_enforce_org_%I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_id();', t, t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_lock_org_%I ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_lock_org_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.lock_organization_id();', t, t);
  END LOOP;
END $$;

-- 4) Enhanced repair function: backup + scan + repair + quarantine, returns rich summary
CREATE OR REPLACE FUNCTION public.run_full_system_audit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_org uuid;
  fixed jsonb := '{}'::jsonb;
  invalid jsonb := '{}'::jsonb;
  before_scan jsonb := '{}'::jsonb;
  after_scan jsonb := '{}'::jsonb;
  v int;
  run_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND NOT public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role,'admin'::public.org_role]) THEN
    RAISE EXCEPTION 'Only admins can run system audit';
  END IF;

  default_org := public.resolve_default_org();
  IF default_org IS NULL THEN RAISE EXCEPTION 'No organization exists'; END IF;

  -- BEFORE scan
  SELECT count(*) INTO v FROM public.students WHERE organization_id IS NULL;
  before_scan := before_scan || jsonb_build_object('students_null_org', v);
  SELECT count(*) INTO v FROM public.classes WHERE organization_id IS NULL;
  before_scan := before_scan || jsonb_build_object('classes_null_org', v);
  SELECT count(*) INTO v FROM public.grades WHERE organization_id IS NULL;
  before_scan := before_scan || jsonb_build_object('grades_null_org', v);
  SELECT count(*) INTO v FROM public.attendance_records WHERE organization_id IS NULL;
  before_scan := before_scan || jsonb_build_object('attendance_null_org', v);
  SELECT count(*) INTO v FROM public.behavior_records WHERE organization_id IS NULL;
  before_scan := before_scan || jsonb_build_object('behavior_null_org', v);
  SELECT count(*) INTO v FROM public.notifications WHERE organization_id IS NULL;
  before_scan := before_scan || jsonb_build_object('notifications_null_org', v);

  -- 1) BACKUP (truncate + copy)
  TRUNCATE public.students_backup;
  INSERT INTO public.students_backup SELECT * FROM public.students;
  TRUNCATE public.classes_backup;
  INSERT INTO public.classes_backup SELECT * FROM public.classes;
  TRUNCATE public.grades_backup;
  INSERT INTO public.grades_backup SELECT * FROM public.grades;
  TRUNCATE public.attendance_backup;
  INSERT INTO public.attendance_backup SELECT * FROM public.attendance_records;
  TRUNCATE public.behavior_backup;
  INSERT INTO public.behavior_backup SELECT * FROM public.behavior_records;
  TRUNCATE public.notifications_backup;
  INSERT INTO public.notifications_backup SELECT * FROM public.notifications;
  TRUNCATE public.reports_backup;
  INSERT INTO public.reports_backup SELECT * FROM public.shared_views;

  -- 2) REPAIR: classes
  WITH upd AS (UPDATE public.classes SET organization_id=default_org WHERE organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v FROM upd; fixed := fixed || jsonb_build_object('classes', v);

  -- 3) REPAIR: students inherit from class, then default
  WITH upd AS (UPDATE public.students s SET organization_id=COALESCE(c.organization_id,default_org)
               FROM public.classes c WHERE s.class_id=c.id AND s.organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v FROM upd; fixed := fixed || jsonb_build_object('students_from_class', v);
  WITH upd AS (UPDATE public.students SET organization_id=default_org WHERE organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v FROM upd; fixed := fixed || jsonb_build_object('students_default', v);

  -- 4) REPAIR: grades inherit from student
  WITH upd AS (UPDATE public.grades g SET organization_id=COALESCE(s.organization_id,default_org)
               FROM public.students s WHERE g.student_id=s.id AND g.organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v FROM upd; fixed := fixed || jsonb_build_object('grades', v);

  -- 5) REPAIR: attendance inherit from student/class
  WITH upd AS (UPDATE public.attendance_records a SET organization_id=COALESCE(s.organization_id,c.organization_id,default_org)
               FROM public.students s, public.classes c WHERE a.student_id=s.id AND a.class_id=c.id AND a.organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v FROM upd; fixed := fixed || jsonb_build_object('attendance', v);

  -- 6) REPAIR: behavior inherit from student
  WITH upd AS (UPDATE public.behavior_records b SET organization_id=COALESCE(s.organization_id,default_org)
               FROM public.students s WHERE b.student_id=s.id AND b.organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v FROM upd; fixed := fixed || jsonb_build_object('behavior', v);

  -- 7) REPAIR: notifications inherit from student
  WITH upd AS (UPDATE public.notifications n SET organization_id=COALESCE(s.organization_id,default_org)
               FROM public.students s WHERE n.student_id=s.id AND n.organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v FROM upd; fixed := fixed || jsonb_build_object('notifications', v);

  -- 8) QUARANTINE orphans (don't delete; just flag if not already flagged)
  -- grades with non-existent student
  INSERT INTO public.invalid_records (source_table, source_id, reason, payload, detected_by)
  SELECT 'grades', g.id, 'orphan_student', to_jsonb(g), auth.uid()
  FROM public.grades g
  WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id=g.student_id)
    AND NOT EXISTS (SELECT 1 FROM public.invalid_records ir WHERE ir.source_table='grades' AND ir.source_id=g.id);
  GET DIAGNOSTICS v = ROW_COUNT; invalid := invalid || jsonb_build_object('grades_orphan', v);

  INSERT INTO public.invalid_records (source_table, source_id, reason, payload, detected_by)
  SELECT 'attendance_records', a.id, 'orphan_student_or_class', to_jsonb(a), auth.uid()
  FROM public.attendance_records a
  WHERE (NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id=a.student_id)
         OR NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.id=a.class_id))
    AND NOT EXISTS (SELECT 1 FROM public.invalid_records ir WHERE ir.source_table='attendance_records' AND ir.source_id=a.id);
  GET DIAGNOSTICS v = ROW_COUNT; invalid := invalid || jsonb_build_object('attendance_orphan', v);

  INSERT INTO public.invalid_records (source_table, source_id, reason, payload, detected_by)
  SELECT 'behavior_records', b.id, 'orphan_student', to_jsonb(b), auth.uid()
  FROM public.behavior_records b
  WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id=b.student_id)
    AND NOT EXISTS (SELECT 1 FROM public.invalid_records ir WHERE ir.source_table='behavior_records' AND ir.source_id=b.id);
  GET DIAGNOSTICS v = ROW_COUNT; invalid := invalid || jsonb_build_object('behavior_orphan', v);

  INSERT INTO public.invalid_records (source_table, source_id, reason, payload, detected_by)
  SELECT 'notifications', n.id, 'orphan_student', to_jsonb(n), auth.uid()
  FROM public.notifications n
  WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id=n.student_id)
    AND NOT EXISTS (SELECT 1 FROM public.invalid_records ir WHERE ir.source_table='notifications' AND ir.source_id=n.id);
  GET DIAGNOSTICS v = ROW_COUNT; invalid := invalid || jsonb_build_object('notifications_orphan', v);

  -- records pointing to non-existing organization
  INSERT INTO public.invalid_records (source_table, source_id, reason, payload, detected_by)
  SELECT 'students', s.id, 'invalid_organization', to_jsonb(s), auth.uid()
  FROM public.students s
  WHERE s.organization_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id=s.organization_id)
    AND NOT EXISTS (SELECT 1 FROM public.invalid_records ir WHERE ir.source_table='students' AND ir.source_id=s.id);
  GET DIAGNOSTICS v = ROW_COUNT; invalid := invalid || jsonb_build_object('students_invalid_org', v);

  -- AFTER scan
  SELECT count(*) INTO v FROM public.students WHERE organization_id IS NULL;
  after_scan := after_scan || jsonb_build_object('students_null_org', v);
  SELECT count(*) INTO v FROM public.classes WHERE organization_id IS NULL;
  after_scan := after_scan || jsonb_build_object('classes_null_org', v);
  SELECT count(*) INTO v FROM public.grades WHERE organization_id IS NULL;
  after_scan := after_scan || jsonb_build_object('grades_null_org', v);
  SELECT count(*) INTO v FROM public.attendance_records WHERE organization_id IS NULL;
  after_scan := after_scan || jsonb_build_object('attendance_null_org', v);
  SELECT count(*) INTO v FROM public.behavior_records WHERE organization_id IS NULL;
  after_scan := after_scan || jsonb_build_object('behavior_null_org', v);
  SELECT count(*) INTO v FROM public.notifications WHERE organization_id IS NULL;
  after_scan := after_scan || jsonb_build_object('notifications_null_org', v);

  INSERT INTO public.system_repair_runs(ran_by, fixed_counts, invalid_counts)
  VALUES (auth.uid(), fixed, invalid) RETURNING id INTO run_id;

  RETURN jsonb_build_object(
    'run_id', run_id,
    'before', before_scan,
    'after', after_scan,
    'fixed', fixed,
    'invalid', invalid,
    'ran_at', now()
  );
END $$;