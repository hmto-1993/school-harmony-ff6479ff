-- 1) parent_messages: scope SELECT/UPDATE/DELETE to teachers of the student's class.
--    Admins keep access only for classes they teach (via teacher_classes).
--    Primary/super owner retain full access for moderation.

DROP POLICY IF EXISTS "Teachers can view parent_messages for their classes" ON public.parent_messages;
DROP POLICY IF EXISTS "Teachers can update parent_messages for their classes" ON public.parent_messages;
DROP POLICY IF EXISTS "Admins can manage parent_messages" ON public.parent_messages;

-- SELECT: only the assigned teacher(s) of the student's class, or primary/super owner
CREATE POLICY "Class teachers can view parent_messages"
ON public.parent_messages
FOR SELECT
TO authenticated
USING (
  public.is_super_owner(auth.uid())
  OR public.is_primary_owner(auth.uid())
  OR (
    NOT public.is_viewer(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.teacher_classes tc ON tc.class_id = s.class_id
      WHERE s.id = parent_messages.student_id
        AND tc.teacher_id = auth.uid()
    )
  )
);

-- UPDATE: only assigned class teachers, or primary/super owner
CREATE POLICY "Class teachers can update parent_messages"
ON public.parent_messages
FOR UPDATE
TO authenticated
USING (
  public.is_super_owner(auth.uid())
  OR public.is_primary_owner(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.teacher_classes tc ON tc.class_id = s.class_id
    WHERE s.id = parent_messages.student_id
      AND tc.teacher_id = auth.uid()
  )
);

-- DELETE: only primary/super owner (moderation)
CREATE POLICY "Owners can delete parent_messages"
ON public.parent_messages
FOR DELETE
TO authenticated
USING (
  public.is_super_owner(auth.uid())
  OR public.is_primary_owner(auth.uid())
);


-- 2) data_recovery_log: explicit RESTRICTIVE deny policies for INSERT/UPDATE/DELETE
--    (writes already blocked by default; this documents intent and prevents accidents).

CREATE POLICY "deny_all_inserts"
ON public.data_recovery_log
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "deny_all_updates"
ON public.data_recovery_log
AS RESTRICTIVE
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "deny_all_deletes"
ON public.data_recovery_log
AS RESTRICTIVE
FOR DELETE
TO public
USING (false);