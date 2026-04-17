-- Backfill missing org/role for legacy admin profiles so RBAC RESTRICTIVE policies allow access
UPDATE public.profiles p
SET 
  organization_id = COALESCE(p.organization_id, public.resolve_default_org()),
  role = COALESCE(p.role, 'owner'::public.org_role)
WHERE (p.organization_id IS NULL OR p.role IS NULL)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.user_id AND ur.role = 'admin'::public.app_role
  );

-- Safety net: ensure every existing profile has an organization
UPDATE public.profiles
SET organization_id = public.resolve_default_org()
WHERE organization_id IS NULL;