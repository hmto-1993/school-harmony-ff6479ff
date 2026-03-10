-- Fix security definer view issue
DROP VIEW IF EXISTS public.quiz_questions_student;
CREATE VIEW public.quiz_questions_student
  WITH (security_invoker = true)
  AS SELECT id, activity_id, question_text, question_type, image_url, options, sort_order
  FROM public.quiz_questions;

GRANT SELECT ON public.quiz_questions_student TO anon;
GRANT SELECT ON public.quiz_questions_student TO authenticated;