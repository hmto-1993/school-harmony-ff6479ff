-- Ensure pgcrypto is available for bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Dedicated table for the owner activation key (hashed, never readable)
CREATE TABLE IF NOT EXISTS public.owner_activation_secret (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true), -- single-row table
  key_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.owner_activation_secret ENABLE ROW LEVEL SECURITY;

-- No direct access from clients; everything goes through SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "no_direct_access_activation_secret" ON public.owner_activation_secret;
CREATE POLICY "no_direct_access_activation_secret"
ON public.owner_activation_secret
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Helper: is the caller the super owner?
CREATE OR REPLACE FUNCTION public.is_caller_super_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_owner(auth.uid());
$$;

-- Set / update the activation key (hashed). Only super owner.
CREATE OR REPLACE FUNCTION public.set_owner_activation_key(_new_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_caller_super_owner() THEN
    RAISE EXCEPTION 'غير مصرح: هذا الإجراء متاح للمالك الرئيسي فقط';
  END IF;

  IF _new_key IS NULL OR length(trim(_new_key)) < 4 THEN
    RAISE EXCEPTION 'الرمز قصير جداً: يجب ألا يقل عن 4 خانات';
  END IF;

  INSERT INTO public.owner_activation_secret (id, key_hash, updated_at, updated_by)
  VALUES (true, extensions.crypt(trim(_new_key), extensions.gen_salt('bf', 10)), now(), auth.uid())
  ON CONFLICT (id) DO UPDATE
    SET key_hash = EXCLUDED.key_hash,
        updated_at = now(),
        updated_by = auth.uid();
END;
$$;

-- Check whether an activation key has been configured (any approved teacher can read this, no value exposed)
CREATE OR REPLACE FUNCTION public.has_owner_activation_key()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.owner_activation_secret WHERE id = true);
$$;

-- Verify a candidate key. Only super owner may call this.
CREATE OR REPLACE FUNCTION public.verify_owner_activation_key(_candidate text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _hash text;
BEGIN
  IF NOT public.is_caller_super_owner() THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  IF _candidate IS NULL OR length(_candidate) = 0 THEN
    RETURN false;
  END IF;

  SELECT key_hash INTO _hash FROM public.owner_activation_secret WHERE id = true;
  IF _hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN extensions.crypt(_candidate, _hash) = _hash;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_owner_activation_key(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_owner_activation_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_owner_activation_key(text) TO authenticated;