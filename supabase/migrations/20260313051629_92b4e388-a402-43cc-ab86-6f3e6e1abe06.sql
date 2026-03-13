
CREATE TABLE public.shared_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  teacher_id uuid NOT NULL,
  class_ids uuid[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  can_print boolean NOT NULL DEFAULT true,
  can_export boolean NOT NULL DEFAULT true,
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage own shared_views"
  ON public.shared_views FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Admins can manage all shared_views"
  ON public.shared_views FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));
