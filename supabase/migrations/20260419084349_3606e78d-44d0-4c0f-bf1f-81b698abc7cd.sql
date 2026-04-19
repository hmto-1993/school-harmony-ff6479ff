-- Add tracking columns to beta_features
ALTER TABLE public.beta_features
  ADD COLUMN IF NOT EXISTS owner_first_enabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_officially_released boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS snooze_until timestamptz;

-- Backfill: any feature already enabled globally counts as released
UPDATE public.beta_features
   SET is_officially_released = true,
       released_at = COALESCE(released_at, updated_at)
 WHERE is_globally_enabled = true AND is_officially_released = false;

-- Trigger to stamp owner_first_enabled_at when super-owner first enables for self
CREATE OR REPLACE FUNCTION public.stamp_beta_owner_first_enabled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.enabled = true THEN
    UPDATE public.beta_features bf
       SET owner_first_enabled_at = COALESCE(bf.owner_first_enabled_at, now())
     WHERE bf.id = NEW.feature_id
       AND public.is_super_owner(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_beta_owner_first_enabled ON public.beta_feature_enrollments;
CREATE TRIGGER trg_stamp_beta_owner_first_enabled
AFTER INSERT OR UPDATE ON public.beta_feature_enrollments
FOR EACH ROW EXECUTE FUNCTION public.stamp_beta_owner_first_enabled();

-- Backfill owner_first_enabled_at from existing enrollments of super-owner
UPDATE public.beta_features bf
   SET owner_first_enabled_at = sub.first_at
  FROM (
    SELECT e.feature_id, MIN(e.enrolled_at) AS first_at
      FROM public.beta_feature_enrollments e
      JOIN public.profiles p ON p.user_id = e.user_id
     WHERE e.enabled = true AND p.national_id = '1098080268'
     GROUP BY e.feature_id
  ) sub
 WHERE bf.id = sub.feature_id
   AND bf.owner_first_enabled_at IS NULL;

-- Secure release function: only super-owner (national_id 1098080268) can release globally
CREATE OR REPLACE FUNCTION public.release_beta_feature_globally(_feature_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_owner(auth.uid()) THEN
    RAISE EXCEPTION 'فقط المالك الرئيسي يمكنه إطلاق الميزات للجميع';
  END IF;

  UPDATE public.beta_features
     SET is_globally_enabled = true,
         is_officially_released = true,
         released_at = now(),
         updated_at = now()
   WHERE id = _feature_id;

  RETURN jsonb_build_object('success', true, 'feature_id', _feature_id, 'released_at', now());
END;
$$;

-- Snooze function (extend trial by 3 days)
CREATE OR REPLACE FUNCTION public.snooze_beta_feature(_feature_id uuid, _days int DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_owner(auth.uid()) THEN
    RAISE EXCEPTION 'فقط المالك الرئيسي يمكنه تأجيل التنبيه';
  END IF;

  UPDATE public.beta_features
     SET snooze_until = now() + (_days || ' days')::interval,
         updated_at = now()
   WHERE id = _feature_id;

  RETURN jsonb_build_object('success', true, 'snooze_until', now() + (_days || ' days')::interval);
END;
$$;