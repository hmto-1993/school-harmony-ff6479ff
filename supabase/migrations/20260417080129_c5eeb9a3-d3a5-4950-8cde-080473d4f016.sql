-- 1) Identify primary owner (oldest auth user) and run full rollback
DO $$
DECLARE
  v_owner_id uuid;
  v_org_id uuid;
  v_other_user uuid;
BEGIN
  -- Find the oldest user = primary owner
  SELECT id INTO v_owner_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'No users found';
  END IF;

  -- Ensure owner has organization (use recover function logic)
  PERFORM public.recover_primary_owner();

  -- Get the owner's organization
  SELECT organization_id INTO v_org_id FROM public.profiles WHERE user_id = v_owner_id LIMIT 1;
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations WHERE owner_id = v_owner_id LIMIT 1;
  END IF;

  -- 2) Reassign ALL data ownership to the primary owner + organization
  UPDATE public.classes SET organization_id = v_org_id;
  UPDATE public.students SET organization_id = v_org_id;
  UPDATE public.grades SET organization_id = v_org_id, recorded_by = v_owner_id WHERE recorded_by IN (SELECT id FROM auth.users WHERE id <> v_owner_id);
  UPDATE public.grades SET organization_id = v_org_id WHERE organization_id IS DISTINCT FROM v_org_id;
  UPDATE public.attendance_records SET organization_id = v_org_id, recorded_by = v_owner_id WHERE recorded_by IN (SELECT id FROM auth.users WHERE id <> v_owner_id);
  UPDATE public.attendance_records SET organization_id = v_org_id WHERE organization_id IS DISTINCT FROM v_org_id;
  UPDATE public.behavior_records SET organization_id = v_org_id, recorded_by = v_owner_id WHERE recorded_by IN (SELECT id FROM auth.users WHERE id <> v_owner_id);
  UPDATE public.behavior_records SET organization_id = v_org_id WHERE organization_id IS DISTINCT FROM v_org_id;
  UPDATE public.notifications SET organization_id = v_org_id, created_by = v_owner_id WHERE created_by IS NOT NULL AND created_by <> v_owner_id;
  UPDATE public.notifications SET organization_id = v_org_id WHERE organization_id IS DISTINCT FROM v_org_id;
  UPDATE public.manual_category_scores SET recorded_by = v_owner_id WHERE recorded_by <> v_owner_id;
  UPDATE public.lesson_plans SET created_by = v_owner_id WHERE created_by <> v_owner_id;
  UPDATE public.announcements SET created_by = v_owner_id WHERE created_by <> v_owner_id;
  UPDATE public.popup_messages SET created_by = v_owner_id WHERE created_by <> v_owner_id;
  UPDATE public.attendance_schedule_exceptions SET created_by = v_owner_id WHERE created_by <> v_owner_id;
  UPDATE public.academic_calendar SET created_by = v_owner_id WHERE created_by <> v_owner_id;
  UPDATE public.resource_folders SET created_by = v_owner_id WHERE created_by <> v_owner_id;
  UPDATE public.organizations SET owner_id = v_owner_id WHERE id = v_org_id;

  -- Link all classes to primary owner in teacher_classes
  INSERT INTO public.teacher_classes (teacher_id, class_id)
  SELECT v_owner_id, c.id FROM public.classes c
  ON CONFLICT DO NOTHING;

  -- 3) Delete all other users from public tables (CASCADE-style cleanup)
  FOR v_other_user IN SELECT id FROM auth.users WHERE id <> v_owner_id LOOP
    DELETE FROM public.teacher_classes WHERE teacher_id = v_other_user;
    DELETE FROM public.teacher_permissions WHERE user_id = v_other_user;
    DELETE FROM public.user_roles WHERE user_id = v_other_user;
    DELETE FROM public.staff_logins WHERE user_id = v_other_user;
    DELETE FROM public.profiles WHERE user_id = v_other_user;
    DELETE FROM public.organizations WHERE owner_id = v_other_user AND id <> v_org_id;
    -- Finally delete from auth.users
    DELETE FROM auth.users WHERE id = v_other_user;
  END LOOP;

  -- 4) Disable recovery mode
  INSERT INTO public.site_settings (id, value)
  VALUES ('recovery_mode', 'false')
  ON CONFLICT (id) DO UPDATE SET value = 'false', updated_at = now();

  RAISE NOTICE 'Rollback complete. Owner: %, Org: %', v_owner_id, v_org_id;
END $$;

-- 5) Drop the recovery RLS policies (recovery mode is off)
DROP POLICY IF EXISTS recovery_attendance_select ON public.attendance_records;
DROP POLICY IF EXISTS recovery_behavior_select ON public.behavior_records;
DROP POLICY IF EXISTS recovery_grades_select ON public.grades;
DROP POLICY IF EXISTS recovery_classes_select ON public.classes;
DROP POLICY IF EXISTS recovery_notifications_select ON public.notifications;