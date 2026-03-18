-- 1. Remove the SELECT policy on push_subscriptions that exposes credentials to teachers
DROP POLICY IF EXISTS "Scoped view push_subscriptions" ON public.push_subscriptions;

-- Only admins need to read push_subscriptions (edge function uses service role key)
CREATE POLICY "Admins can view push_subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Revoke anon access to quiz_questions_student view
REVOKE ALL ON public.quiz_questions_student FROM anon;