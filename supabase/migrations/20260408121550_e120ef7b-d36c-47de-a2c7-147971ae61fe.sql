
-- Custom form sections (cards/categories)
CREATE TABLE public.custom_form_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'folder',
  color TEXT NOT NULL DEFAULT 'hsl(210, 60%, 50%)',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_form_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom_form_sections" ON public.custom_form_sections
  FOR SELECT TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own custom_form_sections" ON public.custom_form_sections
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own custom_form_sections" ON public.custom_form_sections
  FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can delete own custom_form_sections" ON public.custom_form_sections
  FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Custom form templates within sections
CREATE TABLE public.custom_form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.custom_form_sections(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '📄',
  body_template TEXT NOT NULL DEFAULT '',
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  signature_enabled BOOLEAN NOT NULL DEFAULT true,
  signature_labels JSONB NOT NULL DEFAULT '["توقيع الطالب", "توقيع المعلم"]'::jsonb,
  include_auto_fields BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom_form_templates" ON public.custom_form_templates
  FOR SELECT TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own custom_form_templates" ON public.custom_form_templates
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own custom_form_templates" ON public.custom_form_templates
  FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can delete own custom_form_templates" ON public.custom_form_templates
  FOR DELETE TO authenticated USING (created_by = auth.uid());
