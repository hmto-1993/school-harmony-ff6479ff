
-- ============================================================
-- 1) user_roles: prevent privilege escalation
-- ============================================================

-- Drop existing INSERT/DELETE policies and rebuild stricter ones
DROP POLICY IF EXISTS "Block non-admin role escalation" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only super owner can grant admin" ON public.user_roles;
DROP POLICY IF EXISTS "Only super owner can revoke roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can grant non-admin roles" ON public.user_roles;

-- INSERT: only primary/super owner can grant the admin role.
-- Existing admins can still grant non-admin roles (e.g. teacher).
CREATE POLICY "Only primary owner can grant admin role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (role = 'admin'::public.app_role
      AND (public.is_primary_owner(auth.uid()) OR public.is_super_owner(auth.uid())))
    OR
    (role <> 'admin'::public.app_role
      AND public.has_role(auth.uid(), 'admin'::public.app_role))
  );

-- DELETE: only primary/super owner can remove role rows
CREATE POLICY "Only primary owner can revoke roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    public.is_primary_owner(auth.uid()) OR public.is_super_owner(auth.uid())
  );

-- ============================================================
-- 2) parent_messages: restrict SELECT to creator / replier / admins
-- ============================================================

DROP POLICY IF EXISTS "Teachers can view messages for their classes" ON public.parent_messages;
DROP POLICY IF EXISTS "Teachers view parent messages for their classes" ON public.parent_messages;
DROP POLICY IF EXISTS "View parent messages" ON public.parent_messages;

CREATE POLICY "View parent messages (admin or owning teacher only)"
  ON public.parent_messages
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR replied_by = auth.uid()
    OR (
      class_id IS NOT NULL
      AND public.teacher_teaches_class(auth.uid(), class_id)
      AND (
        replied_by IS NULL  -- unanswered: any class teacher can pick it up
      )
    )
  );

-- ============================================================
-- 3) recovery_action_log / data_recovery_log: explicit client deny
-- ============================================================

-- Try both names defensively (project uses data_recovery_log; scanner referenced recovery_action_log)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='data_recovery_log') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Deny client insert" ON public.data_recovery_log';
    EXECUTE 'DROP POLICY IF EXISTS "Deny client update" ON public.data_recovery_log';
    EXECUTE 'DROP POLICY IF EXISTS "Deny client delete" ON public.data_recovery_log';
    EXECUTE 'CREATE POLICY "Deny client insert" ON public.data_recovery_log AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false)';
    EXECUTE 'CREATE POLICY "Deny client update" ON public.data_recovery_log AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false)';
    EXECUTE 'CREATE POLICY "Deny client delete" ON public.data_recovery_log AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='recovery_action_log') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Deny client insert" ON public.recovery_action_log';
    EXECUTE 'DROP POLICY IF EXISTS "Deny client update" ON public.recovery_action_log';
    EXECUTE 'DROP POLICY IF EXISTS "Deny client delete" ON public.recovery_action_log';
    EXECUTE 'CREATE POLICY "Deny client insert" ON public.recovery_action_log AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false)';
    EXECUTE 'CREATE POLICY "Deny client update" ON public.recovery_action_log AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false)';
    EXECUTE 'CREATE POLICY "Deny client delete" ON public.recovery_action_log AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false)';
  END IF;
END $$;
