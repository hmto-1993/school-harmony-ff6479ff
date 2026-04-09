
-- Fix attendance_schedule_exceptions: add write permission guard to INSERT and UPDATE

DROP POLICY IF EXISTS "Teachers can insert schedule exceptions for their classes" ON public.attendance_schedule_exceptions;
CREATE POLICY "Teachers can insert schedule exceptions for their classes"
  ON public.attendance_schedule_exceptions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND check_teacher_write_permission(auth.uid(), 'write'::text)
    AND EXISTS (
      SELECT 1 FROM teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = attendance_schedule_exceptions.class_id
    )
  );

DROP POLICY IF EXISTS "Teachers can update own schedule exceptions for their classes" ON public.attendance_schedule_exceptions;
CREATE POLICY "Teachers can update own schedule exceptions for their classes"
  ON public.attendance_schedule_exceptions FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    AND check_teacher_write_permission(auth.uid(), 'write'::text)
    AND EXISTS (
      SELECT 1 FROM teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = attendance_schedule_exceptions.class_id
    )
  );
