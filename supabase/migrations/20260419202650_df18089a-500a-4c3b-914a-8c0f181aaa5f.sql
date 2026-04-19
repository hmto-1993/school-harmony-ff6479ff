
-- 1) Tier enum
DO $$ BEGIN
  CREATE TYPE public.subscription_tier_type AS ENUM ('basic', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) subscription_tiers table
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier public.subscription_tier_type NOT NULL DEFAULT 'basic',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_tiers_user ON public.subscription_tiers(user_id);

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own tier" ON public.subscription_tiers;
CREATE POLICY "Users read own tier" ON public.subscription_tiers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_primary_owner(auth.uid()) OR public.is_super_owner(auth.uid()));

DROP POLICY IF EXISTS "Owner manages tiers" ON public.subscription_tiers;
CREATE POLICY "Owner manages tiers" ON public.subscription_tiers
  FOR ALL TO authenticated
  USING (public.is_primary_owner(auth.uid()) OR public.is_super_owner(auth.uid()))
  WITH CHECK (public.is_primary_owner(auth.uid()) OR public.is_super_owner(auth.uid()));

-- 3) Add required_tier to beta_features
ALTER TABLE public.beta_features
  ADD COLUMN IF NOT EXISTS required_tier public.subscription_tier_type NOT NULL DEFAULT 'premium';

-- 4) Helper: get effective tier
CREATE OR REPLACE FUNCTION public.get_user_tier(_user_id uuid)
RETURNS public.subscription_tier_type
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_super_owner(_user_id) OR public.is_primary_owner(_user_id) THEN 'premium'::public.subscription_tier_type
    ELSE COALESCE(
      (SELECT tier FROM public.subscription_tiers WHERE user_id = _user_id LIMIT 1),
      'basic'::public.subscription_tier_type
    )
  END;
$$;

-- 5) Helper: has premium
CREATE OR REPLACE FUNCTION public.has_premium_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.get_user_tier(_user_id) = 'premium'::public.subscription_tier_type;
$$;

-- 6) Owner action: set tier
CREATE OR REPLACE FUNCTION public.set_user_tier(_target_user uuid, _tier public.subscription_tier_type)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_primary_owner(auth.uid()) OR public.is_super_owner(auth.uid())) THEN
    RAISE EXCEPTION 'فقط المالك الرئيسي يمكنه تعديل الباقات';
  END IF;

  INSERT INTO public.subscription_tiers (user_id, tier, assigned_by)
  VALUES (_target_user, _tier, auth.uid())
  ON CONFLICT (user_id) DO UPDATE
    SET tier = EXCLUDED.tier,
        assigned_by = auth.uid(),
        updated_at = now();

  RETURN jsonb_build_object('success', true, 'user_id', _target_user, 'tier', _tier);
END;
$$;

-- 7) Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS trg_subscription_tiers_updated ON public.subscription_tiers;
CREATE TRIGGER trg_subscription_tiers_updated
  BEFORE UPDATE ON public.subscription_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
