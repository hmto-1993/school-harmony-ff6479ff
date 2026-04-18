-- 1. Add subscription fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS subscription_start timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_end timestamptz;

-- 2. Function: subscription active?
CREATE OR REPLACE FUNCTION public.is_subscription_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT subscription_end IS NULL OR subscription_end > now()
     FROM public.profiles WHERE user_id = _user_id),
    false
  );
$$;

-- 3. Update is_user_approved to also check subscription validity
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND approval_status = 'approved'
      AND (subscription_end IS NULL OR subscription_end > now())
  ) OR public.is_primary_owner(_user_id);
$$;

-- 4. RPC: set/extend subscription (owner only)
CREATE OR REPLACE FUNCTION public.set_user_subscription(
  _target_user uuid,
  _plan text,
  _start timestamptz,
  _end timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result json;
BEGIN
  IF NOT public.is_primary_owner(auth.uid()) THEN
    RAISE EXCEPTION 'فقط المالك الرئيسي يمكنه تعديل بيانات الاشتراك';
  END IF;

  UPDATE public.profiles
  SET subscription_plan = COALESCE(_plan, subscription_plan),
      subscription_start = COALESCE(_start, subscription_start),
      subscription_end = _end,
      updated_at = now()
  WHERE user_id = _target_user
  RETURNING json_build_object(
    'user_id', user_id,
    'plan', subscription_plan,
    'start', subscription_start,
    'end', subscription_end
  ) INTO _result;

  RETURN _result;
END;
$$;

-- 5. RPC: revoke (delete) subscriber access — owner only
CREATE OR REPLACE FUNCTION public.revoke_subscriber(_target_user uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_primary_owner(auth.uid()) THEN
    RAISE EXCEPTION 'فقط المالك الرئيسي يمكنه إلغاء وصول المشتركين';
  END IF;

  IF public.is_primary_owner(_target_user) THEN
    RAISE EXCEPTION 'لا يمكن إلغاء حساب المالك الرئيسي';
  END IF;

  UPDATE public.profiles
  SET approval_status = 'rejected',
      subscription_end = now(),
      updated_at = now()
  WHERE user_id = _target_user;

  RETURN json_build_object('success', true, 'user_id', _target_user);
END;
$$;

-- 6. Trigger to prevent users from editing their own subscription fields
CREATE OR REPLACE FUNCTION public.protect_subscription_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
      OR NEW.subscription_start IS DISTINCT FROM OLD.subscription_start
      OR NEW.subscription_end IS DISTINCT FROM OLD.subscription_end)
     AND NOT public.is_primary_owner(auth.uid()) THEN
    RAISE EXCEPTION 'غير مسموح بتعديل بيانات الاشتراك';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_subscription_fields ON public.profiles;
CREATE TRIGGER trg_protect_subscription_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_subscription_fields();