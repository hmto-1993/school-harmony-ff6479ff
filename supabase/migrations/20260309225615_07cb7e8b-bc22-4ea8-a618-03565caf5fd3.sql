-- Drop anonymous upload policy on activities bucket
DROP POLICY IF EXISTS "Anon can upload to activities" ON storage.objects;