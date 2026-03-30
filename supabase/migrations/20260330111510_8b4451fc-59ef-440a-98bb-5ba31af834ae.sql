
-- 1. Trigger to prevent teachers from modifying PII on students table
CREATE OR REPLACE FUNCTION prevent_teacher_pii_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    NEW.national_id := OLD.national_id;
    NEW.parent_phone := OLD.parent_phone;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_student_pii
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION prevent_teacher_pii_update();

-- 2. Security definer function to check teacher write permissions
CREATE OR REPLACE FUNCTION public.check_teacher_write_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.teacher_permissions
    WHERE user_id = _user_id AND (
      read_only_mode = true
      OR (CASE _permission
        WHEN 'grades' THEN NOT can_manage_grades
        WHEN 'attendance' THEN NOT can_manage_attendance
        WHEN 'delete' THEN NOT can_delete_records
        ELSE false
      END)
    )
  )
$$;

-- 3. Update grades INSERT policy to check teacher permissions
DROP POLICY IF EXISTS "Teachers can insert grades" ON public.grades;
CREATE POLICY "Teachers can insert grades"
ON public.grades FOR INSERT
TO authenticated
WITH CHECK (
  (recorded_by = auth.uid())
  AND check_teacher_write_permission(auth.uid(), 'grades')
  AND (EXISTS (
    SELECT 1 FROM students s
    JOIN teacher_classes tc ON tc.class_id = s.class_id
    WHERE s.id = grades.student_id AND tc.teacher_id = auth.uid()
  ))
);

-- 4. Update grades UPDATE policy
DROP POLICY IF EXISTS "Teachers can update grades" ON public.grades;
CREATE POLICY "Teachers can update grades"
ON public.grades FOR UPDATE
TO authenticated
USING (
  (recorded_by = auth.uid())
  AND check_teacher_write_permission(auth.uid(), 'grades')
  AND (EXISTS (
    SELECT 1 FROM students s
    JOIN teacher_classes tc ON tc.class_id = s.class_id
    WHERE s.id = grades.student_id AND tc.teacher_id = auth.uid()
  ))
);

-- 5. Update attendance INSERT policy
DROP POLICY IF EXISTS "Teachers can insert attendance for their classes" ON public.attendance_records;
CREATE POLICY "Teachers can insert attendance for their classes"
ON public.attendance_records FOR INSERT
TO authenticated
WITH CHECK (
  (recorded_by = auth.uid())
  AND check_teacher_write_permission(auth.uid(), 'attendance')
  AND (EXISTS (
    SELECT 1 FROM teacher_classes tc
    WHERE tc.teacher_id = auth.uid() AND tc.class_id = attendance_records.class_id
  ))
);

-- 6. Update attendance UPDATE policy
DROP POLICY IF EXISTS "Teachers can update attendance for their classes" ON public.attendance_records;
CREATE POLICY "Teachers can update attendance for their classes"
ON public.attendance_records FOR UPDATE
TO authenticated
USING (
  (recorded_by = auth.uid())
  AND (date = CURRENT_DATE)
  AND check_teacher_write_permission(auth.uid(), 'attendance')
  AND (EXISTS (
    SELECT 1 FROM teacher_classes tc
    WHERE tc.teacher_id = auth.uid() AND tc.class_id = attendance_records.class_id
  ))
);

-- 7. Update behavior INSERT policy
DROP POLICY IF EXISTS "Teachers can insert behavior records for their classes" ON public.behavior_records;
CREATE POLICY "Teachers can insert behavior records for their classes"
ON public.behavior_records FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = recorded_by)
  AND check_teacher_write_permission(auth.uid(), 'grades')
  AND (EXISTS (
    SELECT 1 FROM teacher_classes tc
    WHERE tc.teacher_id = auth.uid() AND tc.class_id = behavior_records.class_id
  ))
);

-- 8. Update behavior UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update their behavior records" ON public.behavior_records;
CREATE POLICY "Authenticated users can update their behavior records"
ON public.behavior_records FOR UPDATE
TO authenticated
USING (
  (auth.uid() = recorded_by)
  AND check_teacher_write_permission(auth.uid(), 'grades')
);

-- 9. Update behavior DELETE policy
DROP POLICY IF EXISTS "Authenticated users can delete their behavior records" ON public.behavior_records;
CREATE POLICY "Authenticated users can delete their behavior records"
ON public.behavior_records FOR DELETE
TO authenticated
USING (
  (auth.uid() = recorded_by)
  AND check_teacher_write_permission(auth.uid(), 'delete')
);

-- 10. Update manual_category_scores INSERT policy
DROP POLICY IF EXISTS "Teachers can insert manual_category_scores" ON public.manual_category_scores;
CREATE POLICY "Teachers can insert manual_category_scores"
ON public.manual_category_scores FOR INSERT
TO authenticated
WITH CHECK (
  (recorded_by = auth.uid())
  AND check_teacher_write_permission(auth.uid(), 'grades')
  AND (EXISTS (
    SELECT 1 FROM students s
    JOIN teacher_classes tc ON tc.class_id = s.class_id
    WHERE s.id = manual_category_scores.student_id AND tc.teacher_id = auth.uid()
  ))
);

-- 11. Update manual_category_scores UPDATE policy
DROP POLICY IF EXISTS "Teachers can update manual_category_scores" ON public.manual_category_scores;
CREATE POLICY "Teachers can update manual_category_scores"
ON public.manual_category_scores FOR UPDATE
TO authenticated
USING (
  (recorded_by = auth.uid())
  AND check_teacher_write_permission(auth.uid(), 'grades')
  AND (EXISTS (
    SELECT 1 FROM students s
    JOIN teacher_classes tc ON tc.class_id = s.class_id
    WHERE s.id = manual_category_scores.student_id AND tc.teacher_id = auth.uid()
  ))
);

-- 12. Remove anon from parent_messages INSERT, restrict to authenticated only
DROP POLICY IF EXISTS "Anyone can insert parent_messages with valid student" ON public.parent_messages;
CREATE POLICY "Authenticated can insert parent_messages with valid student"
ON public.parent_messages FOR INSERT
TO authenticated
WITH CHECK (
  (length(body) <= 2000)
  AND (length(subject) <= 500)
  AND (length(parent_name) <= 200)
  AND (EXISTS (
    SELECT 1 FROM students s WHERE s.id = parent_messages.student_id
  ))
);
