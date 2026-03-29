
DROP POLICY IF EXISTS "Public can read safe settings" ON public.site_settings;

CREATE POLICY "Public can read safe settings"
ON public.site_settings
FOR SELECT
TO public
USING (
  id = ANY (ARRAY[
    'school_name'::text, 'school_subtitle'::text, 'school_logo_url'::text,
    'print_header'::text, 'print_header_config'::text,
    'print_header_config_attendance'::text, 'print_header_config_grades'::text,
    'print_header_config_behavior'::text, 'print_header_config_student_logins'::text,
    'quiz_color_mcq'::text, 'quiz_color_tf'::text, 'quiz_color_selected'::text,
    'dashboard_title'::text, 'show_hero_section'::text,
    'parent_welcome_message'::text, 'parent_welcome_enabled'::text,
    'parent_show_national_id'::text, 'parent_show_grades'::text,
    'parent_show_attendance'::text, 'parent_show_behavior'::text
  ])
);
