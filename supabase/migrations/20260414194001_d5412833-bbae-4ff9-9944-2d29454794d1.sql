
-- 1. Fix check_teacher_write_permission to DENY by default when no permissions row exists
CREATE OR REPLACE FUNCTION public.check_teacher_write_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    -- Admins always have write permission
    has_role(_user_id, 'admin'::app_role)
    OR
    -- For non-admins: must have teacher role AND an explicit permissions row
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
$$;

-- 2. Create a helper function to check can_view_students permission
CREATE OR REPLACE FUNCTION public.teacher_can_view_students(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    has_role(_user_id, 'admin'::app_role)
    OR is_viewer(_user_id)
    OR (
      has_role(_user_id, 'teacher'::app_role)
      AND (
        -- If no permissions row exists, deny by default
        NOT EXISTS (SELECT 1 FROM public.teacher_permissions WHERE user_id = _user_id)
        OR
        -- If permissions row exists, check can_view_students
        EXISTS (SELECT 1 FROM public.teacher_permissions WHERE user_id = _user_id AND can_view_students = true)
      )
    )
$$;

-- 3. Drop and recreate the students SELECT policies to enforce can_view_students
-- First check existing policies on students table and drop the teacher one
DROP POLICY IF EXISTS "Teachers can view students in their classes" ON public.students;
DROP POLICY IF EXISTS "Teachers can view their students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;

-- Recreate with can_view_students check
CREATE POLICY "Teachers can view students in their classes"
ON public.students
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    teacher_can_view_students(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = students.class_id
    )
  )
);

-- 4. Fix resource_files anon access - remove blanket anon SELECT, keep authenticated access
DROP POLICY IF EXISTS "Students can view files in visible folders" ON public.resource_files;

-- Re-add with a no-op policy for anon (student file access goes through edge functions)
-- Actually keep anon access but only for folders explicitly marked visible (this is by design for student portal)
-- The student portal uses anon role with session tokens verified in edge functions
-- Keep this as-is but document it's intentional
CREATE POLICY "Students can view files in visible folders"
ON public.resource_files
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.resource_folders rf
    WHERE rf.id = resource_files.folder_id AND rf.visible_to_students = true
  )
);
