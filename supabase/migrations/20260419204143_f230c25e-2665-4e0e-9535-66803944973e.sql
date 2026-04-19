-- Update subscriber signup trigger to auto-create a 'basic' tier row
CREATE OR REPLACE FUNCTION public.handle_new_subscriber_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
  v_national_id text;
  v_org_id uuid;
  v_is_first_user boolean;
  v_signup_type text;
BEGIN
  v_signup_type := COALESCE(NEW.raw_user_meta_data->>'signup_type', '');
  IF v_signup_type NOT IN ('subscriber', '') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_national_id := NEW.raw_user_meta_data->>'national_id';

  SELECT NOT EXISTS (SELECT 1 FROM auth.users WHERE id <> NEW.id) INTO v_is_first_user;

  INSERT INTO public.organizations (name, type, owner_id)
  VALUES (COALESCE(NULLIF(v_full_name, ''), 'مؤسسة جديدة'), 'individual'::public.organization_type, NEW.id)
  RETURNING id INTO v_org_id;

  INSERT INTO public.profiles (user_id, full_name, national_id, organization_id, role)
  VALUES (NEW.id, v_full_name, v_national_id, v_org_id, 'owner'::public.org_role);

  INSERT INTO public.teacher_permissions (
    user_id, can_print, can_export, can_send_notifications, can_delete_records,
    can_manage_grades, can_manage_attendance, can_view_reports, can_view_grades,
    can_view_attendance, can_view_activities, can_view_dashboard, can_view_students,
    read_only_mode
  ) VALUES (
    NEW.id, true, true, true, true, true, true, true, true, true, true, true, true, false
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- NEW: Auto-create subscription tier (defaults to 'basic')
  INSERT INTO public.subscription_tiers (user_id, tier)
  VALUES (NEW.id, 'basic'::public.subscription_tier_type)
  ON CONFLICT (user_id) DO NOTHING;

  IF v_is_first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Primary owner gets premium
    UPDATE public.subscription_tiers SET tier = 'premium' WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill: ensure every existing profile has a tier row
INSERT INTO public.subscription_tiers (user_id, tier)
SELECT p.user_id, 'basic'::public.subscription_tier_type
FROM public.profiles p
LEFT JOIN public.subscription_tiers st ON st.user_id = p.user_id
WHERE st.id IS NULL;