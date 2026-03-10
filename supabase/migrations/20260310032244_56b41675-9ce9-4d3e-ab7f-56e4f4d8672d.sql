
-- 1. Fix quiz_questions_student view: recreate with SECURITY INVOKER so underlying RLS applies
DROP VIEW IF EXISTS public.quiz_questions_student;
CREATE VIEW public.quiz_questions_student
WITH (security_invoker = true)
AS
SELECT
  id,
  activity_id,
  question_text,
  question_type,
  options,
  image_url,
  sort_order
FROM public.quiz_questions;

-- 2. Fix announcements: change anon read policy to authenticated only
DROP POLICY IF EXISTS "Anyone can read announcements" ON public.announcements;
CREATE POLICY "Authenticated can read announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (true);

-- 3. Fix site_settings: replace denylist with allowlist for public read
DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.site_settings;
CREATE POLICY "Public can read safe settings"
  ON public.site_settings FOR SELECT TO public
  USING (id IN (
    'school_name',
    'school_logo_url', 
    'print_header',
    'quiz_color_mcq',
    'quiz_color_tf',
    'quiz_color_selected'
  ));
