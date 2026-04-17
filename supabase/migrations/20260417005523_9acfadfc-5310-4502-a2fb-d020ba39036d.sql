-- Create enum for user role within organization
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'teacher', 'student', 'parent');

-- Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN role public.org_role;

-- Index on organization_id for fast lookups
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_profiles_org_role ON public.profiles(organization_id, role);

-- Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_org(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_role(_user_id UUID)
RETURNS public.org_role
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _role public.org_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Trigger: enforce that each user has exactly one organization (cannot be NULL once set)
-- Also prevent role/org self-escalation: only owner/admin of same org may change another user's role/org
CREATE OR REPLACE FUNCTION public.protect_profile_org_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role public.org_role;
  caller_org UUID;
BEGIN
  caller_org := public.get_user_org(auth.uid());
  caller_role := public.get_user_org_role(auth.uid());

  -- Prevent users from changing their own role or organization
  IF NEW.user_id = auth.uid() THEN
    IF OLD.role IS DISTINCT FROM NEW.role
       OR OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
      -- Allow only if they are the owner of the same org (initial bootstrap exception handled by INSERT)
      IF caller_role <> 'owner' THEN
        NEW.role := OLD.role;
        NEW.organization_id := OLD.organization_id;
      END IF;
    END IF;
  ELSE
    -- Editing another user: must be owner or admin of the same org
    IF caller_role NOT IN ('owner', 'admin') OR caller_org IS DISTINCT FROM OLD.organization_id THEN
      NEW.role := OLD.role;
      NEW.organization_id := OLD.organization_id;
    END IF;
    -- Admins cannot create/promote owners
    IF caller_role = 'admin' AND NEW.role = 'owner' THEN
      NEW.role := OLD.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_profile_org_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_org_role();

-- Drop existing SELECT policies and rebuild with org-aware rules
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Users can always view their own profile
CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Owner: view all profiles in own organization
CREATE POLICY "Owner views org profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_org(auth.uid())
  AND public.get_user_org_role(auth.uid()) = 'owner'
);

-- Admin: view profiles of teachers, students, parents in same org
CREATE POLICY "Admin views managed profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_org(auth.uid())
  AND public.get_user_org_role(auth.uid()) = 'admin'
  AND role IN ('teacher', 'student', 'parent', 'admin')
);

-- Teacher: view colleagues and students in same org (read-only context)
CREATE POLICY "Teacher views org members"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_org(auth.uid())
  AND public.get_user_org_role(auth.uid()) = 'teacher'
  AND role IN ('teacher', 'student')
);

-- Legacy global admin (app_role) keeps full visibility
CREATE POLICY "Global admins view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- UPDATE: owner can update any profile in their org; admin can update teachers/students/parents
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner updates org profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_org(auth.uid())
  AND public.get_user_org_role(auth.uid()) = 'owner'
)
WITH CHECK (
  organization_id = public.get_user_org(auth.uid())
);

CREATE POLICY "Admin updates managed profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_org(auth.uid())
  AND public.get_user_org_role(auth.uid()) = 'admin'
  AND role IN ('teacher', 'student', 'parent')
)
WITH CHECK (
  organization_id = public.get_user_org(auth.uid())
  AND role IN ('teacher', 'student', 'parent')
);