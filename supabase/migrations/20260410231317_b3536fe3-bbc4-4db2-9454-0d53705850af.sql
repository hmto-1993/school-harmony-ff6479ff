
-- Drop the old permissive INSERT policy that allowed client-side inserts
DROP POLICY IF EXISTS "Auth can insert push_subscriptions" ON public.push_subscriptions;

-- Create a new restrictive INSERT policy: only admins can insert directly
-- (Edge function uses service_role which bypasses RLS)
CREATE POLICY "Only admins can insert push_subscriptions"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
