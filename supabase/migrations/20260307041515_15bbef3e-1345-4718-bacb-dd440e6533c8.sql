
-- Create a public storage bucket for report PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reports', 'reports', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to reports bucket
CREATE POLICY "Authenticated users can upload reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports');

-- Allow public read access for report PDFs (so parents can open the link)
CREATE POLICY "Public read access for reports"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'reports');

-- Allow authenticated users to delete old reports
CREATE POLICY "Authenticated users can delete reports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reports');
