DROP POLICY "Teachers can insert behavior records for their classes" ON public.behavior_records;

CREATE POLICY "Teachers and admins can insert behavior records"
ON public.behavior_records
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = recorded_by
  AND check_teacher_write_permission(auth.uid(), 'grades')
  AND (
    has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = behavior_records.class_id
    )
  )
);