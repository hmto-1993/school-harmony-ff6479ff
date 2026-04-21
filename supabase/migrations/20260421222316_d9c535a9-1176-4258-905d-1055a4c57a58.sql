CREATE OR REPLACE FUNCTION public.is_primary_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
    AND (
      -- Super owners are always treated as primary owners
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = _user_id
          AND COALESCE(p.is_super_owner_flag, false) = true
      )
      OR _user_id = (
        SELECT ur.user_id
        FROM public.user_roles ur
        JOIN public.profiles p ON p.user_id = ur.user_id
        WHERE ur.role = 'admin'::public.app_role
        ORDER BY p.created_at ASC NULLS LAST
        LIMIT 1
      )
    );
$function$;