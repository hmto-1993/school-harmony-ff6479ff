
-- Add is_deduction flag to grade_categories
ALTER TABLE public.grade_categories
ADD COLUMN is_deduction boolean NOT NULL DEFAULT false;

-- Add note column to grades for storing deduction reason
ALTER TABLE public.grades
ADD COLUMN note text DEFAULT '';
