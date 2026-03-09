-- Fix 1: Protect sensitive SMS settings from anon access
DROP POLICY IF EXISTS "Anyone can read site_settings" ON public.site_settings;

CREATE POLICY "Public can read non-sensitive settings" ON public.site_settings
  FOR SELECT TO public
  USING (id NOT IN ('sms_provider_api_key', 'sms_provider_username', 'sms_provider_sender'));

CREATE POLICY "Admins can read all settings" ON public.site_settings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Remove anon INSERT policies on submissions tables
DROP POLICY IF EXISTS "Anon can insert submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Anon can insert file submissions" ON public.student_file_submissions;

-- Fix 3: Remove anon SELECT policies on submissions tables
DROP POLICY IF EXISTS "Anon can view submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Anon can view file submissions" ON public.student_file_submissions;