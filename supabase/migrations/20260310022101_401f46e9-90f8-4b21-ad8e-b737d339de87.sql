
-- 1. students SELECT - restrict to assigned teachers
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;
CREATE POLICY "Teachers can view students in their classes"
  ON public.students FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = students.class_id
    )
  );

-- 2. excuse_submissions UPDATE - restrict to assigned teacher
DROP POLICY IF EXISTS "Authenticated can update excuse_submissions" ON public.excuse_submissions;
CREATE POLICY "Teachers can update excuse_submissions for their students"
  ON public.excuse_submissions FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_classes tc ON tc.class_id = s.class_id
      WHERE s.id = excuse_submissions.student_id AND tc.teacher_id = auth.uid()
    )
  );

-- 3. behavior_records SELECT - restrict to assigned teacher
DROP POLICY IF EXISTS "Authenticated users can view behavior records" ON public.behavior_records;
CREATE POLICY "Teachers can view behavior records for their classes"
  ON public.behavior_records FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = behavior_records.class_id
    )
  );

-- 4. push_subscriptions - scope properly
DROP POLICY IF EXISTS "Authenticated can view push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Authenticated can delete own push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Authenticated can insert push_subscriptions" ON public.push_subscriptions;

CREATE POLICY "Scoped view push_subscriptions"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR student_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      JOIN public.students s ON s.class_id = tc.class_id
      WHERE s.id = push_subscriptions.student_id AND tc.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Scoped delete push_subscriptions"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR student_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      JOIN public.students s ON s.class_id = tc.class_id
      WHERE s.id = push_subscriptions.student_id AND tc.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Auth can insert push_subscriptions"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (true);

-- 5. notifications SELECT
DROP POLICY IF EXISTS "Authenticated can view notifications" ON public.notifications;
CREATE POLICY "Teachers can view notifications for their students"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_classes tc ON tc.class_id = s.class_id
      WHERE s.id = notifications.student_id AND tc.teacher_id = auth.uid()
    )
  );

-- 6. grades SELECT
DROP POLICY IF EXISTS "Authenticated can view grades" ON public.grades;
CREATE POLICY "Teachers can view grades for their students"
  ON public.grades FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_classes tc ON tc.class_id = s.class_id
      WHERE s.id = grades.student_id AND tc.teacher_id = auth.uid()
    )
  );

-- 7. attendance_records SELECT
DROP POLICY IF EXISTS "Authenticated users can view attendance" ON public.attendance_records;
CREATE POLICY "Teachers can view attendance for their classes"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = attendance_records.class_id
    )
  );

-- 8. quiz_submissions SELECT
DROP POLICY IF EXISTS "Authenticated can view submissions" ON public.quiz_submissions;
CREATE POLICY "Teachers can view quiz submissions for their classes"
  ON public.quiz_submissions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.activity_class_targets act
      JOIN public.teacher_classes tc ON tc.class_id = act.class_id
      WHERE act.activity_id = quiz_submissions.activity_id AND tc.teacher_id = auth.uid()
    )
  );

-- 9. student_file_submissions SELECT
DROP POLICY IF EXISTS "Authenticated can view file submissions" ON public.student_file_submissions;
CREATE POLICY "Teachers can view file submissions for their classes"
  ON public.student_file_submissions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = student_file_submissions.class_id
    )
  );

-- 10. quiz_questions SELECT - teachers/admins only
DROP POLICY IF EXISTS "Authenticated can view questions" ON public.quiz_questions;
CREATE POLICY "Teachers and admins can view quiz questions"
  ON public.quiz_questions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.teacher_activities ta
      WHERE ta.id = quiz_questions.activity_id AND ta.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.activity_class_targets act
      JOIN public.teacher_classes tc ON tc.class_id = act.class_id
      WHERE act.activity_id = quiz_questions.activity_id AND tc.teacher_id = auth.uid()
    )
  );

-- 11. student_logins SELECT
DROP POLICY IF EXISTS "Admins and teachers can view student_logins" ON public.student_logins;
CREATE POLICY "Teachers can view student logins for their classes"
  ON public.student_logins FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = student_logins.class_id
    )
  );

-- 12. excuse_submissions SELECT
DROP POLICY IF EXISTS "Authenticated can view excuse_submissions" ON public.excuse_submissions;
CREATE POLICY "Teachers can view excuse_submissions for their students"
  ON public.excuse_submissions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_classes tc ON tc.class_id = s.class_id
      WHERE s.id = excuse_submissions.student_id AND tc.teacher_id = auth.uid()
    )
  );
