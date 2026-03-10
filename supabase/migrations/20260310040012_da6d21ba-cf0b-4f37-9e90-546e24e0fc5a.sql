
-- Remove overly permissive storage policy that allows anon access
DROP POLICY IF EXISTS "Anyone can view activities files" ON storage.objects;

-- Replace with authenticated-only access
CREATE POLICY "Authenticated can view activities files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activities');
