
-- =========================================================================
-- Security hardening migration
-- =========================================================================

-- 1) PRIVILEGE_ESCALATION fix
-- Replace timestamp-based primary owner detection with immutable flag.
-- The is_super_owner_flag column is already protected by the
-- protect_super_owner_flag / protect_super_owner_flag_insert triggers
-- so it cannot be flipped by any role-based caller.
CREATE OR REPLACE FUNCTION public.is_primary_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND is_super_owner_flag = true
  );
$$;

-- Safety backfill: ensure at least one profile carries the flag
-- (the oldest auth user keeps super-owner status if no flag was set yet).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE is_super_owner_flag = true) THEN
    UPDATE public.profiles
       SET is_super_owner_flag = true
     WHERE user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1);
  END IF;
END $$;

-- 2) EXPOSED_SENSITIVE_DATA fix
-- Drop the broad "Teacher views org members" policy that exposes
-- national_id, phone, and subscription details to peers.
-- Teachers do not need to read other staff/student profiles directly;
-- relevant data flows through students/classes tables.
DROP POLICY IF EXISTS "Teacher views org members" ON public.profiles;

-- 3) MISSING_RLS_PROTECTION fix on staff_logins
-- Restrict insertion to actual staff (admin/teacher), preventing
-- arbitrary authenticated users (e.g. parent/student accounts) from
-- forging audit entries.
DROP POLICY IF EXISTS "Authenticated can insert own staff_logins" ON public.staff_logins;

CREATE POLICY "Staff can insert own staff_logins"
  ON public.staff_logins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'teacher'::public.app_role)
    )
  );
