CREATE OR REPLACE FUNCTION public.can_access_scoped_setting_id(_setting_id text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (_setting_id LIKE (_user_id::text || ':%'))
    OR (
      public.get_user_org(_user_id) IS NOT NULL
      AND _setting_id LIKE ('org:' || public.get_user_org(_user_id)::text || ':%')
    )
$$;

CREATE OR REPLACE FUNCTION public.is_public_site_setting(_setting_id text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT _setting_id = ANY (ARRAY[
    'school_name', 'school_subtitle', 'school_logo_url',
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
$$;

DROP POLICY IF EXISTS "Subscribers cannot access system site_settings" ON public.site_settings;

CREATE POLICY "Tenant scoped site_settings boundary"
ON public.site_settings
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  public.is_primary_owner(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.can_access_scoped_setting_id(id, auth.uid())
  OR public.is_public_site_setting(id)
)
WITH CHECK (
  public.is_primary_owner(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.can_access_scoped_setting_id(id, auth.uid())
    AND public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role, 'admin'::public.org_role])
  )
);

DROP POLICY IF EXISTS "Org members can read scoped site_settings" ON public.site_settings;
CREATE POLICY "Org members can read scoped site_settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (public.can_access_scoped_setting_id(id, auth.uid()));

DROP POLICY IF EXISTS "Org owners can insert scoped site_settings" ON public.site_settings;
CREATE POLICY "Org owners can insert scoped site_settings"
ON public.site_settings
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_scoped_setting_id(id, auth.uid())
  AND public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role, 'admin'::public.org_role])
);

DROP POLICY IF EXISTS "Org owners can update scoped site_settings" ON public.site_settings;
CREATE POLICY "Org owners can update scoped site_settings"
ON public.site_settings
FOR UPDATE
TO authenticated
USING (
  public.can_access_scoped_setting_id(id, auth.uid())
  AND public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role, 'admin'::public.org_role])
)
WITH CHECK (
  public.can_access_scoped_setting_id(id, auth.uid())
  AND public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role, 'admin'::public.org_role])
);

DROP POLICY IF EXISTS "Org owners can delete scoped site_settings" ON public.site_settings;
CREATE POLICY "Org owners can delete scoped site_settings"
ON public.site_settings
FOR DELETE
TO authenticated
USING (
  public.can_access_scoped_setting_id(id, auth.uid())
  AND public.user_has_org_role_in(auth.uid(), ARRAY['owner'::public.org_role, 'admin'::public.org_role])
);

INSERT INTO public.site_settings (id, value, updated_at)
SELECT 'org:' || p.organization_id::text || ':' || s.id, s.value, now()
FROM public.profiles p
JOIN public.site_settings s ON s.id NOT LIKE 'org:%' AND s.id NOT LIKE '________-____-____-____-____________:%'
WHERE p.role = 'owner'::public.org_role
  AND p.organization_id IS NOT NULL
  AND NOT public.is_primary_owner(p.user_id)
  AND s.id NOT IN ('admin_primary_id', 'admin_restrictions')
ON CONFLICT (id) DO NOTHING;