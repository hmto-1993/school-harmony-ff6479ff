-- Recovery function: restores the primary owner account
CREATE OR REPLACE FUNCTION public.recover_primary_owner()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_owner_email text;
  v_owner_meta jsonb;
  v_org_id uuid;
  v_profile_id uuid;
  v_national_id text;
  v_full_name text;
  v_created_org boolean := false;
  v_created_profile boolean := false;
BEGIN
  -- 1) Find the oldest auth user = primary owner
  SELECT id, email, raw_user_meta_data
    INTO v_owner_id, v_owner_email, v_owner_meta
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'No users found in auth.users';
  END IF;

  v_full_name := COALESCE(v_owner_meta->>'full_name', v_owner_meta->>'name', split_part(v_owner_email, '@', 1));
  v_national_id := COALESCE(v_owner_meta->>'national_id', NULL);

  -- 2) Ensure profile exists
  SELECT id, organization_id, national_id
    INTO v_profile_id, v_org_id, v_national_id
  FROM public.profiles
  WHERE user_id = v_owner_id
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    -- Find or create an organization first
    SELECT id INTO v_org_id FROM public.organizations WHERE owner_id = v_owner_id LIMIT 1;
    IF v_org_id IS NULL THEN
      INSERT INTO public.organizations (name, type, owner_id)
      VALUES (COALESCE(v_full_name, 'My Organization'), 'individual', v_owner_id)
      RETURNING id INTO v_org_id;
      v_created_org := true;
    END IF;

    INSERT INTO public.profiles (user_id, full_name, national_id, organization_id, role)
    VALUES (v_owner_id, COALESCE(v_full_name, v_owner_email), v_national_id, v_org_id, 'owner')
    RETURNING id INTO v_profile_id;
    v_created_profile := true;
  ELSE
    -- 3) Ensure organization exists for this profile
    IF v_org_id IS NULL THEN
      SELECT id INTO v_org_id FROM public.organizations WHERE owner_id = v_owner_id LIMIT 1;
      IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (name, type, owner_id)
        VALUES (COALESCE(v_full_name, 'My Organization'), 'individual', v_owner_id)
        RETURNING id INTO v_org_id;
        v_created_org := true;
      END IF;
    END IF;

    -- 4) Force role = owner and link organization
    UPDATE public.profiles
       SET role = 'owner',
           organization_id = v_org_id,
           national_id = COALESCE(national_id, v_national_id),
           full_name = COALESCE(NULLIF(full_name, ''), v_full_name, v_owner_email),
           updated_at = now()
     WHERE id = v_profile_id;
  END IF;

  -- 5) Make sure organization owner_id points to this user
  UPDATE public.organizations
     SET owner_id = v_owner_id
   WHERE id = v_org_id AND owner_id IS DISTINCT FROM v_owner_id;

  -- 6) Grant global admin app role for full module access
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_owner_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 7) Bootstrap teacher_permissions (full access)
  INSERT INTO public.teacher_permissions (
    user_id, can_print, can_export, can_send_notifications, can_delete_records,
    can_manage_grades, can_manage_attendance, can_view_reports, can_view_grades,
    can_view_attendance, can_view_activities, can_view_dashboard, can_view_students,
    read_only_mode
  ) VALUES (
    v_owner_id, true, true, true, true, true, true, true, true, true, true, true, true, false
  )
  ON CONFLICT (user_id) DO UPDATE SET
    can_print = true, can_export = true, can_send_notifications = true,
    can_delete_records = true, can_manage_grades = true, can_manage_attendance = true,
    can_view_reports = true, can_view_grades = true, can_view_attendance = true,
    can_view_activities = true, can_view_dashboard = true, can_view_students = true,
    read_only_mode = false;

  -- 8) Mark as primary admin in site_settings
  INSERT INTO public.site_settings (id, value)
  VALUES ('admin_primary_id', v_owner_id::text)
  ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  RETURN jsonb_build_object(
    'owner_user_id', v_owner_id,
    'owner_email', v_owner_email,
    'organization_id', v_org_id,
    'national_id', v_national_id,
    'created_org', v_created_org,
    'created_profile', v_created_profile,
    'role', 'owner'
  );
END;
$$;

-- Run the recovery now
SELECT public.recover_primary_owner();

-- Make sure RLS is still enabled on profiles (sanity check)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;