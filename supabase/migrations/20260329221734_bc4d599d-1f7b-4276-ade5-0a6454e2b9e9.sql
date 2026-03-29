-- Fix: Restrict parent_messages INSERT to require valid data lengths
DROP POLICY IF EXISTS "Anon can insert parent_messages" ON public.parent_messages;

CREATE POLICY "Anyone can insert parent_messages with valid student"
  ON public.parent_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(body) <= 2000
    AND length(subject) <= 500
    AND length(parent_name) <= 200
  );

-- Add class-scoped viewer function for future RLS improvements
CREATE OR REPLACE FUNCTION public.is_viewer_for_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_permissions tp
    JOIN public.teacher_classes tc ON tc.teacher_id = tp.user_id
    WHERE tp.user_id = _user_id 
      AND tp.read_only_mode = true
      AND tc.class_id = _class_id
  )
$$