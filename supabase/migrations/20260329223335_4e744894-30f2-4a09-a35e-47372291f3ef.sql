
-- 1. Fix parent_messages INSERT: require valid student_id exists
DROP POLICY IF EXISTS "Anyone can insert parent_messages with valid student" ON public.parent_messages;
CREATE POLICY "Anyone can insert parent_messages with valid student"
  ON public.parent_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(body) <= 2000
    AND length(subject) <= 500
    AND length(parent_name) <= 200
    AND EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id)
  );

-- 2. Fix viewer scope: restrict viewers to only see students in their assigned classes
-- Drop and recreate the is_viewer_for_class function to also be used in student policies
-- The viewer SELECT policies already exist on most tables but the students table allows
-- is_viewer() which sees ALL students. Fix it to scope by class.
DROP POLICY IF EXISTS "Teachers can view students in their classes" ON public.students;
CREATE POLICY "Teachers can view students in their classes"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = students.class_id
    ))
    OR (is_viewer(auth.uid()) AND is_viewer_for_class(auth.uid(), students.class_id))
  );

-- 3. Fix teacher_permissions: prevent non-admins from inserting their own permissions
-- (only admins should manage permissions)
DROP POLICY IF EXISTS "Only admins can insert teacher_permissions" ON public.teacher_permissions;
CREATE POLICY "Only admins can insert teacher_permissions"
  ON public.teacher_permissions FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Only admins can update teacher_permissions" ON public.teacher_permissions;
CREATE POLICY "Only admins can update teacher_permissions"
  ON public.teacher_permissions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Only admins can delete teacher_permissions" ON public.teacher_permissions;
CREATE POLICY "Only admins can delete teacher_permissions"
  ON public.teacher_permissions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix storage: add ownership checks for activities bucket
DROP POLICY IF EXISTS "auth users can upload activity files" ON storage.objects;
CREATE POLICY "auth users can upload activity files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'activities' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "auth users can read activity files" ON storage.objects;
CREATE POLICY "auth users can read activity files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'activities');

DROP POLICY IF EXISTS "auth users can delete activity files" ON storage.objects;
CREATE POLICY "auth users can delete activity files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'activities' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Fix storage: add ownership checks for reports bucket
DROP POLICY IF EXISTS "auth users can upload reports" ON storage.objects;
CREATE POLICY "auth users can upload reports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "auth users can delete reports" ON storage.objects;
CREATE POLICY "auth users can delete reports"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 6. Fix library bucket: restrict delete to file owner
DROP POLICY IF EXISTS "auth users can delete library files" ON storage.objects;
CREATE POLICY "auth users can delete library files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'library' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = auth.uid()::text
  ));
