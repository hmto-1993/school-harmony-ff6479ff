-- Table to store the maximum total score for each main category group (per class)
CREATE TABLE IF NOT EXISTS public.category_group_caps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  category_group text NOT NULL,
  max_total numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (class_id, category_group)
);

ALTER TABLE public.category_group_caps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view category_group_caps"
ON public.category_group_caps FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR class_id IS NULL
  OR same_org_as_class(class_id)
);

CREATE POLICY "Org members manage category_group_caps"
ON public.category_group_caps FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (class_id IS NOT NULL AND same_org_as_class(class_id))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (class_id IS NOT NULL AND same_org_as_class(class_id))
);

CREATE POLICY "approved_users_only_caps"
ON public.category_group_caps AS RESTRICTIVE FOR ALL TO authenticated
USING (is_user_approved(auth.uid()))
WITH CHECK (is_user_approved(auth.uid()));

CREATE TRIGGER update_category_group_caps_updated_at
BEFORE UPDATE ON public.category_group_caps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();