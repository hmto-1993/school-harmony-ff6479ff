-- Remove overly permissive INSERT policy on recovery_action_log.
-- All writes happen via service-role edge functions (e.g., forensic-extract-pdfs)
-- which bypass RLS. No client-side INSERT path exists.
DROP POLICY IF EXISTS "Authenticated insert recovery log" ON public.recovery_action_log;

-- Remove anon INSERT policy on student_file_submissions that did not verify
-- ownership of student_id. All file submissions are created server-side via
-- the upload-student-file edge function using the service role, which
-- authenticates the student via session token before inserting.
DROP POLICY IF EXISTS "Students can insert own file submissions" ON public.student_file_submissions;