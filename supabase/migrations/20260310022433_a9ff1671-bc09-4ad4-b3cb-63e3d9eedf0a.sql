
-- 1. Remove anon access from teacher_activities and activity_class_targets
DROP POLICY IF EXISTS "Anon can view activities" ON public.teacher_activities;
DROP POLICY IF EXISTS "Anon can view targets anon" ON public.activity_class_targets;

-- 2. Fix class_schedules - scope to assigned teacher
DROP POLICY IF EXISTS "Authenticated can manage class_schedules" ON public.class_schedules;

CREATE POLICY "Admins can manage class_schedules"
  ON public.class_schedules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view their class_schedules"
  ON public.class_schedules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = class_schedules.class_id
    )
  );

CREATE POLICY "Teachers can manage their class_schedules"
  ON public.class_schedules FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = class_schedules.class_id
    )
  );

CREATE POLICY "Teachers can update their class_schedules"
  ON public.class_schedules FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = class_schedules.class_id
    )
  );

CREATE POLICY "Teachers can delete their class_schedules"
  ON public.class_schedules FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = class_schedules.class_id
    )
  );

-- 3. Fix attendance_schedule_exceptions - scope INSERT/UPDATE to assigned teacher
DROP POLICY IF EXISTS "Teachers can insert schedule exceptions" ON public.attendance_schedule_exceptions;
DROP POLICY IF EXISTS "Teachers can update own schedule exceptions" ON public.attendance_schedule_exceptions;
DROP POLICY IF EXISTS "Teachers can delete own schedule exceptions" ON public.attendance_schedule_exceptions;

CREATE POLICY "Teachers can insert schedule exceptions for their classes"
  ON public.attendance_schedule_exceptions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = attendance_schedule_exceptions.class_id
    )
  );

CREATE POLICY "Teachers can update own schedule exceptions for their classes"
  ON public.attendance_schedule_exceptions FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = attendance_schedule_exceptions.class_id
    )
  );

CREATE POLICY "Teachers can delete own schedule exceptions for their classes"
  ON public.attendance_schedule_exceptions FOR DELETE TO authenticated
  USING (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = attendance_schedule_exceptions.class_id
    )
  );

-- 4. Fix lesson_plans SELECT - scope to assigned teacher
DROP POLICY IF EXISTS "Authenticated can view lesson_plans" ON public.lesson_plans;
CREATE POLICY "Teachers can view lesson_plans for their classes"
  ON public.lesson_plans FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = lesson_plans.class_id
    )
  );
