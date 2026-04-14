CREATE OR REPLACE FUNCTION public.check_teacher_write_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.teacher_permissions tp
      WHERE tp.user_id = _user_id
        AND has_role(_user_id, 'teacher'::app_role)
        AND NOT tp.read_only_mode
        AND CASE _permission
          WHEN 'grades' THEN tp.can_manage_grades
          WHEN 'attendance' THEN tp.can_manage_attendance
          WHEN 'delete' THEN tp.can_delete_records
          WHEN 'write' THEN (
            tp.can_manage_grades
            OR tp.can_manage_attendance
            OR tp.can_send_notifications
          )
          ELSE false
        END
    )
$function$;

CREATE OR REPLACE FUNCTION public.teacher_can_view_student_in_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.teacher_permissions tp
      JOIN public.teacher_classes tc
        ON tc.teacher_id = tp.user_id
      WHERE tp.user_id = _user_id
        AND tp.can_view_students = true
        AND tc.class_id = _class_id
        AND (has_role(_user_id, 'teacher'::app_role) OR tp.read_only_mode = true)
    )
$function$;

DROP POLICY IF EXISTS "Teachers can view students in their classes" ON public.students;

CREATE POLICY "Teachers can view students in their classes"
ON public.students
FOR SELECT
TO authenticated
USING (public.teacher_can_view_student_in_class(auth.uid(), class_id));