-- Remove overly permissive anon policies on excuse_submissions
DROP POLICY IF EXISTS "Anyone can insert excuse_submissions" ON public.excuse_submissions;
DROP POLICY IF EXISTS "Anyone can view excuse_submissions" ON public.excuse_submissions;

-- Allow authenticated users (teachers/admins) to view excuse submissions
CREATE POLICY "Authenticated can view excuse_submissions"
ON public.excuse_submissions
FOR SELECT
TO authenticated
USING (true);

-- No direct client INSERT - submissions go through the submit-excuse edge function using service role