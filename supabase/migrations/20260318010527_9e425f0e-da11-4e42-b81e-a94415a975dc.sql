-- Fix overly permissive RLS policies: change role from {public} to {authenticated}

-- resource_folders
DROP POLICY IF EXISTS "Teachers can insert resource_folders" ON public.resource_folders;
CREATE POLICY "Teachers can insert resource_folders" ON public.resource_folders FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Teachers can update own resource_folders" ON public.resource_folders;
CREATE POLICY "Teachers can update own resource_folders" ON public.resource_folders FOR UPDATE TO authenticated USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete own resource_folders" ON public.resource_folders;
CREATE POLICY "Teachers can delete own resource_folders" ON public.resource_folders FOR DELETE TO authenticated USING (created_by = auth.uid());

-- resource_files
DROP POLICY IF EXISTS "Teachers can insert resource_files" ON public.resource_files;
CREATE POLICY "Teachers can insert resource_files" ON public.resource_files FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM resource_folders rf WHERE rf.id = resource_files.folder_id AND rf.created_by = auth.uid()));

DROP POLICY IF EXISTS "Teachers can delete resource_files" ON public.resource_files;
CREATE POLICY "Teachers can delete resource_files" ON public.resource_files FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM resource_folders rf WHERE rf.id = resource_files.folder_id AND rf.created_by = auth.uid()));

-- academic_calendar
DROP POLICY IF EXISTS "Teachers can insert academic_calendar" ON public.academic_calendar;
CREATE POLICY "Teachers can insert academic_calendar" ON public.academic_calendar FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Teachers can update own academic_calendar" ON public.academic_calendar;
CREATE POLICY "Teachers can update own academic_calendar" ON public.academic_calendar FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- user_roles
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage user_roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- behavior_records
DROP POLICY IF EXISTS "Authenticated users can update their behavior records" ON public.behavior_records;
CREATE POLICY "Authenticated users can update their behavior records" ON public.behavior_records FOR UPDATE TO authenticated USING (auth.uid() = recorded_by);

DROP POLICY IF EXISTS "Authenticated users can delete their behavior records" ON public.behavior_records;
CREATE POLICY "Authenticated users can delete their behavior records" ON public.behavior_records FOR DELETE TO authenticated USING (auth.uid() = recorded_by);

-- grade_categories
DROP POLICY IF EXISTS "Admins can manage grade_categories" ON public.grade_categories;
CREATE POLICY "Admins can manage grade_categories" ON public.grade_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- attendance_records
DROP POLICY IF EXISTS "Admins can manage attendance" ON public.attendance_records;
CREATE POLICY "Admins can manage attendance" ON public.attendance_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- notifications
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- manual_category_scores
DROP POLICY IF EXISTS "Admins can manage manual_category_scores" ON public.manual_category_scores;
CREATE POLICY "Admins can manage manual_category_scores" ON public.manual_category_scores FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- excuse_submissions
DROP POLICY IF EXISTS "Admins can manage excuse_submissions" ON public.excuse_submissions;
CREATE POLICY "Admins can manage excuse_submissions" ON public.excuse_submissions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- attendance_schedule_exceptions
DROP POLICY IF EXISTS "Admins can manage all schedule exceptions" ON public.attendance_schedule_exceptions;
CREATE POLICY "Admins can manage all schedule exceptions" ON public.attendance_schedule_exceptions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins manage resource_folders
DROP POLICY IF EXISTS "Admins can manage resource_folders" ON public.resource_folders;
CREATE POLICY "Admins can manage resource_folders" ON public.resource_folders FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins manage resource_files
DROP POLICY IF EXISTS "Admins can manage resource_files" ON public.resource_files;
CREATE POLICY "Admins can manage resource_files" ON public.resource_files FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins manage academic_calendar
DROP POLICY IF EXISTS "Admins can manage academic_calendar" ON public.academic_calendar;
CREATE POLICY "Admins can manage academic_calendar" ON public.academic_calendar FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins manage students
DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
CREATE POLICY "Admins can manage students" ON public.students FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins manage classes
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins manage grades
DROP POLICY IF EXISTS "Admins can manage grades" ON public.grades;
CREATE POLICY "Admins can manage grades" ON public.grades FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));