-- Create enum for organization type
CREATE TYPE public.organization_type AS ENUM ('school', 'individual');

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type public.organization_type NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ensure exactly one owner per organization (owner_id is NOT NULL — already enforces "at least one")
-- For "individual" type: enforce one organization per owner (single-user system)
CREATE UNIQUE INDEX idx_organizations_individual_owner
  ON public.organizations(owner_id)
  WHERE type = 'individual';

-- Index for fast owner lookups
CREATE INDEX idx_organizations_owner_id ON public.organizations(owner_id);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Policies: Owners can view their own organizations
CREATE POLICY "Owners can view their organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Admins can view all organizations
CREATE POLICY "Admins can view all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Owners can create organizations (only as themselves)
CREATE POLICY "Users can create their own organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Owners can update their organizations (but cannot reassign ownership unless admin)
CREATE POLICY "Owners can update their organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Admins can update any organization
CREATE POLICY "Admins can update all organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Owners can delete their organizations
CREATE POLICY "Owners can delete their organizations"
ON public.organizations
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Admins can delete any organization
CREATE POLICY "Admins can delete all organizations"
ON public.organizations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger function: prevent ownership reassignment by non-admins
CREATE OR REPLACE FUNCTION public.prevent_org_owner_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      NEW.owner_id := OLD.owner_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_org_owner_change
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_org_owner_change();