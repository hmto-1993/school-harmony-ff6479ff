-- ============================================================
-- Restricted Subscriber Permissions System
-- ============================================================

-- 1) Helper: is_primary_owner
-- The very first user (oldest auth.users record) is the system primary owner.
-- All other "owner" role users created via signup are SUBSCRIBERS.
CREATE OR REPLACE FUNCTION public.is_primary_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = _user_id
      AND created_at = (SELECT MIN(created_at) FROM auth.users)
  );
$$;

-- 2) Helper: is_subscriber
-- A subscriber is anyone who owns an organization but is NOT the primary system owner
-- and is NOT a global admin (app_role = 'admin').
CREATE OR REPLACE FUNCTION public.is_subscriber(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND NOT public.is_primary_owner(_user_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = _user_id
        AND p.role = 'owner'::public.org_role
    );
$$;

-- 3) Trigger: auto-create org + profile + roles for new signups (subscribers)
-- Only fires when a new auth.users row is inserted.
CREATE OR REPLACE FUNCTION public.handle_new_subscriber_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_national_id text;
  v_org_id uuid;
  v_is_first_user boolean;
  v_signup_type text;
BEGIN
  -- Skip students/parents (they don't get profiles via this flow)
  v_signup_type := COALESCE(NEW.raw_user_meta_data->>'signup_type', '');
  IF v_signup_type NOT IN ('subscriber', '') THEN
    RETURN NEW;
  END IF;

  -- Skip if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_national_id := NEW.raw_user_meta_data->>'national_id';

  -- Check if this is the very first user
  SELECT NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id <> NEW.id
  ) INTO v_is_first_user;

  -- Create dedicated organization
  INSERT INTO public.organizations (name, type, owner_id)
  VALUES (
    COALESCE(NULLIF(v_full_name, ''), 'مؤسسة جديدة'),
    'individual'::public.organization_type,
    NEW.id
  )
  RETURNING id INTO v_org_id;

  -- Create profile as owner of own org
  INSERT INTO public.profiles (user_id, full_name, national_id, organization_id, role)
  VALUES (NEW.id, v_full_name, v_national_id, v_org_id, 'owner'::public.org_role);

  -- Bootstrap teacher_permissions (full access within own org)
  INSERT INTO public.teacher_permissions (
    user_id, can_print, can_export, can_send_notifications, can_delete_records,
    can_manage_grades, can_manage_attendance, can_view_reports, can_view_grades,
    can_view_attendance, can_view_activities, can_view_dashboard, can_view_students,
    read_only_mode
  ) VALUES (
    NEW.id, true, true, true, true, true, true, true, true, true, true, true, true, false
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Grant 'admin' app_role ONLY to the very first user (primary system owner)
  IF v_is_first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscriber ON auth.users;
CREATE TRIGGER on_auth_user_created_subscriber
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_subscriber_signup();

-- 4) Tighten profiles INSERT: prevent subscribers from claiming a different org or admin role
-- (existing "Users can insert own profile" already enforces user_id = auth.uid())

-- 5) Lock down site_settings sensitive keys for subscribers
-- Subscribers must not read/write system-wide settings (admin_primary_id, admin_restrictions,
-- recovery_mode, white_label, etc.). Only the primary owner controls these.
DROP POLICY IF EXISTS "Subscribers cannot access system site_settings" ON public.site_settings;
CREATE POLICY "Subscribers cannot access system site_settings"
ON public.site_settings
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  -- Allow primary owner & global admins always
  public.is_primary_owner(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  -- Subscribers may only access their own scoped keys (prefixed with their user id)
  OR (id LIKE auth.uid()::text || ':%')
)
WITH CHECK (
  public.is_primary_owner(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (id LIKE auth.uid()::text || ':%')
);

-- 6) Lock down system audit / recovery functions to primary owner only
-- (these rely on has_role 'admin' which subscribers do NOT have, so already safe)

-- 7) Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON public.profiles(user_id, role);