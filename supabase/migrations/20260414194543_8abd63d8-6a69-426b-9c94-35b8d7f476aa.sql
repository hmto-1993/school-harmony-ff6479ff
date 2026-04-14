
-- Fix teacher_can_view_students: deny when no permissions row exists
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
      AND EXISTS (
        SELECT 1 FROM public.teacher_permissions
        WHERE user_id = _user_id AND can_view_students = true
      )
    )
$$;
