
ALTER TABLE public.teacher_permissions
  ADD COLUMN can_view_reports boolean NOT NULL DEFAULT true,
  ADD COLUMN can_view_grades boolean NOT NULL DEFAULT true;
