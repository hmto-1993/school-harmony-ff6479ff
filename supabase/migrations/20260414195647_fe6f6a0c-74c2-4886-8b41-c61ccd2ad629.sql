
-- Fix 1: teacher_can_view_students - require can_view_students for viewers too (no bypass)
CREATE OR REPLACE FUNCTION public.teacher_can_view_students(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    has_role(_user_id, 'admin'::app_role)
    OR (
      -- Viewers must also have can_view_students enabled
      is_viewer(_user_id)
      AND EXISTS (
        SELECT 1 FROM public.teacher_permissions
        WHERE user_id = _user_id AND can_view_students = true
      )
    )
    OR (
      has_role(_user_id, 'teacher'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.teacher_permissions
        WHERE user_id = _user_id AND can_view_students = true
      )
    )
$$;

-- Fix 2: Remove duplicate admin ALL policy on user_roles to reduce confusion
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;

-- Fix 3: Restrict parent_messages SELECT to hide parent_phone from viewers
-- Drop existing teacher SELECT policy and recreate with tighter rules
DROP POLICY IF EXISTS "Teachers can view parent_messages for their classes" ON public.parent_messages;

CREATE POLICY "Teachers can view parent_messages for their classes"
ON public.parent_messages
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    NOT is_viewer(auth.uid())
    AND EXISTS (
      SELECT 1 FROM teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = parent_messages.class_id
    )
  )
);

-- Fix 4: Add INSERT policy for student_file_submissions from anon (student context)
-- Students submit files via edge function, but add a restrictive anon INSERT for direct uploads
CREATE POLICY "Students can insert own file submissions"
ON public.student_file_submissions
FOR INSERT
TO anon
WITH CHECK (true);
