-- Update site_settings allowlist to include print_header_config keys
DROP POLICY IF EXISTS "Public can read safe settings" ON public.site_settings;
CREATE POLICY "Public can read safe settings"
  ON public.site_settings FOR SELECT TO public
  USING (id IN (
    'school_name',
    'school_logo_url', 
    'print_header',
    'print_header_config',
    'print_header_config_attendance',
    'print_header_config_grades',
    'print_header_config_behavior',
    'print_header_config_student_logins',
    'quiz_color_mcq',
    'quiz_color_tf',
    'quiz_color_selected'
  ));