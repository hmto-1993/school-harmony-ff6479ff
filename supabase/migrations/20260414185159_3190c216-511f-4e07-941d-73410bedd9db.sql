
-- Question Bank: Chapters
CREATE TABLE public.question_bank_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.question_bank_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chapters" ON public.question_bank_chapters FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can view chapters" ON public.question_bank_chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can insert chapters" ON public.question_bank_chapters FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));
CREATE POLICY "Teachers can update own chapters" ON public.question_bank_chapters FOR UPDATE TO authenticated USING (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));
CREATE POLICY "Teachers can delete own chapters" ON public.question_bank_chapters FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Question Bank: Lessons
CREATE TABLE public.question_bank_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.question_bank_chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.question_bank_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lessons" ON public.question_bank_lessons FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can view lessons" ON public.question_bank_lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can insert lessons" ON public.question_bank_lessons FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));
CREATE POLICY "Teachers can update own lessons" ON public.question_bank_lessons FOR UPDATE TO authenticated USING (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));
CREATE POLICY "Teachers can delete own lessons" ON public.question_bank_lessons FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Question Bank: Questions
CREATE TABLE public.question_bank_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.question_bank_lessons(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.question_bank_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bank questions" ON public.question_bank_questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can view bank questions" ON public.question_bank_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can insert bank questions" ON public.question_bank_questions FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));
CREATE POLICY "Teachers can update own bank questions" ON public.question_bank_questions FOR UPDATE TO authenticated USING (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));
CREATE POLICY "Teachers can delete own bank questions" ON public.question_bank_questions FOR DELETE TO authenticated USING (created_by = auth.uid());
