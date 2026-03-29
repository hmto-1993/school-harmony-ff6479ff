
-- Fix: Change grade_categories FK to SET NULL on class deletion (preserve categories)
ALTER TABLE public.grade_categories
  DROP CONSTRAINT IF EXISTS grade_categories_class_id_fkey;

ALTER TABLE public.grade_categories
  ADD CONSTRAINT grade_categories_class_id_fkey
  FOREIGN KEY (class_id) REFERENCES public.classes(id)
  ON DELETE SET NULL;

-- Fix: Change grades FK to category to SET NULL (preserve grades if category deleted)
ALTER TABLE public.grades
  DROP CONSTRAINT IF EXISTS grades_category_id_fkey;

ALTER TABLE public.grades
  ADD CONSTRAINT grades_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.grade_categories(id)
  ON DELETE SET NULL;

-- Fix: Change manual_category_scores FK to category to SET NULL
ALTER TABLE public.manual_category_scores
  DROP CONSTRAINT IF EXISTS manual_category_scores_category_id_fkey;

ALTER TABLE public.manual_category_scores
  ADD CONSTRAINT manual_category_scores_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.grade_categories(id)
  ON DELETE SET NULL;
