-- 1) Library storage: restrict broad authenticated SELECT
DROP POLICY IF EXISTS "Authenticated can view library files" ON storage.objects;

CREATE POLICY "Library files: scoped read access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'library'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_primary_owner(auth.uid())
    OR public.is_super_owner(auth.uid())
    OR auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM public.resource_files rf
      JOIN public.resource_folders rfo ON rfo.id = rf.folder_id
      WHERE rfo.visible_to_students = true
        AND rf.file_url LIKE '%' || storage.objects.name
    )
  )
);

-- 2) students_recovery_snapshots: restrict SELECT to super/primary owner only
DROP POLICY IF EXISTS "Org admins can view snapshots" ON public.students_recovery_snapshots;
DROP POLICY IF EXISTS "Owners and admins can view snapshots" ON public.students_recovery_snapshots;
DROP POLICY IF EXISTS "Admins can view snapshots" ON public.students_recovery_snapshots;

CREATE POLICY "Only primary/super owner can view snapshots"
ON public.students_recovery_snapshots
FOR SELECT
TO authenticated
USING (
  public.is_super_owner(auth.uid())
  OR public.is_primary_owner(auth.uid())
);

-- 3) activity_class_targets: add restrictive approved_users_only policy
CREATE POLICY "approved_users_only"
ON public.activity_class_targets
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.approval_status = 'approved'::public.approval_status
  )
  OR public.is_super_owner(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.approval_status = 'approved'::public.approval_status
  )
  OR public.is_super_owner(auth.uid())
);