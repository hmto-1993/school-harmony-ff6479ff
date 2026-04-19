
-- Back-label existing live features into Alpha Lab for monitoring & owner control
-- These features are already shipped and working; we register them so the owner can
-- toggle them off for subscribers if needed, while keeping them on for owner account.

INSERT INTO public.beta_features (feature_key, name, description, icon, is_globally_enabled, is_officially_released, owner_first_enabled_at)
VALUES
  ('radar_interactive_fx', 'تفاعل الرادار المطوّر', 'مؤثرات بصرية (Confetti، نبض، اهتزاز) وعلامات صح/خطأ المتحركة عند رصد التفاعل في الرادار التقني.', 'Sparkles', true, false, now()),
  ('radar_sound_feedback', 'الأصوات التفاعلية للرادار', 'نغمات النجاح والتنبيه عند تسجيل المشاركة الإيجابية أو الإجابة الخاطئة، مع زر كتم في واجهة الرادار.', 'Volume2', true, false, now())
ON CONFLICT (feature_key) DO NOTHING;

-- Owner-only RPC: hide a globally-enabled feature from subscribers while keeping it
-- active for the owner via a personal enrollment record.
CREATE OR REPLACE FUNCTION public.hide_beta_from_subscribers(_feature_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid := auth.uid();
BEGIN
  IF NOT (public.is_super_owner(_owner) OR public.is_primary_owner(_owner)) THEN
    RAISE EXCEPTION 'فقط المالك يمكنه إخفاء الميزات';
  END IF;

  -- Disable globally
  UPDATE public.beta_features
     SET is_globally_enabled = false,
         updated_at = now()
   WHERE id = _feature_id;

  -- Keep enabled for owner personally
  INSERT INTO public.beta_feature_enrollments (feature_id, user_id, enabled, enrolled_by)
  VALUES (_feature_id, _owner, true, _owner)
  ON CONFLICT (feature_id, user_id) DO UPDATE SET enabled = true;

  RETURN jsonb_build_object('success', true, 'hidden_from_subscribers', true, 'kept_for_owner', true);
END;
$$;
