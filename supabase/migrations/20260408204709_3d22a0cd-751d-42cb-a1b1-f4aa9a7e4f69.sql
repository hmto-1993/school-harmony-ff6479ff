
-- =============================================
-- FIX 1: Add write permission guard to all affected INSERT/UPDATE policies
-- =============================================

-- announcements INSERT
DROP POLICY IF EXISTS "Authenticated can insert announcements" ON announcements;
CREATE POLICY "Authenticated can insert announcements" ON announcements FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- announcements UPDATE
DROP POLICY IF EXISTS "Teachers can update own announcements" ON announcements;
CREATE POLICY "Teachers can update own announcements" ON announcements FOR UPDATE TO authenticated
USING (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- academic_calendar INSERT
DROP POLICY IF EXISTS "Teachers can insert academic_calendar" ON academic_calendar;
CREATE POLICY "Teachers can insert academic_calendar" ON academic_calendar FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- academic_calendar UPDATE
DROP POLICY IF EXISTS "Teachers can update own academic_calendar" ON academic_calendar;
CREATE POLICY "Teachers can update own academic_calendar" ON academic_calendar FOR UPDATE TO authenticated
USING (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- teacher_activities INSERT
DROP POLICY IF EXISTS "Teachers can insert activities" ON teacher_activities;
CREATE POLICY "Teachers can insert activities" ON teacher_activities FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- teacher_activities UPDATE
DROP POLICY IF EXISTS "Teachers can update own activities" ON teacher_activities;
CREATE POLICY "Teachers can update own activities" ON teacher_activities FOR UPDATE TO authenticated
USING (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- lesson_plans INSERT
DROP POLICY IF EXISTS "Teachers can insert lesson_plans" ON lesson_plans;
CREATE POLICY "Teachers can insert lesson_plans" ON lesson_plans FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- lesson_plans UPDATE
DROP POLICY IF EXISTS "Teachers can update own lesson_plans" ON lesson_plans;
CREATE POLICY "Teachers can update own lesson_plans" ON lesson_plans FOR UPDATE TO authenticated
USING (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- resource_folders INSERT
DROP POLICY IF EXISTS "Teachers can insert resource_folders" ON resource_folders;
CREATE POLICY "Teachers can insert resource_folders" ON resource_folders FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- resource_folders UPDATE
DROP POLICY IF EXISTS "Teachers can update own resource_folders" ON resource_folders;
CREATE POLICY "Teachers can update own resource_folders" ON resource_folders FOR UPDATE TO authenticated
USING (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- resource_files INSERT
DROP POLICY IF EXISTS "Teachers can insert resource_files" ON resource_files;
CREATE POLICY "Teachers can insert resource_files" ON resource_files FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM resource_folders rf WHERE rf.id = resource_files.folder_id AND rf.created_by = auth.uid())
  AND check_teacher_write_permission(auth.uid(), 'write'::text)
);

-- timetable_slots INSERT
DROP POLICY IF EXISTS "Teachers can insert timetable_slots" ON timetable_slots;
CREATE POLICY "Teachers can insert timetable_slots" ON timetable_slots FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = timetable_slots.class_id)
  AND check_teacher_write_permission(auth.uid(), 'write'::text)
);

-- timetable_slots UPDATE
DROP POLICY IF EXISTS "Teachers can update timetable_slots" ON timetable_slots;
CREATE POLICY "Teachers can update timetable_slots" ON timetable_slots FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = timetable_slots.class_id)
  AND check_teacher_write_permission(auth.uid(), 'write'::text)
);

-- class_schedules INSERT
DROP POLICY IF EXISTS "Teachers can manage their class_schedules" ON class_schedules;
CREATE POLICY "Teachers can manage their class_schedules" ON class_schedules FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = class_schedules.class_id)
  AND check_teacher_write_permission(auth.uid(), 'write'::text)
);

-- class_schedules UPDATE
DROP POLICY IF EXISTS "Teachers can update their class_schedules" ON class_schedules;
CREATE POLICY "Teachers can update their class_schedules" ON class_schedules FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = class_schedules.class_id)
  AND check_teacher_write_permission(auth.uid(), 'write'::text)
);

-- custom_form_sections INSERT
DROP POLICY IF EXISTS "Users can insert own custom_form_sections" ON custom_form_sections;
CREATE POLICY "Users can insert own custom_form_sections" ON custom_form_sections FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- custom_form_sections UPDATE
DROP POLICY IF EXISTS "Users can update own custom_form_sections" ON custom_form_sections;
CREATE POLICY "Users can update own custom_form_sections" ON custom_form_sections FOR UPDATE TO authenticated
USING (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- custom_form_templates INSERT
DROP POLICY IF EXISTS "Users can insert own custom_form_templates" ON custom_form_templates;
CREATE POLICY "Users can insert own custom_form_templates" ON custom_form_templates FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- custom_form_templates UPDATE
DROP POLICY IF EXISTS "Users can update own custom_form_templates" ON custom_form_templates;
CREATE POLICY "Users can update own custom_form_templates" ON custom_form_templates FOR UPDATE TO authenticated
USING (created_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- form_issued_logs INSERT
DROP POLICY IF EXISTS "Teachers can insert form_issued_logs" ON form_issued_logs;
CREATE POLICY "Teachers can insert form_issued_logs" ON form_issued_logs FOR INSERT TO authenticated
WITH CHECK (issued_by = auth.uid() AND check_teacher_write_permission(auth.uid(), 'write'::text));

-- notifications INSERT
DROP POLICY IF EXISTS "Teachers can insert notifications for their students" ON notifications;
CREATE POLICY "Teachers can insert notifications for their students" ON notifications FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND check_teacher_write_permission(auth.uid(), 'write'::text)
  AND (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM students s JOIN teacher_classes tc ON tc.class_id = s.class_id
    WHERE s.id = notifications.student_id AND tc.teacher_id = auth.uid()
  ))
);

-- =============================================
-- FIX 2: Scope quiz_submissions viewer access to assigned classes
-- =============================================

DROP POLICY IF EXISTS "Teachers can view quiz submissions for their classes" ON quiz_submissions;
CREATE POLICY "Teachers can view quiz submissions for their classes" ON quiz_submissions FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (is_viewer(auth.uid()) AND EXISTS (
    SELECT 1 FROM activity_class_targets act
    JOIN teacher_classes tc ON tc.class_id = act.class_id
    WHERE act.activity_id = quiz_submissions.activity_id AND tc.teacher_id = auth.uid()
  ))
  OR EXISTS (
    SELECT 1 FROM activity_class_targets act
    JOIN teacher_classes tc ON tc.class_id = act.class_id
    WHERE act.activity_id = quiz_submissions.activity_id AND tc.teacher_id = auth.uid()
  )
);
