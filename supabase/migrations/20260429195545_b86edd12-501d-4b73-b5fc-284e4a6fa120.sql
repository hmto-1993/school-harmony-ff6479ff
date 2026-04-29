CREATE OR REPLACE FUNCTION public.is_public_site_setting(_setting_id text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT _setting_id = ANY (ARRAY[
    'school_name', 'school_subtitle', 'school_logo_url', 'education_department',
    'print_header', 'print_header_config', 'print_header_config_attendance',
    'print_header_config_grades', 'print_header_config_behavior',
    'print_header_config_student_logins', 'print_header_config_students',
    'print_header_config_weekly_attendance', 'print_header_config_comprehensive',
    'print_header_config_quiz_stats', 'print_header_config_monthly', 'print_header_config_violations',
    'quiz_color_mcq', 'quiz_color_true_false', 'quiz_color_essay', 'quiz_color_fill_blank', 'quiz_color_ordering',
    'behavior_suggestions', 'calendar_type', 'parent_pdf_header',
    'whatsapp_template_absence', 'whatsapp_template_full_mark', 'whatsapp_template_honor_roll',
    'form_identity', 'student_visibility', 'lesson_plan_settings', 'subject_name', 'popup_settings'
  ]::text[])
$function$;