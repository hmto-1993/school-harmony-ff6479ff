-- Drop overly broad library bucket policies that bypass ownership checks
DROP POLICY IF EXISTS "Authenticated can upload library files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update library files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete library files" ON storage.objects;

-- Replace INSERT with ownership-scoped policy
CREATE POLICY "Scoped upload library files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'library' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);