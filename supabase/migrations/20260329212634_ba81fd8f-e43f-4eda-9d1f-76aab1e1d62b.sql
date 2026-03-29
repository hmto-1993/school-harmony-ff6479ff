DROP POLICY IF EXISTS "Public can read safe settings" ON public.site_settings;
CREATE POLICY "Public can read safe settings" ON public.site_settings
  FOR SELECT TO public
  USING (
    id = ANY (ARRAY[
      'school_name','school_subtitle','school_logo_url',
      'print_header','print_header_config',
      'print_header_config_attendance','print_header_config_grades',
      'print_header_config_behavior','print_header_config_student_logins',
      'quiz_color_mcq','quiz_color_tf','quiz_color_selected',
      'dashboard_title','show_hero_section',
      'parent_welcome_message','parent_welcome_enabled',
      'parent_show_national_id','parent_show_grades',
      'parent_show_attendance','parent_show_behavior',
      'parent_show_honor_roll','parent_show_absence_warning',
      'parent_show_contact_teacher',
      'latest_parent_message_notification'
    ])
  );