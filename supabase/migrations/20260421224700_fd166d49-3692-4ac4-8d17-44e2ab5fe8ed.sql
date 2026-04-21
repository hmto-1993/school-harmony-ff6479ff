ALTER TABLE public.beta_features
  ADD COLUMN IF NOT EXISTS change_type text NOT NULL DEFAULT 'new' CHECK (change_type IN ('new','updated')),
  ADD COLUMN IF NOT EXISTS last_changed_at timestamptz NOT NULL DEFAULT now();

-- Auto-stamp last_changed_at when feature is updated meaningfully
CREATE OR REPLACE FUNCTION public.bump_beta_feature_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.name IS DISTINCT FROM OLD.name
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.feature_key IS DISTINCT FROM OLD.feature_key) THEN
    NEW.last_changed_at := now();
    IF OLD.change_type = 'new' AND NEW.change_type = 'new' THEN
      NEW.change_type := 'updated';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bump_beta_feature_change ON public.beta_features;
CREATE TRIGGER trg_bump_beta_feature_change
BEFORE UPDATE ON public.beta_features
FOR EACH ROW EXECUTE FUNCTION public.bump_beta_feature_change();