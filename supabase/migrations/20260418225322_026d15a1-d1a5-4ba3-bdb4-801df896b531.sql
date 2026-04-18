
-- 1. Super Owner identification function (by national_id constant)
CREATE OR REPLACE FUNCTION public.is_super_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND national_id = '1098080268'
  );
$$;

-- 2. Approval check
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.is_super_owner(_user_id)
    OR public.is_primary_owner(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = _user_id
        AND approval_status = 'approved'
        AND (subscription_end IS NULL OR subscription_end > now())
    );
$$;

-- 3. Subscription
CREATE OR REPLACE FUNCTION public.is_subscription_active(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.is_super_owner(_user_id)
    OR public.is_primary_owner(_user_id)
    OR COALESCE(
      (SELECT subscription_end IS NULL OR subscription_end > now()
       FROM public.profiles WHERE user_id = _user_id),
      false
    );
$$;

-- 4. Update protect_subscription_fields trigger to allow super owner bypass
CREATE OR REPLACE FUNCTION public.protect_subscription_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Super owner profile is immutable for subscription fields
  IF public.is_super_owner(OLD.user_id) THEN
    NEW.subscription_plan := OLD.subscription_plan;
    NEW.subscription_start := OLD.subscription_start;
    NEW.subscription_end := OLD.subscription_end;
    RETURN NEW;
  END IF;

  IF (NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
      OR NEW.subscription_start IS DISTINCT FROM OLD.subscription_start
      OR NEW.subscription_end IS DISTINCT FROM OLD.subscription_end)
     AND NOT public.is_primary_owner(auth.uid())
     AND NOT public.is_super_owner(auth.uid()) THEN
    RAISE EXCEPTION 'غير مسموح بتعديل بيانات الاشتراك';
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Update protect_approval_status to lock super owner
CREATE OR REPLACE FUNCTION public.protect_approval_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Super owner is always approved
  IF public.is_super_owner(OLD.user_id) THEN
    NEW.approval_status := 'approved';
    RETURN NEW;
  END IF;

  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role)
       AND NOT public.is_primary_owner(auth.uid())
       AND NOT public.is_super_owner(auth.uid()) THEN
      NEW.approval_status := OLD.approval_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. revoke_subscriber: block super owner
CREATE OR REPLACE FUNCTION public.revoke_subscriber(_target_user uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_primary_owner(auth.uid()) AND NOT public.is_super_owner(auth.uid()) THEN
    RAISE EXCEPTION 'فقط المالك الرئيسي يمكنه إلغاء وصول المشتركين';
  END IF;
  IF public.is_primary_owner(_target_user) OR public.is_super_owner(_target_user) THEN
    RAISE EXCEPTION 'لا يمكن إلغاء حساب المالك الرئيسي';
  END IF;
  UPDATE public.profiles
  SET approval_status = 'rejected', subscription_end = now(), updated_at = now()
  WHERE user_id = _target_user;
  RETURN json_build_object('success', true, 'user_id', _target_user);
END;
$$;

-- 7. set_user_subscription: block modifying super owner
CREATE OR REPLACE FUNCTION public.set_user_subscription(_target_user uuid, _plan text, _start timestamp with time zone, _end timestamp with time zone)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _result json;
BEGIN
  IF NOT public.is_primary_owner(auth.uid()) AND NOT public.is_super_owner(auth.uid()) THEN
    RAISE EXCEPTION 'فقط المالك الرئيسي يمكنه تعديل بيانات الاشتراك';
  END IF;
  IF public.is_super_owner(_target_user) THEN
    RAISE EXCEPTION 'لا يمكن تعديل اشتراك المالك الرئيسي';
  END IF;
  UPDATE public.profiles
  SET subscription_plan = COALESCE(_plan, subscription_plan),
      subscription_start = COALESCE(_start, subscription_start),
      subscription_end = _end,
      updated_at = now()
  WHERE user_id = _target_user
  RETURNING json_build_object('user_id', user_id, 'plan', subscription_plan, 'start', subscription_start, 'end', subscription_end) INTO _result;
  RETURN _result;
END;
$$;

-- 8. set_user_approval: block modifying super owner
CREATE OR REPLACE FUNCTION public.set_user_approval(_target_user uuid, _status approval_status)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_caller, 'admin'::public.app_role)
     AND NOT public.is_primary_owner(v_caller)
     AND NOT public.is_super_owner(v_caller) THEN
    RAISE EXCEPTION 'Only the system owner or administrators can change approval status';
  END IF;
  IF public.is_super_owner(_target_user) AND _status <> 'approved' THEN
    RAISE EXCEPTION 'لا يمكن تعديل حالة المالك الرئيسي';
  END IF;
  UPDATE public.profiles
     SET approval_status = _status, updated_at = now()
   WHERE user_id = _target_user;
  RETURN jsonb_build_object('user_id', _target_user, 'status', _status);
END;
$$;

-- 9. Force super owner profile to be approved with no expiry (now triggers permit it via super_owner check)
UPDATE public.profiles
   SET approval_status = 'approved',
       subscription_end = NULL,
       subscription_plan = 'premium',
       updated_at = now()
 WHERE national_id = '1098080268';

-- 10. Grant 'admin' app_role to super owner if not already
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::public.app_role
FROM public.profiles
WHERE national_id = '1098080268'
ON CONFLICT (user_id, role) DO NOTHING;
