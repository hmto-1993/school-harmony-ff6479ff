-- Fix: Restrict push_subscriptions INSERT to require teacher/admin role when student_id IS NULL
DROP POLICY IF EXISTS "Auth can insert push_subscriptions" ON public.push_subscriptions;

CREATE POLICY "Auth can insert push_subscriptions"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    -- Staff subscriptions: must be a teacher
    student_id IS NULL
    AND has_role(auth.uid(), 'teacher'::app_role)
  )
  OR (
    -- Student subscriptions: teacher must own the student's class
    student_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM teacher_classes tc
      JOIN students s ON s.class_id = tc.class_id
      WHERE s.id = push_subscriptions.student_id
        AND tc.teacher_id = auth.uid()
    )
  )
);