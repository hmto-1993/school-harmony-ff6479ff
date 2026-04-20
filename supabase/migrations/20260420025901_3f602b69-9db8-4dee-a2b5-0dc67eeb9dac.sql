-- 1) student_login_attempts: deny all client INSERTs; service role bypasses RLS
DROP POLICY IF EXISTS "deny_client_insert_login_attempts" ON public.student_login_attempts;
CREATE POLICY "deny_client_insert_login_attempts"
  ON public.student_login_attempts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

-- 2) student_file_submissions: deny all client INSERTs; uploads go through edge function
DROP POLICY IF EXISTS "deny_client_insert_file_submissions" ON public.student_file_submissions;
CREATE POLICY "deny_client_insert_file_submissions"
  ON public.student_file_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);