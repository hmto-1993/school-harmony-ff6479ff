
-- Drop overly permissive anonymous policies on push_subscriptions
DROP POLICY IF EXISTS "Anyone can read push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can delete own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can insert push subscriptions" ON public.push_subscriptions;

-- Only authenticated staff (admin/teacher) can read subscriptions
CREATE POLICY "Authenticated can view push_subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert their own subscriptions
CREATE POLICY "Authenticated can insert push_subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can delete their own subscriptions (scoped by endpoint match is handled app-side)
CREATE POLICY "Authenticated can delete own push_subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING (true);
