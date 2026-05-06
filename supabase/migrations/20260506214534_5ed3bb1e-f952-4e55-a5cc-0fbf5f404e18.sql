-- Update the public allowlist function
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
  OR _setting_id LIKE 'parent_show_%'
  OR _setting_id LIKE 'parent_grades_%'
  OR _setting_id LIKE 'parent_classwork_%'
  OR _setting_id LIKE 'parent_welcome_%'
  OR _setting_id LIKE 'student_show_%'
  OR _setting_id LIKE 'student_classwork_%'
  OR _setting_id LIKE 'student_welcome_%'
  OR _setting_id LIKE 'student_hidden_categories'
  OR _setting_id LIKE 'student_popup_%'
$function$;

-- Replace the anon SELECT policy with one that uses the function
DROP POLICY IF EXISTS "Public can read safe settings" ON public.site_settings;
CREATE POLICY "Public can read safe settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (public.is_public_site_setting(id));