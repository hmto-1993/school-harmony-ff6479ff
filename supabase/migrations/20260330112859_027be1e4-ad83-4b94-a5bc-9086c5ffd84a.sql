
DROP POLICY IF EXISTS "Authenticated can insert parent_messages with valid student" ON public.parent_messages;
CREATE POLICY "Authenticated can insert parent_messages with valid student"
ON public.parent_messages FOR INSERT
TO authenticated
WITH CHECK (
  length(body) <= 2000
  AND length(subject) <= 500
  AND length(parent_name) <= 200
  AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_classes tc ON tc.class_id = s.class_id
      WHERE s.id = parent_messages.student_id
        AND tc.teacher_id = auth.uid()
    )
  )
);
