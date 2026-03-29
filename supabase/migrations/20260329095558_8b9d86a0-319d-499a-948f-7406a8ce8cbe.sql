
-- 1. Add explicit SELECT restriction on student_login_attempts (national_id + ip_address)
-- The ALL policy for admins already covers admin access, but we need to ensure
-- non-admin authenticated users cannot SELECT from this table.
CREATE POLICY "Deny non-admin select on student_login_attempts"
  ON public.student_login_attempts
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Restrict INSERT on student_logins to admins only (edge function uses service role)
CREATE POLICY "Only admins can insert student_logins"
  ON public.student_logins
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Restrict DELETE on student_logins to admins only
CREATE POLICY "Only admins can delete student_logins"
  ON public.student_logins
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
