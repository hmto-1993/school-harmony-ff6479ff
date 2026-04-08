
-- 1. Allow anon to view visible activities
CREATE POLICY "Students can view visible activities"
  ON public.teacher_activities FOR SELECT TO anon
  USING (is_visible = true);

-- 2. Allow anon to view activity class targets
CREATE POLICY "Students can view activity targets"
  ON public.activity_class_targets FOR SELECT TO anon
  USING (true);

-- 3. Fix quiz_questions_student view for anon (drop old false policy, add real one)
DROP POLICY IF EXISTS "Anon can view student quiz questions" ON public.quiz_questions;
CREATE POLICY "Anon can view quiz questions for visible activities"
  ON public.quiz_questions FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM teacher_activities ta
    WHERE ta.id = quiz_questions.activity_id AND ta.is_visible = true
  ));

-- 4. Allow anon to view their own quiz submissions
CREATE POLICY "Students can view own quiz submissions"
  ON public.quiz_submissions FOR SELECT TO anon
  USING (true);

-- 5. Allow anon to view visible resource folders
CREATE POLICY "Students can view visible folders"
  ON public.resource_folders FOR SELECT TO anon
  USING (visible_to_students = true);

-- 6. Allow anon to view files in visible folders
CREATE POLICY "Students can view files in visible folders"
  ON public.resource_files FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM resource_folders rf
    WHERE rf.id = resource_files.folder_id AND rf.visible_to_students = true
  ));
