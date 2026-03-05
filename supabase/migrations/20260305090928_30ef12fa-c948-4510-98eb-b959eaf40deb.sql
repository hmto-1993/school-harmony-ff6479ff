
ALTER TABLE public.grade_categories
ADD COLUMN category_group text NOT NULL DEFAULT 'classwork';

-- Set existing categories to correct groups based on name
UPDATE public.grade_categories SET category_group = 'classwork' WHERE name IN ('المشاركة', 'الواجبات', 'الأعمال');
UPDATE public.grade_categories SET category_group = 'exams' WHERE name IN ('اختبار عملي', 'اختبار الفترة');
