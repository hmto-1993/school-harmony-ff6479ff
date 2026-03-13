
ALTER TABLE public.teacher_permissions 
ADD COLUMN IF NOT EXISTS can_view_attendance boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_view_activities boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_view_dashboard boolean NOT NULL DEFAULT true;
