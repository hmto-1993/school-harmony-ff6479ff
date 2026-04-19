
-- ============================================================================
-- 1) HARDCODED_SUPER_OWNER_IDENTITY: Add dedicated protected column
-- ============================================================================

-- Add an immutable super-owner flag column (only service role / db owner can flip it)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_owner_flag boolean NOT NULL DEFAULT false;

-- Backfill: set the flag for the existing super-owner (oldest user with the legacy national_id)
UPDATE public.profiles p
   SET is_super_owner_flag = true
  WHERE p.user_id = (
    SELECT u.id FROM auth.users u
    WHERE EXISTS (
      SELECT 1 FROM public.profiles pp
      WHERE pp.user_id = u.id AND pp.national_id = '1098080268'
    )
    ORDER BY u.created_at ASC
    LIMIT 1
  );

-- Trigger: prevent anyone (including admins) from changing is_super_owner_flag via SQL/RLS.
-- Only the postgres role (service role / migrations) may toggle this column.
CREATE OR REPLACE FUNCTION public.protect_super_owner_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_super_owner_flag IS DISTINCT FROM OLD.is_super_owner_flag THEN
    -- Block all role-based callers; only allow when there is no auth.uid() (service role / sql migrations)
    IF auth.uid() IS NOT NULL THEN
      NEW.is_super_owner_flag := OLD.is_super_owner_flag;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_super_owner_flag ON public.profiles;
CREATE TRIGGER trg_protect_super_owner_flag
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_super_owner_flag();

-- Block INSERTs from setting it true except via service role
CREATE OR REPLACE FUNCTION public.protect_super_owner_flag_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_super_owner_flag = true AND auth.uid() IS NOT NULL THEN
    NEW.is_super_owner_flag := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_super_owner_flag_insert ON public.profiles;
CREATE TRIGGER trg_protect_super_owner_flag_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_super_owner_flag_insert();

-- Update is_super_owner to rely on the protected flag (no more national_id check)
CREATE OR REPLACE FUNCTION public.is_super_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND is_super_owner_flag = true
  );
$$;

-- ============================================================================
-- 2) RECOVERY_MODE_DATA_EXPOSURE: Restrict to admins/owners; remove
--    cross-org national_id lookup
-- ============================================================================

DROP POLICY IF EXISTS recovery_students_select ON public.students;

CREATE POLICY recovery_students_select
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    public.is_recovery_mode()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role, 'admin'::public.org_role])
    )
    AND (
      organization_id IS NULL
      OR organization_id = public.get_user_org(auth.uid())
    )
  );

-- ============================================================================
-- 3) ANON_ACTIVITY_TARGET_DISCLOSURE: remove anonymous SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Students can view activity targets" ON public.activity_class_targets;

-- ============================================================================
-- 4) MISSING_REALTIME_CHANNEL_AUTHORIZATION: lock down realtime.messages
-- ============================================================================

-- Default-deny on realtime.messages by enabling RLS without permissive policies.
-- Add an authenticated-only baseline so currently-published tables (platform_features) still work.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_can_receive_realtime ON realtime.messages;
CREATE POLICY authenticated_can_receive_realtime
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (true);
