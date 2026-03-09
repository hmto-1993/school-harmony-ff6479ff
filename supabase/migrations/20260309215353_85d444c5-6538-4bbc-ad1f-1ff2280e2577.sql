DROP POLICY IF EXISTS "Anon can insert submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Anon can insert file submissions" ON public.student_file_submissions;
DROP POLICY IF EXISTS "Anon can view submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Anon can view file submissions" ON public.student_file_submissions;