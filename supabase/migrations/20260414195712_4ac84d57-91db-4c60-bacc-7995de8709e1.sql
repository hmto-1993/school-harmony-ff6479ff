
-- Fix overly permissive WITH CHECK (true) on student_file_submissions
DROP POLICY IF EXISTS "Students can insert own file submissions" ON public.student_file_submissions;

CREATE POLICY "Students can insert own file submissions"
ON public.student_file_submissions
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teacher_activities ta
    JOIN public.activity_class_targets act ON act.activity_id = ta.id
    WHERE ta.id = student_file_submissions.activity_id
      AND ta.is_visible = true
      AND act.allow_student_uploads = true
      AND act.class_id = student_file_submissions.class_id
  )
);
