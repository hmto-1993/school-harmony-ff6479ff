
-- Create a public bucket for school logo
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to school-assets bucket
CREATE POLICY "Admins can upload school assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-assets' AND
  public.has_role(auth.uid(), 'admin')
);

-- Allow public read access
CREATE POLICY "Public can view school assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'school-assets');

-- Allow admins to update/delete
CREATE POLICY "Admins can update school assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'school-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete school assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'school-assets' AND public.has_role(auth.uid(), 'admin'));
