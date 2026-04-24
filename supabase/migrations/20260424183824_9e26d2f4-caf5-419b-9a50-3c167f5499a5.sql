-- جدول إعدادات إجمالي الواجبات لكل فئة تقييم
CREATE TABLE public.homework_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL,
  class_id UUID NOT NULL,
  required_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  organization_id UUID NOT NULL DEFAULT resolve_default_org(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, class_id)
);

CREATE INDEX idx_homework_targets_class ON public.homework_targets(class_id);
CREATE INDEX idx_homework_targets_category ON public.homework_targets(category_id);

ALTER TABLE public.homework_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_homework_targets_select" ON public.homework_targets
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org(auth.uid()));

CREATE POLICY "tenant_homework_targets_insert" ON public.homework_targets
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_org(auth.uid())
    AND created_by = auth.uid()
    AND (user_has_org_role_in(auth.uid(), ARRAY['owner'::org_role, 'admin'::org_role])
         OR ((get_user_org_role(auth.uid()) = 'teacher'::org_role) AND teacher_teaches_class(auth.uid(), class_id)))
  );

CREATE POLICY "tenant_homework_targets_update" ON public.homework_targets
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_org(auth.uid())
    AND (user_has_org_role_in(auth.uid(), ARRAY['owner'::org_role, 'admin'::org_role])
         OR ((get_user_org_role(auth.uid()) = 'teacher'::org_role) AND teacher_teaches_class(auth.uid(), class_id)))
  );

CREATE POLICY "tenant_homework_targets_delete" ON public.homework_targets
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_org(auth.uid())
    AND (user_has_org_role_in(auth.uid(), ARRAY['owner'::org_role, 'admin'::org_role])
         OR ((get_user_org_role(auth.uid()) = 'teacher'::org_role) AND teacher_teaches_class(auth.uid(), class_id)))
  );

CREATE POLICY "approved_users_only_homework_targets" ON public.homework_targets
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_user_approved(auth.uid()))
  WITH CHECK (is_user_approved(auth.uid()));

CREATE TRIGGER update_homework_targets_updated_at
  BEFORE UPDATE ON public.homework_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_org_homework_targets
  BEFORE INSERT ON public.homework_targets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_id();

-- جدول أسباب غياب الطلاب عن الاختبارات
CREATE TABLE public.exam_absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  category_id UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT 'unexcused',
  notes TEXT DEFAULT '',
  recorded_by UUID NOT NULL,
  organization_id UUID NOT NULL DEFAULT resolve_default_org(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, category_id)
);

CREATE INDEX idx_exam_absences_student ON public.exam_absences(student_id);
CREATE INDEX idx_exam_absences_category ON public.exam_absences(category_id);

ALTER TABLE public.exam_absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_exam_absences_select" ON public.exam_absences
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org(auth.uid()));

CREATE POLICY "tenant_exam_absences_insert" ON public.exam_absences
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_org(auth.uid())
    AND recorded_by = auth.uid()
    AND (user_has_org_role_in(auth.uid(), ARRAY['owner'::org_role, 'admin'::org_role])
         OR ((get_user_org_role(auth.uid()) = 'teacher'::org_role) AND teacher_teaches_student(auth.uid(), student_id)))
  );

CREATE POLICY "tenant_exam_absences_update" ON public.exam_absences
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_org(auth.uid())
    AND (user_has_org_role_in(auth.uid(), ARRAY['owner'::org_role, 'admin'::org_role])
         OR ((get_user_org_role(auth.uid()) = 'teacher'::org_role) AND teacher_teaches_student(auth.uid(), student_id)))
  );

CREATE POLICY "tenant_exam_absences_delete" ON public.exam_absences
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_org(auth.uid())
    AND (user_has_org_role_in(auth.uid(), ARRAY['owner'::org_role, 'admin'::org_role])
         OR ((get_user_org_role(auth.uid()) = 'teacher'::org_role) AND teacher_teaches_student(auth.uid(), student_id)))
  );

CREATE POLICY "approved_users_only_exam_absences" ON public.exam_absences
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_user_approved(auth.uid()))
  WITH CHECK (is_user_approved(auth.uid()));

CREATE TRIGGER update_exam_absences_updated_at
  BEFORE UPDATE ON public.exam_absences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_org_exam_absences
  BEFORE INSERT ON public.exam_absences
  FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_id();