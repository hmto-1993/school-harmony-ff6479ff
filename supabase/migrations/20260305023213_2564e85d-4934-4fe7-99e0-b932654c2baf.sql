
CREATE TABLE public.student_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  logged_in_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and teachers can view student_logins"
ON public.student_logins FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role can insert student_logins"
ON public.student_logins FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_student_logins_student_id ON public.student_logins(student_id);
CREATE INDEX idx_student_logins_class_id ON public.student_logins(class_id);
CREATE INDEX idx_student_logins_logged_in_at ON public.student_logins(logged_in_at);
