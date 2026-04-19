
-- 1) Beta features registry
CREATE TABLE public.beta_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'Atom',
  is_globally_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view beta features"
ON public.beta_features FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only super owner manages beta features"
ON public.beta_features FOR ALL
TO authenticated
USING (public.is_super_owner(auth.uid()) OR public.is_primary_owner(auth.uid()))
WITH CHECK (public.is_super_owner(auth.uid()) OR public.is_primary_owner(auth.uid()));

CREATE TRIGGER update_beta_features_updated_at
BEFORE UPDATE ON public.beta_features
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Per-subscriber enrollments
CREATE TABLE public.beta_feature_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id UUID NOT NULL REFERENCES public.beta_features(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enrolled_by UUID,
  UNIQUE (feature_id, user_id)
);

ALTER TABLE public.beta_feature_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own enrollments"
ON public.beta_feature_enrollments FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_super_owner(auth.uid()) OR public.is_primary_owner(auth.uid()));

CREATE POLICY "Only owner manages enrollments"
ON public.beta_feature_enrollments FOR ALL
TO authenticated
USING (public.is_super_owner(auth.uid()) OR public.is_primary_owner(auth.uid()))
WITH CHECK (public.is_super_owner(auth.uid()) OR public.is_primary_owner(auth.uid()));

CREATE INDEX idx_beta_enrollments_user ON public.beta_feature_enrollments(user_id);
CREATE INDEX idx_beta_enrollments_feature ON public.beta_feature_enrollments(feature_id);

-- 3) Feedback
CREATE TABLE public.beta_feature_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id UUID NOT NULL REFERENCES public.beta_features(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feature_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback"
ON public.beta_feature_feedback FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own feedback or owner reads all"
ON public.beta_feature_feedback FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_super_owner(auth.uid()) OR public.is_primary_owner(auth.uid()));

CREATE POLICY "Owner can delete feedback"
ON public.beta_feature_feedback FOR DELETE
TO authenticated
USING (public.is_super_owner(auth.uid()) OR public.is_primary_owner(auth.uid()));

CREATE INDEX idx_beta_feedback_feature ON public.beta_feature_feedback(feature_id);
