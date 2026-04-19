
-- 1) Lock down self-updates on profiles to prevent privilege escalation
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile (safe fields)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND national_id IS NOT DISTINCT FROM (SELECT national_id FROM public.profiles WHERE user_id = auth.uid())
  AND role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE user_id = auth.uid())
  AND approval_status IS NOT DISTINCT FROM (SELECT approval_status FROM public.profiles WHERE user_id = auth.uid())
  AND organization_id IS NOT DISTINCT FROM (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
  AND subscription_plan IS NOT DISTINCT FROM (SELECT subscription_plan FROM public.profiles WHERE user_id = auth.uid())
  AND subscription_start IS NOT DISTINCT FROM (SELECT subscription_start FROM public.profiles WHERE user_id = auth.uid())
  AND subscription_end IS NOT DISTINCT FROM (SELECT subscription_end FROM public.profiles WHERE user_id = auth.uid())
);

-- Defence in depth: a trigger that ALWAYS reverts protected-field changes
-- by non-privileged callers, regardless of which policy let the UPDATE through.
CREATE OR REPLACE FUNCTION public.protect_profile_identity_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean := public.has_role(v_caller, 'admin'::public.app_role);
  v_is_primary boolean := public.is_primary_owner(v_caller);
BEGIN
  -- Only admins / primary owner may change identity fields, and never on the super-owner row except by themselves.
  IF NEW.national_id IS DISTINCT FROM OLD.national_id THEN
    IF NOT (v_is_admin OR v_is_primary) THEN
      NEW.national_id := OLD.national_id;
    END IF;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT (v_is_admin OR v_is_primary) THEN
      NEW.role := OLD.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_identity_fields_trg ON public.profiles;
CREATE TRIGGER protect_profile_identity_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_identity_fields();

-- 2) Harden super-owner check: must be BOTH the protected national_id AND the primary (oldest) user.
CREATE OR REPLACE FUNCTION public.is_super_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = _user_id
        AND national_id = '1098080268'
    )
    AND EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = _user_id
        AND created_at = (SELECT MIN(created_at) FROM auth.users)
    );
$$;

-- 3) Add explicit INSERT policy for the private 'excuses' storage bucket.
-- Admins and class teachers (the ones who can later read/delete) may insert.
DROP POLICY IF EXISTS "admins and class teachers can insert excuses" ON storage.objects;
CREATE POLICY "admins and class teachers can insert excuses"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'excuses'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  )
);
