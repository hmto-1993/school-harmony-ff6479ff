-- Fix: Scope viewer access on student_file_submissions to assigned classes only
-- Replace is_viewer() with is_viewer_for_class() pattern

DROP POLICY IF EXISTS "Teachers can view file submissions for their classes" ON public.student_file_submissions;

CREATE POLICY "Teachers can view file submissions for their classes"
ON public.student_file_submissions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (EXISTS (
    SELECT 1 FROM activity_class_targets act
    JOIN teacher_classes tc ON tc.class_id = act.class_id
    WHERE act.activity_id = student_file_submissions.activity_id
      AND tc.teacher_id = auth.uid()
  ))
);
