-- =========================================================================
-- FIX: Subscriber permission isolation
-- =========================================================================
-- Problem 1: handle_new_subscriber_signup grants global app_role 'admin' to
--            every new subscriber. This breaks tenant isolation because
--            policies that fall back to has_role(uid,'admin') let them see
--            data from other organizations.
-- Problem 2: tenant_students_select includes a global-admin escape hatch.
-- Problem 3: Existing subscribers (non-primary) have stale 'admin' rows in
--            user_roles + duplicate / orphan profile rows.
-- =========================================================================

-- 1) Remove global admin escape hatch from students SELECT.
--    Org-scoped owner/admin/teacher checks already cover legitimate access.
DROP POLICY IF EXISTS tenant_students_select ON public.students;
CREATE POLICY tenant_students_select
ON public.students FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_org(auth.uid())
  AND (
    public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role, 'admin'::public.org_role])
    OR (
      public.get_user_org_role(auth.uid()) = 'teacher'::public.org_role
      AND class_id IS NOT NULL
      AND public.teacher_teaches_class(auth.uid(), class_id)
    )
  )
);

-- 2) Update subscriber signup trigger: do NOT grant global app_role 'admin'.
--    Org role 'owner' already gives full access inside their own org.
CREATE OR REPLACE FUNCTION public.handle_new_subscriber_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
  v_national_id text;
  v_phone text;
  v_school text;
  v_specialty text;
  v_requested_tier public.subscription_tier_type;
  v_is_first_user boolean;
  v_org_id uuid;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_national_id := NULLIF(NEW.raw_user_meta_data->>'national_id', '');
  v_phone := NULLIF(NEW.raw_user_meta_data->>'phone', '');
  v_school := NULLIF(NEW.raw_user_meta_data->>'school', '');
  v_specialty := NULLIF(NEW.raw_user_meta_data->>'specialty', '');
  v_requested_tier := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'requested_tier', '')::public.subscription_tier_type,
    'basic'::public.subscription_tier_type
  );

  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO v_is_first_user;

  INSERT INTO public.organizations (name, type, owner_id)
  VALUES (COALESCE(NULLIF(v_school, ''), v_full_name, 'مؤسسة فردية'), 'individual', NEW.id)
  RETURNING id INTO v_org_id;

  INSERT INTO public.profiles (
    user_id, full_name, national_id, phone, school, specialty,
    requested_tier, approval_status, role, organization_id
  ) VALUES (
    NEW.id, v_full_name, v_national_id, v_phone, v_school, v_specialty,
    v_requested_tier,
    'approved'::public.approval_status,
    'owner'::public.org_role,
    v_org_id
  )
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        national_id = COALESCE(EXCLUDED.national_id, public.profiles.national_id),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        school = COALESCE(EXCLUDED.school, public.profiles.school),
        specialty = COALESCE(EXCLUDED.specialty, public.profiles.specialty),
        requested_tier = EXCLUDED.requested_tier,
        role = COALESCE(public.profiles.role, 'owner'::public.org_role),
        organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id),
        approval_status = 'approved'::public.approval_status;

  INSERT INTO public.subscription_tiers (user_id, tier)
  VALUES (NEW.id, CASE WHEN v_is_first_user THEN 'premium'::public.subscription_tier_type ELSE 'basic'::public.subscription_tier_type END)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.teacher_permissions (
    user_id, can_print, can_export, can_send_notifications, can_delete_records,
    can_manage_grades, can_manage_attendance, can_view_reports, can_view_grades,
    can_view_attendance, can_view_activities, can_view_dashboard, can_view_students,
    read_only_mode
  ) VALUES (
    NEW.id, true, true, true, true, true, true, true, true, true, true, true, true, false
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- IMPORTANT: Only the very first user (system primary owner) gets global admin role.
  -- Subsequent subscribers get NO app_role; their org_role='owner' is enough for their own org.
  IF v_is_first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Repair existing subscribers: revoke global 'admin' app_role from any
--    user who is NOT the system primary owner.
DELETE FROM public.user_roles ur
WHERE ur.role = 'admin'::public.app_role
  AND NOT public.is_primary_owner(ur.user_id);
