
-- Add school, specialty, and requested_tier to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS requested_tier public.subscription_tier_type DEFAULT 'basic';

-- Update the new-subscriber trigger to capture school/specialty/requested_tier from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_subscriber_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_national_id text;
  v_phone text;
  v_school text;
  v_specialty text;
  v_requested_tier public.subscription_tier_type;
  v_signup_type text;
  v_is_first_user boolean;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_national_id := NULLIF(NEW.raw_user_meta_data->>'national_id', '');
  v_phone := NULLIF(NEW.raw_user_meta_data->>'phone', '');
  v_school := NULLIF(NEW.raw_user_meta_data->>'school', '');
  v_specialty := NULLIF(NEW.raw_user_meta_data->>'specialty', '');
  v_requested_tier := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'requested_tier', '')::public.subscription_tier_type,
    'basic'::public.subscription_tier_type
  );
  v_signup_type := COALESCE(NEW.raw_user_meta_data->>'signup_type', '');

  -- Check if first user (becomes super-owner with premium auto-approve)
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO v_is_first_user;

  -- Create / update profile
  INSERT INTO public.profiles (
    user_id, full_name, national_id, phone, school, specialty,
    requested_tier, approval_status
  ) VALUES (
    NEW.id, v_full_name, v_national_id, v_phone, v_school, v_specialty,
    v_requested_tier,
    CASE WHEN v_is_first_user THEN 'approved'::public.approval_status ELSE 'pending'::public.approval_status END
  )
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        national_id = COALESCE(EXCLUDED.national_id, public.profiles.national_id),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        school = COALESCE(EXCLUDED.school, public.profiles.school),
        specialty = COALESCE(EXCLUDED.specialty, public.profiles.specialty),
        requested_tier = EXCLUDED.requested_tier;

  -- Seed subscription_tiers row (basic by default; premium only if first user)
  INSERT INTO public.subscription_tiers (user_id, tier)
  VALUES (NEW.id, CASE WHEN v_is_first_user THEN 'premium'::public.subscription_tier_type ELSE 'basic'::public.subscription_tier_type END)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
