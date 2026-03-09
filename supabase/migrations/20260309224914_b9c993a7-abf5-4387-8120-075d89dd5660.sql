-- Make reports bucket private
UPDATE storage.buckets SET public = false WHERE id = 'reports';

-- Drop the public read policy
DROP POLICY IF EXISTS "Public read access for reports" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read reports" ON storage.objects;