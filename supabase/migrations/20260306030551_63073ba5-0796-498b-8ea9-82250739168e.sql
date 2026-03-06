
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  user_type text NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert push subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can read push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (true);

CREATE POLICY "Anyone can delete own push subscriptions"
ON public.push_subscriptions FOR DELETE
USING (true);
