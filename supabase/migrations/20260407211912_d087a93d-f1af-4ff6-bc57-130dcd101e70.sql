
DROP POLICY IF EXISTS "Public can read safe settings" ON public.site_settings;

CREATE POLICY "Public can read safe settings"
ON public.site_settings
FOR SELECT
TO public
USING (
  id = ANY (ARRAY[
    'school_name', 'school_subtitle', 'school_logo_url',
    'print_header', 'print_header_config', 'print_header_config_attendance',
    'print_header_config_grades', 'print_header_config_behavior',
    'print_header_config_student_logins',
    'quiz_color_mcq', 'quiz_color_tf', 'quiz_color_selected',
    'dashboard_title', 'show_hero_section',
    'parent_welcome_message', 'parent_welcome_enabled',
    'parent_show_national_id', 'parent_show_grades', 'parent_show_attendance',
    'parent_show_behavior', 'parent_show_honor_roll', 'parent_show_absence_warning',
    'parent_show_contact_teacher', 'latest_parent_message_notification',
    'parent_grades_default_view', 'parent_grades_show_percentage',
    'parent_grades_show_eval', 'parent_grades_visible_periods',
    'parent_grades_hidden_categories', 'parent_show_daily_grades',
    'parent_show_classwork_icons', 'parent_classwork_icons_count',
    'parent_show_library', 'parent_show_activities',
    'student_show_daily_grades', 'student_show_classwork_icons',
    'student_classwork_icons_count', 'parent_pdf_header',
    'admin_read_only', 'admin_primary_id',
    'student_show_grades', 'student_show_attendance', 'student_show_behavior',
    'student_hidden_categories',
    'student_show_activities', 'student_show_library',
    'student_show_honor_roll', 'student_show_absence_warning',
    'student_show_national_id'
  ])
);
