-- 1) students_backup: deny all client INSERT/UPDATE/DELETE; only SECURITY DEFINER funcs (service role) bypass RLS
ALTER TABLE public.students_backup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_client_insert_students_backup" ON public.students_backup;
CREATE POLICY "deny_client_insert_students_backup"
  ON public.students_backup FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_client_update_students_backup" ON public.students_backup;
CREATE POLICY "deny_client_update_students_backup"
  ON public.students_backup FOR UPDATE
  TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_client_delete_students_backup" ON public.students_backup;
CREATE POLICY "deny_client_delete_students_backup"
  ON public.students_backup FOR DELETE
  TO anon, authenticated
  USING (false);

-- 2) Apply same hardening to other *_backup tables which share the same exposure shape
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'attendance_backup','behavior_backup','classes_backup',
    'grades_backup','notifications_backup','reports_backup'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "deny_client_insert_%1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "deny_client_insert_%1$s" ON public.%1$I FOR INSERT TO anon, authenticated WITH CHECK (false)', t);
    EXECUTE format('DROP POLICY IF EXISTS "deny_client_update_%1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "deny_client_update_%1$s" ON public.%1$I FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false)', t);
    EXECUTE format('DROP POLICY IF EXISTS "deny_client_delete_%1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "deny_client_delete_%1$s" ON public.%1$I FOR DELETE TO anon, authenticated USING (false)', t);
  END LOOP;
END $$;

-- 3) realtime.messages: scope subscriptions to user-owned or public topics
DROP POLICY IF EXISTS "authenticated_can_receive_realtime" ON realtime.messages;
DROP POLICY IF EXISTS "scoped_realtime_subscriptions" ON realtime.messages;

CREATE POLICY "scoped_realtime_subscriptions"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    -- Public, app-wide channels (no per-user data): platform features, presence, public broadcasts
    realtime.topic() IN (
      'platform_features_changes',
      'platform_features',
      'public'
    )
    -- User-scoped topics in the form "user:<auth_uid>" or "private:<auth_uid>:..."
    OR realtime.topic() = 'user:' || auth.uid()::text
    OR realtime.topic() LIKE 'user:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'private:' || auth.uid()::text || ':%'
    -- Org-scoped topics in the form "org:<organization_id>:..."
    OR (
      realtime.topic() LIKE 'org:%'
      AND split_part(realtime.topic(), ':', 2) = public.get_user_org(auth.uid())::text
    )
  );
