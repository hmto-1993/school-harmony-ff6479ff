UPDATE storage.buckets SET public = true WHERE id = 'library';

-- Public read access on library bucket
DROP POLICY IF EXISTS "Public read library bucket" ON storage.objects;
CREATE POLICY "Public read library bucket" ON storage.objects FOR SELECT USING (bucket_id = 'library');