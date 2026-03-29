
-- 1. Fix reports bucket: remove unscoped DELETE policy
DROP POLICY IF EXISTS "Authenticated users can delete reports" ON storage.objects;

-- 2. Add SELECT policy for reports bucket (scoped to owner)
DROP POLICY IF EXISTS "auth users can read own reports" ON storage.objects;
CREATE POLICY "auth users can read own reports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'reports' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = auth.uid()::text
  ));

-- 3. Fix library bucket UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update library files" ON storage.objects;
DROP POLICY IF EXISTS "auth users can update library files" ON storage.objects;
CREATE POLICY "auth users can update library files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'library' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = auth.uid()::text
  ));

-- 4. Fix activities SELECT: scope to teachers who own or are assigned to the activity
-- Since storage paths use teacher uid as folder, we can scope by folder
DROP POLICY IF EXISTS "auth users can read activity files" ON storage.objects;
CREATE POLICY "auth users can read activity files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'activities' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.teacher_activities ta
      WHERE ta.created_by = auth.uid()
        AND ta.file_url LIKE '%' || name
    )
  ));

-- 5. Create private bucket for excuses (if not exists)
INSERT INTO storage.buckets (id, name, public) VALUES ('excuses', 'excuses', false)
ON CONFLICT (id) DO NOTHING;

-- Add policies for excuses bucket
CREATE POLICY "anon can upload excuses"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'excuses');

CREATE POLICY "admins and teachers can read excuses"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'excuses');

CREATE POLICY "admins can delete excuses"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'excuses' AND has_role(auth.uid(), 'admin'::app_role));
