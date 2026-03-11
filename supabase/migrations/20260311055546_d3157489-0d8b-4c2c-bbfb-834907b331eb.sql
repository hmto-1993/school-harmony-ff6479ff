
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Teachers can insert notifications for their students"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.students s
        JOIN public.teacher_classes tc ON tc.class_id = s.class_id
        WHERE s.id = notifications.student_id
          AND tc.teacher_id = auth.uid()
      )
    )
  );
