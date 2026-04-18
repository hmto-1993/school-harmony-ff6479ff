
-- توحيد القيمة "exams" إلى "exam" مع حذف المكررات الناتجة
-- الخطوة 1: حذف المكررات (نُبقي السجل الأقدم لكل (class_id, name) ضمن مجموعة الاختبارات)
DELETE FROM public.grade_categories a
USING public.grade_categories b
WHERE a.class_id IS NOT DISTINCT FROM b.class_id
  AND a.name = b.name
  AND a.category_group IN ('exam', 'exams')
  AND b.category_group IN ('exam', 'exams')
  AND a.created_at > b.created_at;

-- الخطوة 2: توحيد كل "exams" المتبقية إلى "exam"
UPDATE public.grade_categories
SET category_group = 'exam'
WHERE category_group = 'exams';
