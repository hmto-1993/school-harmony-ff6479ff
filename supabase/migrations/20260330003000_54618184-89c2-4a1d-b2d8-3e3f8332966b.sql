-- Fix 1: Replace the overly broad excuses bucket SELECT policy
DROP POLICY IF EXISTS "admins and teachers can read excuses" ON storage.objects;

CREATE POLICY "admins and class teachers can read excuses"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'excuses'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.excuse_submissions es
      JOIN public.students s ON s.id = es.student_id
      JOIN public.teacher_classes tc ON tc.class_id = s.class_id AND tc.teacher_id = auth.uid()
      WHERE es.file_url = name
    )
  )
);

-- Also fix the school-assets excuses folder policy
DROP POLICY IF EXISTS "Authenticated can view excuse files" ON storage.objects;

CREATE POLICY "admins and class teachers can view excuse files in school-assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'school-assets'
  AND (storage.foldername(name))[1] = 'excuses'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.excuse_submissions es
      JOIN public.students s ON s.id = es.student_id
      JOIN public.teacher_classes tc ON tc.class_id = s.class_id AND tc.teacher_id = auth.uid()
      WHERE es.file_url = name
    )
  )
);