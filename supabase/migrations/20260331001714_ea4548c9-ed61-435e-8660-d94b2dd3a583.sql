
-- Fix 1: Prevent teachers from reassigning students to different classes (class_id hijack)
-- Replace the UPDATE policy with one that prevents class_id changes
DROP POLICY IF EXISTS "Teachers can update students in their classes" ON public.students;

CREATE POLICY "Teachers can update students in their classes" ON public.students
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teacher_classes tc
    WHERE tc.teacher_id = auth.uid() AND tc.class_id = students.class_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teacher_classes tc
    WHERE tc.teacher_id = auth.uid() AND tc.class_id = students.class_id
  )
  -- Prevent class_id reassignment: new class_id must equal old class_id
  -- This is enforced via a trigger since WITH CHECK can't reference OLD
);

-- Create a trigger to prevent teachers from changing class_id
CREATE OR REPLACE FUNCTION public.prevent_teacher_class_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only admins can change class_id
  IF OLD.class_id IS DISTINCT FROM NEW.class_id THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      NEW.class_id := OLD.class_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_class_reassignment
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.prevent_teacher_class_reassignment();

-- Fix 2: Remove overly permissive reports bucket INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload reports" ON storage.objects;
