-- Allow public read access to library bucket files
CREATE POLICY "Public can view library files"
ON storage.objects FOR SELECT
USING (bucket_id = 'library');

-- Allow authenticated users to upload to library bucket
CREATE POLICY "Authenticated can upload library files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'library' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete their uploaded library files
CREATE POLICY "Authenticated can delete library files"
ON storage.objects FOR DELETE
USING (bucket_id = 'library' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to update library files
CREATE POLICY "Authenticated can update library files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'library' AND auth.uid() IS NOT NULL);