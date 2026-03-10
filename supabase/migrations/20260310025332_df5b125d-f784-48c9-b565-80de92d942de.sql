-- Fix 1: behavior_records INSERT policy - restrict to teacher's classes
DROP POLICY IF EXISTS "Authenticated users can insert behavior records" ON public.behavior_records;
CREATE POLICY "Teachers can insert behavior records for their classes"
  ON public.behavior_records FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = recorded_by
    AND EXISTS (
      SELECT 1 FROM teacher_classes tc
      WHERE tc.teacher_id = auth.uid()
        AND tc.class_id = behavior_records.class_id
    )
  );

-- Fix 2: push_subscriptions SELECT - restrict non-admin users to own subscriptions
DROP POLICY IF EXISTS "Scoped view push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Scoped view push_subscriptions"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (student_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM teacher_classes tc
      JOIN students s ON s.class_id = tc.class_id
      WHERE s.id = push_subscriptions.student_id
        AND tc.teacher_id = auth.uid()
    ))
  );

-- Fix 3: push_subscriptions DELETE - also restrict
DROP POLICY IF EXISTS "Scoped delete push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Scoped delete push_subscriptions"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (student_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM teacher_classes tc
      JOIN students s ON s.class_id = tc.class_id
      WHERE s.id = push_subscriptions.student_id
        AND tc.teacher_id = auth.uid()
    ))
  );