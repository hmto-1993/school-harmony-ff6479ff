
-- ============================================================
-- Role-Based Access Control Layer (on top of tenant isolation)
-- ============================================================

-- Helper: check if the user's org role is in a given set
CREATE OR REPLACE FUNCTION public.user_has_org_role_in(_user_id uuid, _roles public.org_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- Helper: check if a teacher owns/teaches a given class via teacher_classes
CREATE OR REPLACE FUNCTION public.teacher_teaches_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_classes
    WHERE teacher_id = _user_id AND class_id = _class_id
  )
$$;

-- Helper: check if a teacher teaches the class containing a given student
CREATE OR REPLACE FUNCTION public.teacher_teaches_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.teacher_classes tc ON tc.class_id = s.class_id
    WHERE s.id = _student_id AND tc.teacher_id = _user_id
  )
$$;

-- ============================================================
-- CLASSES: restrict teachers to their own classes; block students/parents writes
-- ============================================================
DROP POLICY IF EXISTS rbac_classes_select ON public.classes;
CREATE POLICY rbac_classes_select ON public.classes
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher' AND public.teacher_teaches_class(auth.uid(), id))
  OR public.get_user_org_role(auth.uid()) IN ('student','parent')
);

DROP POLICY IF EXISTS rbac_classes_write ON public.classes;
CREATE POLICY rbac_classes_write ON public.classes
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[]));

DROP POLICY IF EXISTS rbac_classes_update ON public.classes;
CREATE POLICY rbac_classes_update ON public.classes
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[]))
WITH CHECK (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[]));

DROP POLICY IF EXISTS rbac_classes_delete ON public.classes;
CREATE POLICY rbac_classes_delete ON public.classes
AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- ============================================================
-- STUDENTS: teachers only see/edit students in their classes
-- ============================================================
DROP POLICY IF EXISTS rbac_students_select ON public.students;
CREATE POLICY rbac_students_select ON public.students
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND class_id IS NOT NULL
      AND public.teacher_teaches_class(auth.uid(), class_id))
  OR public.get_user_org_role(auth.uid()) IN ('student','parent')
);

DROP POLICY IF EXISTS rbac_students_insert ON public.students;
CREATE POLICY rbac_students_insert ON public.students
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[]));

DROP POLICY IF EXISTS rbac_students_update ON public.students;
CREATE POLICY rbac_students_update ON public.students
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND class_id IS NOT NULL
      AND public.teacher_teaches_class(auth.uid(), class_id))
)
WITH CHECK (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND class_id IS NOT NULL
      AND public.teacher_teaches_class(auth.uid(), class_id))
);

DROP POLICY IF EXISTS rbac_students_delete ON public.students;
CREATE POLICY rbac_students_delete ON public.students
AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- ============================================================
-- GRADES: teachers only on their students; students/parents read-only
-- ============================================================
DROP POLICY IF EXISTS rbac_grades_select ON public.grades;
CREATE POLICY rbac_grades_select ON public.grades
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_student(auth.uid(), student_id))
  OR public.get_user_org_role(auth.uid()) IN ('student','parent')
);

DROP POLICY IF EXISTS rbac_grades_insert ON public.grades;
CREATE POLICY rbac_grades_insert ON public.grades
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_student(auth.uid(), student_id))
);

DROP POLICY IF EXISTS rbac_grades_update ON public.grades;
CREATE POLICY rbac_grades_update ON public.grades
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_student(auth.uid(), student_id))
)
WITH CHECK (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_student(auth.uid(), student_id))
);

DROP POLICY IF EXISTS rbac_grades_delete ON public.grades;
CREATE POLICY rbac_grades_delete ON public.grades
AS RESTRICTIVE FOR DELETE TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_student(auth.uid(), student_id))
);

-- ============================================================
-- ATTENDANCE_RECORDS: same pattern
-- ============================================================
DROP POLICY IF EXISTS rbac_attendance_select ON public.attendance_records;
CREATE POLICY rbac_attendance_select ON public.attendance_records
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_class(auth.uid(), class_id))
  OR public.get_user_org_role(auth.uid()) IN ('student','parent')
);

DROP POLICY IF EXISTS rbac_attendance_insert ON public.attendance_records;
CREATE POLICY rbac_attendance_insert ON public.attendance_records
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_class(auth.uid(), class_id))
);

DROP POLICY IF EXISTS rbac_attendance_update ON public.attendance_records;
CREATE POLICY rbac_attendance_update ON public.attendance_records
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_class(auth.uid(), class_id))
)
WITH CHECK (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_class(auth.uid(), class_id))
);

DROP POLICY IF EXISTS rbac_attendance_delete ON public.attendance_records;
CREATE POLICY rbac_attendance_delete ON public.attendance_records
AS RESTRICTIVE FOR DELETE TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_class(auth.uid(), class_id))
);

-- ============================================================
-- BEHAVIOR_RECORDS: same pattern
-- ============================================================
DROP POLICY IF EXISTS rbac_behavior_select ON public.behavior_records;
CREATE POLICY rbac_behavior_select ON public.behavior_records
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_class(auth.uid(), class_id))
  OR public.get_user_org_role(auth.uid()) IN ('student','parent')
);

DROP POLICY IF EXISTS rbac_behavior_insert ON public.behavior_records;
CREATE POLICY rbac_behavior_insert ON public.behavior_records
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_class(auth.uid(), class_id))
);

DROP POLICY IF EXISTS rbac_behavior_update ON public.behavior_records;
CREATE POLICY rbac_behavior_update ON public.behavior_records
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_class(auth.uid(), class_id))
)
WITH CHECK (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_class(auth.uid(), class_id))
);

DROP POLICY IF EXISTS rbac_behavior_delete ON public.behavior_records;
CREATE POLICY rbac_behavior_delete ON public.behavior_records
AS RESTRICTIVE FOR DELETE TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_class(auth.uid(), class_id))
);

-- ============================================================
-- NOTIFICATIONS: students/parents read-only; teachers limited to their students
-- ============================================================
DROP POLICY IF EXISTS rbac_notifications_select ON public.notifications;
CREATE POLICY rbac_notifications_select ON public.notifications
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_student(auth.uid(), student_id))
  OR public.get_user_org_role(auth.uid()) IN ('student','parent')
);

DROP POLICY IF EXISTS rbac_notifications_insert ON public.notifications;
CREATE POLICY rbac_notifications_insert ON public.notifications
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_student(auth.uid(), student_id))
);

DROP POLICY IF EXISTS rbac_notifications_update ON public.notifications;
CREATE POLICY rbac_notifications_update ON public.notifications
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_student(auth.uid(), student_id))
)
WITH CHECK (
  public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[])
  OR (public.get_user_org_role(auth.uid()) = 'teacher'
      AND public.teacher_teaches_student(auth.uid(), student_id))
);

DROP POLICY IF EXISTS rbac_notifications_delete ON public.notifications;
CREATE POLICY rbac_notifications_delete ON public.notifications
AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.user_has_org_role_in(auth.uid(), ARRAY['owner','admin']::public.org_role[]));
