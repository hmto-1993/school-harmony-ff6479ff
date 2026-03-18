
CREATE OR REPLACE FUNCTION public.teacher_owns_all_classes(_teacher_id uuid, _class_ids uuid[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM unnest(_class_ids) AS cid
    WHERE cid NOT IN (
      SELECT tc.class_id FROM public.teacher_classes tc WHERE tc.teacher_id = _teacher_id
    )
  )
$$;

DROP POLICY IF EXISTS "Teachers can manage own shared_views" ON public.shared_views;

CREATE POLICY "Teachers can view own shared_views"
ON public.shared_views FOR SELECT TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert own shared_views"
ON public.shared_views FOR INSERT TO authenticated
WITH CHECK (
  teacher_id = auth.uid()
  AND public.teacher_owns_all_classes(auth.uid(), class_ids)
);

CREATE POLICY "Teachers can update own shared_views"
ON public.shared_views FOR UPDATE TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete own shared_views"
ON public.shared_views FOR DELETE TO authenticated
USING (teacher_id = auth.uid());
