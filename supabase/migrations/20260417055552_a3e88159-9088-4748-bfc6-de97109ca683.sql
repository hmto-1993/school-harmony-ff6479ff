
-- 1) BACKUPS
CREATE TABLE IF NOT EXISTS public.students_backup       AS TABLE public.students       WITH NO DATA;
CREATE TABLE IF NOT EXISTS public.classes_backup        AS TABLE public.classes        WITH NO DATA;
CREATE TABLE IF NOT EXISTS public.grades_backup         AS TABLE public.grades         WITH NO DATA;
CREATE TABLE IF NOT EXISTS public.attendance_backup     AS TABLE public.attendance_records WITH NO DATA;
CREATE TABLE IF NOT EXISTS public.behavior_backup       AS TABLE public.behavior_records   WITH NO DATA;
CREATE TABLE IF NOT EXISTS public.notifications_backup  AS TABLE public.notifications  WITH NO DATA;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.students_backup LIMIT 1) THEN
    INSERT INTO public.students_backup       SELECT * FROM public.students;
    INSERT INTO public.classes_backup        SELECT * FROM public.classes;
    INSERT INTO public.grades_backup         SELECT * FROM public.grades;
    INSERT INTO public.attendance_backup     SELECT * FROM public.attendance_records;
    INSERT INTO public.behavior_backup       SELECT * FROM public.behavior_records;
    INSERT INTO public.notifications_backup  SELECT * FROM public.notifications;
  END IF;
END$$;

ALTER TABLE public.students_backup       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes_backup        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades_backup         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_backup     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_backup       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_backup  ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['students_backup','classes_backup','grades_backup','attendance_backup','behavior_backup','notifications_backup']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_read_%1$s ON public.%1$s', t);
    EXECUTE format($q$CREATE POLICY admin_read_%1$s ON public.%1$s FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))$q$, t);
  END LOOP;
END$$;

-- 2) QUARANTINE + AUDIT
CREATE TABLE IF NOT EXISTS public.system_repair_invalid (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL, record_id uuid, reason text NOT NULL,
  payload jsonb NOT NULL, flagged_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_repair_invalid ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_manage_invalid ON public.system_repair_invalid;
CREATE POLICY admin_manage_invalid ON public.system_repair_invalid FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.system_repair_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ran_at timestamptz NOT NULL DEFAULT now(),
  ran_by uuid, fixed_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  invalid_counts jsonb NOT NULL DEFAULT '{}'::jsonb, notes text
);
ALTER TABLE public.system_repair_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_manage_runs ON public.system_repair_runs;
CREATE POLICY admin_manage_runs ON public.system_repair_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- 3) INLINE BACKFILL — disable user triggers (e.g. lock_organization_id) during update
ALTER TABLE public.students            DISABLE TRIGGER USER;
ALTER TABLE public.classes             DISABLE TRIGGER USER;
ALTER TABLE public.grades              DISABLE TRIGGER USER;
ALTER TABLE public.attendance_records  DISABLE TRIGGER USER;
ALTER TABLE public.behavior_records    DISABLE TRIGGER USER;
ALTER TABLE public.notifications       DISABLE TRIGGER USER;

DO $$
DECLARE default_org uuid;
BEGIN
  SELECT id INTO default_org FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  IF default_org IS NULL THEN RAISE EXCEPTION 'Cannot backfill: no organization exists'; END IF;

  UPDATE public.classes SET organization_id = default_org WHERE organization_id IS NULL;

  UPDATE public.students s SET organization_id = COALESCE(c.organization_id, default_org)
    FROM public.classes c WHERE s.class_id = c.id AND s.organization_id IS NULL;
  UPDATE public.students SET organization_id = default_org WHERE organization_id IS NULL;

  UPDATE public.grades g SET organization_id = COALESCE(s.organization_id, default_org)
    FROM public.students s WHERE g.student_id = s.id AND g.organization_id IS NULL;
  UPDATE public.grades SET organization_id = default_org WHERE organization_id IS NULL;

  UPDATE public.attendance_records a SET organization_id = COALESCE(s.organization_id, c.organization_id, default_org)
    FROM public.students s, public.classes c WHERE a.student_id = s.id AND a.class_id = c.id AND a.organization_id IS NULL;
  UPDATE public.attendance_records SET organization_id = default_org WHERE organization_id IS NULL;

  UPDATE public.behavior_records b SET organization_id = COALESCE(s.organization_id, default_org)
    FROM public.students s WHERE b.student_id = s.id AND b.organization_id IS NULL;
  UPDATE public.behavior_records SET organization_id = default_org WHERE organization_id IS NULL;

  UPDATE public.notifications n SET organization_id = COALESCE(s.organization_id, default_org)
    FROM public.students s WHERE n.student_id = s.id AND n.organization_id IS NULL;
  UPDATE public.notifications SET organization_id = default_org WHERE organization_id IS NULL;

  -- Quarantine orphans (don't delete)
  INSERT INTO public.system_repair_invalid(table_name, record_id, reason, payload)
  SELECT 'grades', g.id, 'orphan_student', to_jsonb(g) FROM public.grades g
   WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id=g.student_id);
  INSERT INTO public.system_repair_invalid(table_name, record_id, reason, payload)
  SELECT 'attendance_records', a.id, 'orphan_student_or_class', to_jsonb(a) FROM public.attendance_records a
   WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id=a.student_id)
      OR NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.id=a.class_id);
  INSERT INTO public.system_repair_invalid(table_name, record_id, reason, payload)
  SELECT 'behavior_records', b.id, 'orphan_student', to_jsonb(b) FROM public.behavior_records b
   WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id=b.student_id);
  INSERT INTO public.system_repair_invalid(table_name, record_id, reason, payload)
  SELECT 'notifications', n.id, 'orphan_student', to_jsonb(n) FROM public.notifications n
   WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id=n.student_id);

  INSERT INTO public.system_repair_runs(ran_by, notes) VALUES (NULL, 'Initial backfill from migration');
