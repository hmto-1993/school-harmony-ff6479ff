-- Backup table for student recovery snapshots (separate from existing students_backup)
CREATE TABLE IF NOT EXISTS public.students_recovery_snapshots (
  snapshot_id uuid NOT NULL DEFAULT gen_random_uuid(),
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  snapshot_by uuid,
  student_id uuid,
  original_organization_id uuid,
  payload jsonb NOT NULL,
  PRIMARY KEY (snapshot_id, student_id)
);

ALTER TABLE public.students_recovery_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/owners can view recovery snapshots" ON public.students_recovery_snapshots;
CREATE POLICY "Admins/owners can view recovery snapshots"
ON public.students_recovery_snapshots FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role, 'admin'::public.org_role])
);

-- Recovery function: restore orphaned students into the caller's organization
CREATE OR REPLACE FUNCTION public.restore_missing_students()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_org uuid;
  snap_id uuid := gen_random_uuid();
  null_count int := 0;
  invalid_org_count int := 0;
  fixed_null int := 0;
  fixed_invalid int := 0;
  total_after int := 0;
BEGIN
  -- Authorization: must be a global admin OR org owner/admin
  IF NOT public.has_role(caller, 'admin'::public.app_role)
     AND NOT public.user_has_org_role_in(caller, ARRAY['owner'::public.org_role, 'admin'::public.org_role]) THEN
    RAISE EXCEPTION 'Only admins or organization owners can restore students';
  END IF;

  caller_org := public.get_user_org(caller);
  IF caller_org IS NULL THEN
    caller_org := public.resolve_default_org();
  END IF;
  IF caller_org IS NULL THEN
    RAISE EXCEPTION 'No organization available for recovery';
  END IF;

  -- 1) Snapshot orphaned students BEFORE update
  INSERT INTO public.students_recovery_snapshots (snapshot_id, snapshot_by, student_id, original_organization_id, payload)
  SELECT snap_id, caller, s.id, s.organization_id, to_jsonb(s)
  FROM public.students s
  WHERE s.organization_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = s.organization_id);

  -- Counts before fix
  SELECT count(*) INTO null_count FROM public.students WHERE organization_id IS NULL;
  SELECT count(*) INTO invalid_org_count
  FROM public.students s
  WHERE s.organization_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = s.organization_id);

  -- 2) Fix NULL organization_id → caller's organization
  WITH upd AS (
    UPDATE public.students
       SET organization_id = caller_org
     WHERE organization_id IS NULL
     RETURNING 1
  )
  SELECT count(*) INTO fixed_null FROM upd;

  -- 3) Fix invalid organization_id (points to non-existent org) → caller's organization
  WITH upd AS (
    UPDATE public.students s
       SET organization_id = caller_org
     WHERE s.organization_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = s.organization_id)
     RETURNING 1
  )
  SELECT count(*) INTO fixed_invalid FROM upd;

  SELECT count(*) INTO total_after FROM public.students WHERE organization_id = caller_org;

  RETURN jsonb_build_object(
    'snapshot_id', snap_id,
    'organization_id', caller_org,
    'before', jsonb_build_object('null_org', null_count, 'invalid_org', invalid_org_count),
    'fixed', jsonb_build_object('null_org', fixed_null, 'invalid_org', fixed_invalid),
    'students_in_org_after', total_after,
    'ran_at', now()
  );
END $$;

REVOKE ALL ON FUNCTION public.restore_missing_students() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_missing_students() TO authenticated;