-- Add flag to mark a single category per class as the dedicated "earned grades" bucket
ALTER TABLE public.grade_categories
ADD COLUMN IF NOT EXISTS is_earned_bucket BOOLEAN NOT NULL DEFAULT false;

-- Ensure only one earned-bucket per class
CREATE UNIQUE INDEX IF NOT EXISTS uniq_earned_bucket_per_class
ON public.grade_categories (class_id)
WHERE is_earned_bucket = true;

-- Backfill: one earned-bucket per class with no existing one
INSERT INTO public.grade_categories (name, weight, max_score, class_id, sort_order, category_group, is_deduction, is_earned_bucket)
SELECT 'الدرجات المكتسبة', 0, 100, c.id,
       COALESCE((SELECT MAX(sort_order) FROM public.grade_categories WHERE class_id = c.id), 0) + 1,
       'classwork', false, true
FROM public.classes c
WHERE NOT EXISTS (
  SELECT 1 FROM public.grade_categories gc
  WHERE gc.class_id = c.id AND gc.is_earned_bucket = true
);