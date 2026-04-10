-- Drop the anon SELECT policy on quiz_questions that exposes correct_answer
DROP POLICY IF EXISTS "Anon can view quiz questions for visible activities" ON public.quiz_questions;