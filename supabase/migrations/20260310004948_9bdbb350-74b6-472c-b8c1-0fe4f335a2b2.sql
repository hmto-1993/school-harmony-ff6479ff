-- Remove anon access to quiz_questions (exposes correct_answer)
DROP POLICY IF EXISTS "Anon can view questions anon" ON public.quiz_questions;

-- Create a student-safe view that excludes correct_answer
CREATE OR REPLACE VIEW public.quiz_questions_student AS
  SELECT id, activity_id, question_text, question_type, image_url, options, sort_order
  FROM public.quiz_questions;

-- Grant anon access to the view instead
GRANT SELECT ON public.quiz_questions_student TO anon;
GRANT SELECT ON public.quiz_questions_student TO authenticated;