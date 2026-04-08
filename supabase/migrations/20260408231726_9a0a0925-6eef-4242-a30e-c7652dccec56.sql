
-- 1. Fix quiz_submissions anon SELECT: remove overly permissive policy, add scoped one
DROP POLICY IF EXISTS "Students can view own quiz submissions" ON public.quiz_submissions;
CREATE POLICY "Anon can view quiz submissions for visible activities"
  ON public.quiz_submissions FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_activities ta
      WHERE ta.id = quiz_submissions.activity_id AND ta.is_visible = true
    )
  );

-- 2. Fix check_teacher_write_permission: add role check to second branch
CREATE OR REPLACE FUNCTION public.check_teacher_write_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admins always have write permission
    has_role(_user_id, 'admin'::app_role)
    OR
    -- For non-admins: must have teacher role AND a permissions row that does NOT restrict them
    (
      has_role(_user_id, 'teacher'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.teacher_permissions
        WHERE user_id = _user_id
      )
      AND NOT EXISTS (
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
    )
    OR
    -- Teachers without a permissions row: allow by default
    (
      has_role(_user_id, 'teacher'::app_role)
      AND NOT EXISTS (
        SELECT 1 FROM public.teacher_permissions
        WHERE user_id = _user_id
      )
    )
$$;

-- 3. Fix viewer_write_bypass: add check_teacher_write_permission to affected INSERT/UPDATE policies

-- teacher_activities: add write guard to INSERT
DROP POLICY IF EXISTS "Teachers can insert activities" ON public.teacher_activities;
CREATE POLICY "Teachers can insert activities"
  ON public.teacher_activities FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND check_teacher_write_permission(auth.uid(), 'write'::text)
  );

-- teacher_activities: add write guard to UPDATE
DROP POLICY IF EXISTS "Teachers can update own activities" ON public.teacher_activities;
CREATE POLICY "Teachers can update own activities"
  ON public.teacher_activities FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    AND check_teacher_write_permission(auth.uid(), 'write'::text)
  );

-- timetable_slots: add write guard to INSERT
DROP POLICY IF EXISTS "Teachers can manage timetable_slots" ON public.timetable_slots;
CREATE POLICY "Teachers can manage timetable_slots"
  ON public.timetable_slots FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = timetable_slots.class_id)
    AND check_teacher_write_permission(auth.uid(), 'write'::text)
  );

-- timetable_slots: add write guard to UPDATE
DROP POLICY IF EXISTS "Teachers can update timetable_slots" ON public.timetable_slots;
CREATE POLICY "Teachers can update timetable_slots"
  ON public.timetable_slots FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = timetable_slots.class_id)
    AND check_teacher_write_permission(auth.uid(), 'write'::text)
  );

-- timetable_slots: add write guard to DELETE
DROP POLICY IF EXISTS "Teachers can delete timetable_slots" ON public.timetable_slots;
CREATE POLICY "Teachers can delete timetable_slots"
  ON public.timetable_slots FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = timetable_slots.class_id)
    AND check_teacher_write_permission(auth.uid(), 'delete'::text)
  );

-- popup_messages: add write guard (only admins should write, but ensure guard)
DROP POLICY IF EXISTS "Admins can manage popup_messages" ON public.popup_messages;
CREATE POLICY "Admins can manage popup_messages"
  ON public.popup_messages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
