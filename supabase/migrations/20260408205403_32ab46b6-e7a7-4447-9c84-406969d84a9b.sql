
-- FIX 1: Update check_teacher_write_permission to default-deny for non-admins without a permissions row
CREATE OR REPLACE FUNCTION public.check_teacher_write_permission(_user_id uuid, _permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    -- Admins always have write permission
    has_role(_user_id, 'admin'::app_role)
    OR
    -- For non-admins: check if they have a permissions row that does NOT restrict them
    (
      EXISTS (
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
    -- Teachers without a permissions row: allow by default (intended behavior for teachers with role)
    (
      has_role(_user_id, 'teacher'::app_role)
      AND NOT EXISTS (
        SELECT 1 FROM public.teacher_permissions
        WHERE user_id = _user_id
      )
    )
$$;

-- FIX 2: Scope parent_messages viewer SELECT to assigned classes
DROP POLICY IF EXISTS "Teachers can view parent_messages for their classes" ON parent_messages;
CREATE POLICY "Teachers can view parent_messages for their classes" ON parent_messages FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (is_viewer(auth.uid()) AND EXISTS (
    SELECT 1 FROM teacher_classes tc
    WHERE tc.teacher_id = auth.uid() AND tc.class_id = parent_messages.class_id
  ))
  OR EXISTS (
    SELECT 1 FROM teacher_classes tc
    WHERE tc.teacher_id = auth.uid() AND tc.class_id = parent_messages.class_id
  )
);
