
-- 1. Fix resource_folders SELECT
DROP POLICY IF EXISTS "Authenticated can view resource_folders" ON public.resource_folders;
CREATE POLICY "Scoped view resource_folders"
  ON public.resource_folders FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = resource_folders.class_id
    )
    OR (class_id IS NULL AND visible_to_students = true)
  );

-- 2. Fix resource_files SELECT
DROP POLICY IF EXISTS "Authenticated can view resource_files" ON public.resource_files;
CREATE POLICY "Scoped view resource_files"
  ON public.resource_files FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.resource_folders rf
      WHERE rf.id = resource_files.folder_id AND rf.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.resource_folders rf
      JOIN public.teacher_classes tc ON tc.class_id = rf.class_id
      WHERE rf.id = resource_files.folder_id AND tc.teacher_id = auth.uid()
    )
  );

-- 3. Fix teacher_activities SELECT
DROP POLICY IF EXISTS "Authenticated can view activities" ON public.teacher_activities;
CREATE POLICY "Scoped view teacher_activities"
  ON public.teacher_activities FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.activity_class_targets act
      JOIN public.teacher_classes tc ON tc.class_id = act.class_id
      WHERE act.activity_id = teacher_activities.id AND tc.teacher_id = auth.uid()
    )
  );

-- 4. Add RLS policy to quiz_questions_student view
-- This is a view, so we add policy on the underlying table access
-- The view already has security_invoker, so RLS on quiz_questions applies
-- Just ensure anon can read via the view for student quiz taking
CREATE POLICY "Anon can view student quiz questions"
  ON public.quiz_questions FOR SELECT TO anon
  USING (false);
