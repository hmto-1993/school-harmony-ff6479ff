
CREATE TABLE public.popup_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  expiry timestamp with time zone,
  target_type text NOT NULL DEFAULT 'all',
  target_class_ids uuid[] DEFAULT '{}'::uuid[],
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.popup_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage popup_messages" ON public.popup_messages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read popup_messages" ON public.popup_messages
  FOR SELECT TO authenticated
  USING (true);
