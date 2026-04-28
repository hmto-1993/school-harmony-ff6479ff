-- 1) Restrict email queue SECURITY DEFINER functions to service_role only
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq, extensions;

-- 2) Allow admins to read & delete email_send_log
CREATE POLICY "Admins can read email_send_log"
  ON public.email_send_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete email_send_log"
  ON public.email_send_log
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Restrict student_login_attempts to primary owner only
DROP POLICY IF EXISTS "Deny non-admin select on student_login_attempts" ON public.student_login_attempts;
DROP POLICY IF EXISTS "Admins can manage student_login_attempts" ON public.student_login_attempts;

CREATE POLICY "Primary owner can read login attempts"
  ON public.student_login_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.site_settings WHERE id = 'admin_primary_id' AND value = auth.uid()::text)
  );

CREATE POLICY "Primary owner can delete login attempts"
  ON public.student_login_attempts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.site_settings WHERE id = 'admin_primary_id' AND value = auth.uid()::text)
  );

CREATE POLICY "Primary owner can update login attempts"
  ON public.student_login_attempts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.site_settings WHERE id = 'admin_primary_id' AND value = auth.uid()::text)
  );