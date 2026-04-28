CREATE OR REPLACE FUNCTION public.scope_site_setting_id_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_role public.org_role;
  v_is_primary boolean;
  v_has_global_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id LIKE 'org:%' OR NEW.id LIKE auth.uid()::text || ':%' THEN
    RETURN NEW;
  END IF;

  SELECT organization_id, role INTO v_org, v_role
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  v_is_primary := public.is_primary_owner(auth.uid());
  v_has_global_admin := public.has_role(auth.uid(), 'admin'::public.app_role);

  IF NOT v_is_primary AND NOT v_has_global_admin AND v_org IS NOT NULL AND v_role IN ('owner'::public.org_role, 'admin'::public.org_role) THEN
    NEW.id := 'org:' || v_org::text || ':' || NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scope_site_setting_id_before_write ON public.site_settings;
CREATE TRIGGER trg_scope_site_setting_id_before_write
BEFORE INSERT OR UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.scope_site_setting_id_before_write();