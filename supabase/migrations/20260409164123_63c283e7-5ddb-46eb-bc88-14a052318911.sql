-- 1. Fix quiz_submissions anon SELECT: scope to student's own submissions only
DROP POLICY IF EXISTS "Anon can view own quiz submissions for visible activities" ON public.quiz_submissions;

CREATE POLICY "Anon can view own quiz submissions for visible activities"
ON public.quiz_submissions
FOR SELECT
TO anon
USING (false);

-- 2. Remove attendance_records from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.attendance_records;