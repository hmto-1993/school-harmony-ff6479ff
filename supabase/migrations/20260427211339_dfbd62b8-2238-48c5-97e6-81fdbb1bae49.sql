
ALTER TABLE public.profiles DISABLE TRIGGER USER;
UPDATE public.profiles
   SET role = 'owner'::public.org_role
 WHERE role IS NULL
   AND organization_id IS NOT NULL
   AND COALESCE(is_super_owner_flag,false) = false
   AND approval_status <> 'rejected';
ALTER TABLE public.profiles ENABLE TRIGGER USER;
