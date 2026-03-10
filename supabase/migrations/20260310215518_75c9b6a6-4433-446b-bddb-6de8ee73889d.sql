
CREATE TABLE public.manual_category_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.grade_categories(id) ON DELETE CASCADE,
  period SMALLINT NOT NULL DEFAULT 1,
  score NUMERIC NOT NULL DEFAULT 0,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id, category_id, period)
);

ALTER TABLE public.manual_category_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage manual_category_scores" ON public.manual_category_scores FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can insert manual_category_scores" ON public.manual_category_scores FOR INSERT TO authenticated WITH CHECK (
  recorded_by = auth.uid() AND EXISTS (
    SELECT 1 FROM students s JOIN teacher_classes tc ON tc.class_id = s.class_id
    WHERE s.id = manual_category_scores.student_id AND tc.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can update manual_category_scores" ON public.manual_category_scores FOR UPDATE TO authenticated USING (
  recorded_by = auth.uid() AND EXISTS (
    SELECT 1 FROM students s JOIN teacher_classes tc ON tc.class_id = s.class_id
    WHERE s.id = manual_category_scores.student_id AND tc.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view manual_category_scores" ON public.manual_category_scores FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM students s JOIN teacher_classes tc ON tc.class_id = s.class_id
    WHERE s.id = manual_category_scores.student_id AND tc.teacher_id = auth.uid()
  )
);