END$$;

ALTER TABLE public.students            ENABLE TRIGGER USER;
ALTER TABLE public.classes             ENABLE TRIGGER USER;
ALTER TABLE public.grades              ENABLE TRIGGER USER;
ALTER TABLE public.attendance_records  ENABLE TRIGGER USER;
ALTER TABLE public.behavior_records    ENABLE TRIGGER USER;
ALTER TABLE public.notifications       ENABLE TRIGGER USER;

-- 4) HELPERS
CREATE OR REPLACE FUNCTION public.resolve_default_org()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1; $$;

-- 5) STRICT INSERT-GUARD TRIGGER
CREATE OR REPLACE FUNCTION public.enforce_organization_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN NEW.organization_id := public.get_user_org(auth.uid()); END IF;
  IF NEW.organization_id IS NULL THEN NEW.organization_id := public.resolve_default_org(); END IF;
  IF NEW.organization_id IS NULL THEN RAISE EXCEPTION 'organization_id is required'; END IF;
  RETURN NEW;
END$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['students','classes','grades','attendance_records','behavior_records','notifications']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_org_%1$s ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_enforce_org_%1$s BEFORE INSERT ON public.%1$s
      FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_id()', t);
  END LOOP;
END$$;

-- 6) NOT NULL
ALTER TABLE public.students            ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.classes             ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.grades              ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.attendance_records  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.behavior_records    ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.notifications       ALTER COLUMN organization_id SET NOT NULL;

-- 7) ADMIN-CALLABLE REPAIR FUNCTION
CREATE OR REPLACE FUNCTION public.run_system_repair()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE default_org uuid; fixed jsonb := '{}'::jsonb; invalid jsonb := '{}'::jsonb; v_count int; run_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT public.user_has_org_role_in(auth.uid(), ARRAY['owner'::org_role,'admin'::org_role]) THEN
    RAISE EXCEPTION 'Only admins can run system repair';
  END IF;
  default_org := public.resolve_default_org();
  IF default_org IS NULL THEN RAISE EXCEPTION 'No organization exists'; END IF;

  WITH upd AS (UPDATE public.classes SET organization_id=default_org WHERE organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v_count FROM upd; fixed := fixed || jsonb_build_object('classes', v_count);

  WITH upd AS (UPDATE public.students s SET organization_id=COALESCE(c.organization_id,default_org)
               FROM public.classes c WHERE s.class_id=c.id AND s.organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v_count FROM upd; fixed := fixed || jsonb_build_object('students_from_class', v_count);
  WITH upd AS (UPDATE public.students SET organization_id=default_org WHERE organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v_count FROM upd; fixed := fixed || jsonb_build_object('students_default', v_count);

  WITH upd AS (UPDATE public.grades g SET organization_id=COALESCE(s.organization_id,default_org)
               FROM public.students s WHERE g.student_id=s.id AND g.organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v_count FROM upd; fixed := fixed || jsonb_build_object('grades', v_count);

  WITH upd AS (UPDATE public.attendance_records a SET organization_id=COALESCE(s.organization_id,c.organization_id,default_org)
               FROM public.students s, public.classes c WHERE a.student_id=s.id AND a.class_id=c.id AND a.organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v_count FROM upd; fixed := fixed || jsonb_build_object('attendance', v_count);

  WITH upd AS (UPDATE public.behavior_records b SET organization_id=COALESCE(s.organization_id,default_org)
               FROM public.students s WHERE b.student_id=s.id AND b.organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v_count FROM upd; fixed := fixed || jsonb_build_object('behavior', v_count);

  WITH upd AS (UPDATE public.notifications n SET organization_id=COALESCE(s.organization_id,default_org)
               FROM public.students s WHERE n.student_id=s.id AND n.organization_id IS NULL RETURNING 1)
  SELECT count(*) INTO v_count FROM upd; fixed := fixed || jsonb_build_object('notifications', v_count);

  INSERT INTO public.system_repair_runs(ran_by, fixed_counts, invalid_counts)
  VALUES (auth.uid(), fixed, invalid) RETURNING id INTO run_id;

  RETURN jsonb_build_object('run_id', run_id, 'fixed', fixed, 'invalid', invalid);
END$$;

GRANT EXECUTE ON FUNCTION public.run_system_repair() TO authenticated;

ANALYZE public.students; ANALYZE public.classes; ANALYZE public.grades;
ANALYZE public.attendance_records; ANALYZE public.behavior_records; ANALYZE public.notifications;
