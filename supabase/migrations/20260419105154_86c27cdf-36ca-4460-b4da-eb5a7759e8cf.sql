-- Auto-hide officially released features from Alpha Lab (lifecycle stage 3)
-- Update release function to clean up enrollments and hide from lab list

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

  -- Mark as officially released (becomes "native" part of the system)
  UPDATE public.beta_features
     SET is_globally_enabled = true,
         is_officially_released = true,
         released_at = now(),
         updated_at = now()
   WHERE id = _feature_id;

  -- Clean up beta enrollments since feature is now universal
  DELETE FROM public.beta_feature_enrollments WHERE feature_id = _feature_id;

  RETURN jsonb_build_object('success', true, 'feature_id', _feature_id, 'released_at', now(), 'archived', true);
END;
$$;