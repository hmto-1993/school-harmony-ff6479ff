-- 1) excuses bucket: tighten INSERT to only allow teachers uploading for their own students
-- File path convention: <student_id>/<filename>
DROP POLICY IF EXISTS "Teachers can upload excuses" ON storage.objects;
DROP POLICY IF EXISTS "teachers_insert_excuses" ON storage.objects;

CREATE POLICY "teachers_insert_excuses_for_own_students"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'excuses'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (
        public.has_role(auth.uid(), 'teacher'::public.app_role)
        AND public.teacher_teaches_student(
          auth.uid(),
          ((storage.foldername(name))[1])::uuid
        )
      )
    )
  );

-- 2) activities bucket: explicit deny-update policy
DROP POLICY IF EXISTS "deny_update_activities_bucket" ON storage.objects;
CREATE POLICY "deny_update_activities_bucket"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id <> 'activities')
  WITH CHECK (bucket_id <> 'activities');

-- 3) realtime: drop the catch-all "public" topic
DROP POLICY IF EXISTS "scoped_realtime_subscriptions" ON realtime.messages;

CREATE POLICY "scoped_realtime_subscriptions"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() IN (
      'platform_features_changes',
      'platform_features'
    )
    OR realtime.topic() = 'user:' || auth.uid()::text
    OR realtime.topic() LIKE 'user:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'private:' || auth.uid()::text || ':%'
    OR (
      realtime.topic() LIKE 'org:%'
      AND split_part(realtime.topic(), ':', 2) = public.get_user_org(auth.uid())::text
    )
  );

-- 4) resource_folders: require authentication for visible-to-students reads
DROP POLICY IF EXISTS "Anyone can view visible folders" ON public.resource_folders;
DROP POLICY IF EXISTS "anon_select_visible_resource_folders" ON public.resource_folders;
DROP POLICY IF EXISTS "public_select_visible_resource_folders" ON public.resource_folders;

CREATE POLICY "authenticated_select_visible_resource_folders"
  ON public.resource_folders
  FOR SELECT
  TO authenticated
  USING (visible_to_students = true);

-- 5) resource_files & teacher_activities: same — require authentication
DROP POLICY IF EXISTS "Anyone can view files in visible folders" ON public.resource_files;
DROP POLICY IF EXISTS "anon_select_resource_files" ON public.resource_files;
DROP POLICY IF EXISTS "public_select_resource_files" ON public.resource_files;

CREATE POLICY "authenticated_select_resource_files"
  ON public.resource_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resource_folders rf
      WHERE rf.id = resource_files.folder_id
        AND rf.visible_to_students = true
    )
  );

DROP POLICY IF EXISTS "Anyone can view visible activities" ON public.teacher_activities;
DROP POLICY IF EXISTS "anon_select_visible_teacher_activities" ON public.teacher_activities;
DROP POLICY IF EXISTS "public_select_visible_teacher_activities" ON public.teacher_activities;

CREATE POLICY "authenticated_select_visible_teacher_activities"
  ON public.teacher_activities
  FOR SELECT
  TO authenticated
  USING (is_visible = true);
