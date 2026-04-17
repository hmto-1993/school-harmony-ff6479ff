
-- Composite indexes for tenant-scoped queries (org + most-filtered column)

CREATE INDEX IF NOT EXISTS idx_students_org_class
  ON public.students (organization_id, class_id);

CREATE INDEX IF NOT EXISTS idx_classes_org_grade
  ON public.classes (organization_id, grade);

CREATE INDEX IF NOT EXISTS idx_grades_org_student
  ON public.grades (organization_id, student_id);

CREATE INDEX IF NOT EXISTS idx_grades_org_date
  ON public.grades (organization_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_org_class_date
  ON public.attendance_records (organization_id, class_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_org_date
  ON public.attendance_records (organization_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_behavior_org_class_date
  ON public.behavior_records (organization_id, class_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_org_student
  ON public.notifications (organization_id, student_id);

-- Partial index: only unread notifications (very small + frequent query)
CREATE INDEX IF NOT EXISTS idx_notifications_org_unread
  ON public.notifications (organization_id, created_at DESC)
  WHERE is_read = false;

-- Speed up RBAC helper functions (teacher_teaches_*)
CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher
  ON public.teacher_classes (teacher_id, class_id);

CREATE INDEX IF NOT EXISTS idx_teacher_classes_class
  ON public.teacher_classes (class_id);

-- Speed up profile role lookups (used by every RLS check)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON public.profiles (user_id);

-- Update planner statistics
ANALYZE public.students;
ANALYZE public.classes;
ANALYZE public.grades;
ANALYZE public.attendance_records;
ANALYZE public.behavior_records;
ANALYZE public.notifications;
ANALYZE public.teacher_classes;
ANALYZE public.profiles;
