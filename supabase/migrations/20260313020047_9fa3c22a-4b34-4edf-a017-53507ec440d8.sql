
CREATE TABLE public.teacher_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  can_print boolean NOT NULL DEFAULT true,
  can_export boolean NOT NULL DEFAULT true,
  can_send_notifications boolean NOT NULL DEFAULT true,
  can_delete_records boolean NOT NULL DEFAULT true,
  can_manage_grades boolean NOT NULL DEFAULT true,
  can_manage_attendance boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.teacher_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all permissions
CREATE POLICY "Admins can manage teacher_permissions"
  ON public.teacher_permissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Teachers can view their own permissions
CREATE POLICY "Teachers can view own permissions"
  ON public.teacher_permissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
