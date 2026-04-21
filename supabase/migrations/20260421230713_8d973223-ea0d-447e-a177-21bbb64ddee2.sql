
-- Tighten library bucket access: anon can only read files in folders visible to students
DROP POLICY IF EXISTS "Public can view library files" ON storage.objects;

CREATE POLICY "Anon can view library files in visible folders"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (
    bucket_id = 'library'
    AND EXISTS (
      SELECT 1 FROM public.resource_folders rf
      WHERE rf.id::text = (storage.foldername(name))[1]
        AND rf.visible_to_students = true
    )
  );

CREATE POLICY "Authenticated can view library files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'library');

-- Add SELECT policies for school-assets bucket (branding/logos used across all portals)
CREATE POLICY "Anyone can view school assets"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'school-assets');

-- Add full policy set for print-assets bucket (letterhead used on shared reports)
CREATE POLICY "Anyone can view print assets"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'print-assets');

CREATE POLICY "Admins can upload print assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'print-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update print assets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'print-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete print assets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'print-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));
