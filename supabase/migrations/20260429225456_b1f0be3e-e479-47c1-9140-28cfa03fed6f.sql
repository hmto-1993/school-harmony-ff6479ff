-- Fix the guard so service-role / migration writes (no auth.uid()) are allowed.
CREATE OR REPLACE FUNCTION public.guard_owner_template_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.id LIKE 'owner:%' OR NEW.id LIKE 'template:%' THEN
    -- Service role / migrations have no auth.uid() — allow them.
    IF auth.uid() IS NOT NULL AND NOT public.is_primary_owner(auth.uid()) THEN
      RAISE EXCEPTION 'Only the primary owner may modify owner/template print-header settings';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Re-attempt the seed inserts.
INSERT INTO public.site_settings (id, value)
SELECT 'owner:' || s.id, s.value
FROM public.site_settings s
WHERE s.id IN (
  'print_header_config',
  'print_header_config_attendance',
  'print_header_config_grades',
  'print_header_config_behavior',
  'print_header_config_violations',
  'print_header_config_student_logins',
  'print_header_config_students',
  'print_header_config_weekly_attendance',
  'print_header_config_comprehensive',
  'print_header_config_quiz_stats',
  'print_header_config_monthly'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.site_settings (id, value)
SELECT 'template:' || s.id, s.value
FROM public.site_settings s
WHERE s.id IN (
  'print_header_config',
  'print_header_config_attendance',
  'print_header_config_grades',
  'print_header_config_behavior',
  'print_header_config_violations',
  'print_header_config_student_logins',
  'print_header_config_students',
  'print_header_config_weekly_attendance',
  'print_header_config_comprehensive',
  'print_header_config_quiz_stats',
  'print_header_config_monthly'
)
ON CONFLICT (id) DO NOTHING;
