
-- Remove anon upload policies on excuses bucket
DROP POLICY IF EXISTS "anon can upload excuses" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload excuse files via edge function" ON storage.objects;
