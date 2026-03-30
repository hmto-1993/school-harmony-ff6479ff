DROP POLICY IF EXISTS "Public can read safe settings" ON public.site_settings;
CREATE POLICY "Public can read safe settings" ON public.site_settings FOR SELECT TO public USING (
  id = ANY (ARRAY[
    'school_name'::text, 'school_subtitle'::text, 'school_logo_url'::text,
    'print_header'::text, 'print_header_config'::text, 'print_header_config_attendance'::text,
    'print_header_config_grades'::text, 'print_header_config_behavior'::text,
    'print_header_config_student_logins'::text,
    'quiz_color_mcq'::text, 'quiz_color_tf'::text, 'quiz_color_selected'::text,
    'dashboard_title'::text, 'show_hero_section'::text,
    'parent_welcome_message'::text, 'parent_welcome_enabled'::text,
    'parent_show_national_id'::text, 'parent_show_grades'::text,
    'parent_show_attendance'::text, 'parent_show_behavior'::text,
    'parent_show_honor_roll'::text, 'parent_show_absence_warning'::text,
    'parent_show_contact_teacher'::text,
    'latest_parent_message_notification'::text,
    'parent_grades_default_view'::text, 'parent_grades_show_percentage'::text,
    'parent_grades_show_eval'::text, 'parent_grades_visible_periods'::text,
    'parent_grades_hidden_categories'::text,
    'parent_show_daily_grades'::text,
    'parent_show_classwork_icons'::text,
    'parent_classwork_icons_count'::text
  ])
);