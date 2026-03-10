
-- 1. ERROR: Enable RLS on student_login_attempts and restrict to admins only
ALTER TABLE public.student_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage student_login_attempts"
  ON public.student_login_attempts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. WARN: Fix academic_calendar SELECT policy - change from public to authenticated
DROP POLICY IF EXISTS "Authenticated can view academic_calendar" ON public.academic_calendar;
CREATE POLICY "Authenticated can view academic_calendar"
  ON public.academic_calendar FOR SELECT
  TO authenticated
  USING (true);

-- 3. WARN: Fix students UPDATE policy - add WITH CHECK to prevent class reassignment
DROP POLICY IF EXISTS "Teachers can update students in their classes" ON public.students;
CREATE POLICY "Teachers can update students in their classes"
  ON public.students FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM teacher_classes tc
    WHERE tc.teacher_id = auth.uid() AND tc.class_id = students.class_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM teacher_classes tc
    WHERE tc.teacher_id = auth.uid() AND tc.class_id = students.class_id
  ));

-- 4. WARN: Recreate quiz_questions_student view with security_invoker
DROP VIEW IF EXISTS public.quiz_questions_student;
CREATE VIEW public.quiz_questions_student
WITH (security_invoker = true) AS
  SELECT
    id,
    activity_id,
    question_text,
    question_type,
    options,
    image_url,
    sort_order
  FROM public.quiz_questions;
