
-- Find and tighten broad public SELECT policies on storage.objects for public buckets
-- Drop common overly-broad public read policies that allow listing
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND cmd='SELECT'
      AND (qual ILIKE '%print-assets%' OR qual ILIKE '%school-assets%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Public can READ a specific object (no listing) — by requiring an exact name match path style usage
-- We allow SELECT but only when name is requested directly (Supabase listing uses prefix queries; this still
-- permits listing technically. The proper hardening is to make buckets private + use signed URLs.)
-- Convert the two remaining buckets to private as well; assets can be served via signed URLs.
UPDATE storage.buckets SET public = false WHERE id IN ('print-assets', 'school-assets');
