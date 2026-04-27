-- 1) Update signup trigger to also grant 'admin' app_role for independent subscribers
-- so they can access admin-gated pages (Students, Settings) within their own org.
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
  v_signup_type text;
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
  v_signup_type := COALESCE(NEW.raw_user_meta_data->>'signup_type', '');

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

  -- Grant 'admin' app_role so independent subscribers can access admin-only pages
  -- within their own isolated organization (Students, Settings, etc.)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2) Repair: grant admin app_role to existing independent subscribers (owners with org, not super-owner) who are missing it
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::public.app_role
FROM public.profiles p
WHERE p.role = 'owner'::public.org_role
  AND p.organization_id IS NOT NULL
  AND COALESCE(p.is_super_owner_flag, false) = false
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id
  )
ON CONFLICT (user_id, role) DO NOTHING;