-- 1. Make activities bucket private
UPDATE storage.buckets SET public = false WHERE id = 'activities';

-- 2. Fix push_subscriptions always-true INSERT policy
DROP POLICY IF EXISTS "Auth can insert push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Auth can insert push_subscriptions"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR student_id IS NULL
    OR EXISTS (
      SELECT 1 FROM teacher_classes tc
      JOIN students s ON s.class_id = tc.class_id
      WHERE s.id = push_subscriptions.student_id
        AND tc.teacher_id = auth.uid()
    )
  );