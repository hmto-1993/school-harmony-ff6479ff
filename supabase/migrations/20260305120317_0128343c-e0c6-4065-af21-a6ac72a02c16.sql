
-- Activities (parent entity - file or quiz)
CREATE TABLE public.teacher_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'file',
  file_url text,
  file_name text,
  is_visible boolean NOT NULL DEFAULT true,
  allow_student_uploads boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Which classes an activity is published to
CREATE TABLE public.activity_class_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.teacher_activities(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  allow_student_uploads boolean NOT NULL DEFAULT false,
  UNIQUE(activity_id, class_id)
);

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.teacher_activities(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  image_url text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Quiz submissions (one per student per quiz)
CREATE TABLE public.quiz_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.teacher_activities(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric DEFAULT 0,
  total numeric DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(activity_id, student_id)
);

-- Student file submissions
CREATE TABLE public.student_file_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.teacher_activities(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_class_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_file_submissions ENABLE ROW LEVEL SECURITY;

-- RLS: teacher_activities
CREATE POLICY "Authenticated can view activities" ON public.teacher_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage activities" ON public.teacher_activities FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can insert activities" ON public.teacher_activities FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Teachers can update own activities" ON public.teacher_activities FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Teachers can delete own activities" ON public.teacher_activities FOR DELETE TO authenticated USING (created_by = auth.uid());

-- RLS: activity_class_targets
CREATE POLICY "Authenticated can view targets" ON public.activity_class_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage targets" ON public.activity_class_targets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can insert targets" ON public.activity_class_targets FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.teacher_activities ta WHERE ta.id = activity_class_targets.activity_id AND ta.created_by = auth.uid())
);
CREATE POLICY "Teachers can delete targets" ON public.activity_class_targets FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.teacher_activities ta WHERE ta.id = activity_class_targets.activity_id AND ta.created_by = auth.uid())
);

-- RLS: quiz_questions
CREATE POLICY "Authenticated can view questions" ON public.quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage questions" ON public.quiz_questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can insert questions" ON public.quiz_questions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.teacher_activities ta WHERE ta.id = quiz_questions.activity_id AND ta.created_by = auth.uid())
);
CREATE POLICY "Teachers can update questions" ON public.quiz_questions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.teacher_activities ta WHERE ta.id = quiz_questions.activity_id AND ta.created_by = auth.uid())
);
CREATE POLICY "Teachers can delete questions" ON public.quiz_questions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.teacher_activities ta WHERE ta.id = quiz_questions.activity_id AND ta.created_by = auth.uid())
);

-- RLS: quiz_submissions - public select for student access via edge function
CREATE POLICY "Authenticated can view submissions" ON public.quiz_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can view submissions" ON public.quiz_submissions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert submissions" ON public.quiz_submissions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admins can manage submissions" ON public.quiz_submissions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: student_file_submissions - public for student access
CREATE POLICY "Authenticated can view file submissions" ON public.student_file_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can view file submissions" ON public.student_file_submissions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert file submissions" ON public.student_file_submissions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admins can manage file submissions" ON public.student_file_submissions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow anon to read activities, questions, and targets for student portal
CREATE POLICY "Anon can view activities" ON public.teacher_activities FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view targets anon" ON public.activity_class_targets FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view questions anon" ON public.quiz_questions FOR SELECT TO anon USING (true);

-- Storage bucket for activity files
INSERT INTO storage.buckets (id, name, public) VALUES ('activities', 'activities', true) ON CONFLICT DO NOTHING;

-- Storage policies for activities bucket
CREATE POLICY "Authenticated can upload activities" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'activities');
CREATE POLICY "Anyone can view activities files" ON storage.objects FOR SELECT USING (bucket_id = 'activities');
CREATE POLICY "Authenticated can delete activities files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'activities');
CREATE POLICY "Anon can upload to activities" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'activities');
