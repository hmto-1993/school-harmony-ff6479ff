
-- Create a secure view that conditionally masks PII
CREATE OR REPLACE VIEW public.students_safe AS
SELECT
  s.id,
  s.full_name,
  s.class_id,
  s.created_at,
  s.updated_at,
  s.notes,
  CASE
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN s.national_id
    WHEN EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = s.class_id
    ) THEN s.national_id
    ELSE NULL
  END AS national_id,
  CASE
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN s.parent_phone
    WHEN EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = s.class_id
    ) THEN s.parent_phone
    ELSE NULL
  END AS parent_phone,
  CASE
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN s.academic_number
    WHEN EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = s.class_id
    ) THEN s.academic_number
    ELSE NULL
  END AS academic_number
FROM public.students s;

-- Grant access to the view
GRANT SELECT ON public.students_safe TO authenticated;
GRANT SELECT ON public.students_safe TO anon;
