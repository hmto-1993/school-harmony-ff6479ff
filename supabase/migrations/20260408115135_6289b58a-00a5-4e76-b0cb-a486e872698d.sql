
CREATE TABLE public.form_issued_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id text NOT NULL,
  form_title text NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  student_name text NOT NULL,
  class_name text NOT NULL DEFAULT '',
  field_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  issued_by uuid NOT NULL,
  issued_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.form_issued_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage form_issued_logs"
  ON public.form_issued_logs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can insert form_issued_logs"
  ON public.form_issued_logs FOR INSERT
  TO authenticated
  WITH CHECK (issued_by = auth.uid());

CREATE POLICY "Teachers can view own form_issued_logs"
  ON public.form_issued_logs FOR SELECT
  TO authenticated
  USING (issued_by = auth.uid() OR has_role(auth.uid(), 'admin'));
