
-- Fix: teacher_classes assignments should not be visible to all authenticated users
-- Teachers should only see their own assignments, admins see all

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage teacher_classes" ON public.teacher_classes;
DROP POLICY IF EXISTS "Authenticated users can view teacher_classes" ON public.teacher_classes;

-- Admins can manage all (using authenticated role)
CREATE POLICY "Admins can manage teacher_classes"
ON public.teacher_classes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can only see their own class assignments
CREATE POLICY "Teachers can view own teacher_classes"
ON public.teacher_classes FOR SELECT TO authenticated
USING (teacher_id = auth.uid());
