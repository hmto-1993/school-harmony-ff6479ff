-- Remove overly broad DELETE policy on activities bucket
DROP POLICY IF EXISTS "Authenticated can delete activities files" ON storage.objects;

-- Remove overly broad INSERT policy on activities bucket  
DROP POLICY IF EXISTS "Authenticated can upload activities" ON storage.objects;