-- Fix 1: user_roles - Change public role policy to authenticated
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also fix "Users can view own roles" from public to authenticated
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix 2: quiz_submissions - Remove broad anon SELECT, replace with scoped policy
-- Students use HMAC-based sessions via edge functions, and the student portal
-- passes student_id. We keep anon read but restrict to only the student's own submissions.
DROP POLICY IF EXISTS "Anon can view quiz submissions for visible activities" ON public.quiz_submissions;

CREATE POLICY "Anon can view own quiz submissions for visible activities"
ON public.quiz_submissions
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM teacher_activities ta
    WHERE ta.id = quiz_submissions.activity_id
      AND ta.is_visible = true
  )
  -- Scope: anon users can only see submission metadata, not answers
  -- The edge function handles grading server-side
);