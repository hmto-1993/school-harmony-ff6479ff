-- Add read_only_mode column
ALTER TABLE public.teacher_permissions ADD COLUMN IF NOT EXISTS read_only_mode boolean NOT NULL DEFAULT false;

-- Create viewer check function
CREATE OR REPLACE FUNCTION public.is_viewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_permissions
    WHERE user_id = _user_id AND read_only_mode = true
  )
$$;

-- Update SELECT policies to allow viewers

-- students
DROP POLICY IF EXISTS "Teachers can view students in their classes" ON public.students;
CREATE POLICY "Teachers can view students in their classes" ON public.students
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = students.class_id)
);

-- attendance_records
DROP POLICY IF EXISTS "Teachers can view attendance for their classes" ON public.attendance_records;
CREATE POLICY "Teachers can view attendance for their classes" ON public.attendance_records
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = attendance_records.class_id)
);

-- grades
DROP POLICY IF EXISTS "Teachers can view grades for their students" ON public.grades;
CREATE POLICY "Teachers can view grades for their students" ON public.grades
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR EXISTS (SELECT 1 FROM students s JOIN teacher_classes tc ON tc.class_id = s.class_id WHERE s.id = grades.student_id AND tc.teacher_id = auth.uid())
);

-- behavior_records
DROP POLICY IF EXISTS "Teachers can view behavior records for their classes" ON public.behavior_records;
CREATE POLICY "Teachers can view behavior records for their classes" ON public.behavior_records
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = behavior_records.class_id)
);

-- notifications
DROP POLICY IF EXISTS "Teachers can view notifications for their students" ON public.notifications;
CREATE POLICY "Teachers can view notifications for their students" ON public.notifications
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM students s JOIN teacher_classes tc ON tc.class_id = s.class_id WHERE s.id = notifications.student_id AND tc.teacher_id = auth.uid())
);

-- lesson_plans
DROP POLICY IF EXISTS "Teachers can view lesson_plans for their classes" ON public.lesson_plans;
CREATE POLICY "Teachers can view lesson_plans for their classes" ON public.lesson_plans
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = lesson_plans.class_id)
);

-- manual_category_scores
DROP POLICY IF EXISTS "Teachers can view manual_category_scores" ON public.manual_category_scores;
CREATE POLICY "Teachers can view manual_category_scores" ON public.manual_category_scores
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR EXISTS (SELECT 1 FROM students s JOIN teacher_classes tc ON tc.class_id = s.class_id WHERE s.id = manual_category_scores.student_id AND tc.teacher_id = auth.uid())
);

-- quiz_submissions
DROP POLICY IF EXISTS "Teachers can view quiz submissions for their classes" ON public.quiz_submissions;
CREATE POLICY "Teachers can view quiz submissions for their classes" ON public.quiz_submissions
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR EXISTS (SELECT 1 FROM activity_class_targets act JOIN teacher_classes tc ON tc.class_id = act.class_id WHERE act.activity_id = quiz_submissions.activity_id AND tc.teacher_id = auth.uid())
);

-- student_file_submissions
DROP POLICY IF EXISTS "Teachers can view file submissions for their classes" ON public.student_file_submissions;
CREATE POLICY "Teachers can view file submissions for their classes" ON public.student_file_submissions
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = student_file_submissions.class_id)
);

-- student_logins
DROP POLICY IF EXISTS "Teachers can view student logins for their classes" ON public.student_logins;
CREATE POLICY "Teachers can view student logins for their classes" ON public.student_logins
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = student_logins.class_id)
);

-- excuse_submissions
DROP POLICY IF EXISTS "Teachers can view excuse_submissions for their students" ON public.excuse_submissions;
CREATE POLICY "Teachers can view excuse_submissions for their students" ON public.excuse_submissions
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR EXISTS (SELECT 1 FROM students s JOIN teacher_classes tc ON tc.class_id = s.class_id WHERE s.id = excuse_submissions.student_id AND tc.teacher_id = auth.uid())
);

-- resource_folders
DROP POLICY IF EXISTS "Scoped view resource_folders" ON public.resource_folders;
CREATE POLICY "Scoped view resource_folders" ON public.resource_folders
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = resource_folders.class_id)
  OR (class_id IS NULL AND visible_to_students = true)
);

-- resource_files
DROP POLICY IF EXISTS "Scoped view resource_files" ON public.resource_files;
CREATE POLICY "Scoped view resource_files" ON public.resource_files
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR EXISTS (SELECT 1 FROM resource_folders rf WHERE rf.id = resource_files.folder_id AND rf.created_by = auth.uid())
  OR EXISTS (SELECT 1 FROM resource_folders rf JOIN teacher_classes tc ON tc.class_id = rf.class_id WHERE rf.id = resource_files.folder_id AND tc.teacher_id = auth.uid())
);

-- teacher_activities (scoped view)
DROP POLICY IF EXISTS "Scoped view teacher_activities" ON public.teacher_activities;
CREATE POLICY "Scoped view teacher_activities" ON public.teacher_activities
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_viewer(auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM activity_class_targets act JOIN teacher_classes tc ON tc.class_id = act.class_id WHERE act.activity_id = teacher_activities.id AND tc.teacher_id = auth.uid())
);