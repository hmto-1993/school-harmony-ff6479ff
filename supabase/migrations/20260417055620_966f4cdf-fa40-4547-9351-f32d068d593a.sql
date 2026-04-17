
-- Add a sentinel default so the generated types mark organization_id as optional.
-- The BEFORE INSERT trigger `enforce_organization_id` will overwrite this with the
-- caller's real org (or default org), and reject if neither is available.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['students','classes','grades','attendance_records','behavior_records','notifications']
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN organization_id SET DEFAULT public.resolve_default_org()', t);
  END LOOP;
END$$;
