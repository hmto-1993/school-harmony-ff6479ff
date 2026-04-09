-- Fix: Scope anon SELECT on activity_class_targets to only visible activities
DROP POLICY IF EXISTS "Students can view activity targets" ON public.activity_class_targets;

CREATE POLICY "Students can view activity targets"
ON public.activity_class_targets
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_activities ta
    WHERE ta.id = activity_class_targets.activity_id
      AND ta.is_visible = true
  )
);