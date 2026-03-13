
CREATE TABLE public.staff_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address text,
  logged_in_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all staff_logins"
  ON public.staff_logins FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert own staff_logins"
  ON public.staff_logins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
