-- ============================================
-- 1. Add organization_id to all core tables
-- ============================================
ALTER TABLE public.students       ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.classes        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.grades         ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.behavior_records   ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.notifications  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Indexes for fast tenant filtering
CREATE INDEX IF NOT EXISTS idx_students_org           ON public.students(organization_id);
CREATE INDEX IF NOT EXISTS idx_classes_org            ON public.classes(organization_id);
CREATE INDEX IF NOT EXISTS idx_grades_org             ON public.grades(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org         ON public.attendance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_behavior_org           ON public.behavior_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org      ON public.notifications(organization_id);

-- ============================================
-- 2. Auto-fill organization_id on INSERT
-- ============================================
CREATE OR REPLACE FUNCTION public.set_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_user_org(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_org_students       ON public.students;
DROP TRIGGER IF EXISTS trg_set_org_classes        ON public.classes;
DROP TRIGGER IF EXISTS trg_set_org_grades         ON public.grades;
DROP TRIGGER IF EXISTS trg_set_org_attendance     ON public.attendance_records;
DROP TRIGGER IF EXISTS trg_set_org_behavior       ON public.behavior_records;
DROP TRIGGER IF EXISTS trg_set_org_notifications  ON public.notifications;

CREATE TRIGGER trg_set_org_students      BEFORE INSERT ON public.students          FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER trg_set_org_classes       BEFORE INSERT ON public.classes           FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER trg_set_org_grades        BEFORE INSERT ON public.grades            FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER trg_set_org_attendance    BEFORE INSERT ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER trg_set_org_behavior      BEFORE INSERT ON public.behavior_records  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER trg_set_org_notifications BEFORE INSERT ON public.notifications     FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();

-- ============================================
-- 3. Prevent organization_id from being changed
-- ============================================
CREATE OR REPLACE FUNCTION public.lock_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
    NEW.organization_id := OLD.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lock_org_students      BEFORE UPDATE ON public.students          FOR EACH ROW EXECUTE FUNCTION public.lock_organization_id();
CREATE TRIGGER trg_lock_org_classes       BEFORE UPDATE ON public.classes           FOR EACH ROW EXECUTE FUNCTION public.lock_organization_id();
CREATE TRIGGER trg_lock_org_grades        BEFORE UPDATE ON public.grades            FOR EACH ROW EXECUTE FUNCTION public.lock_organization_id();
CREATE TRIGGER trg_lock_org_attendance    BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.lock_organization_id();
CREATE TRIGGER trg_lock_org_behavior      BEFORE UPDATE ON public.behavior_records  FOR EACH ROW EXECUTE FUNCTION public.lock_organization_id();
CREATE TRIGGER trg_lock_org_notifications BEFORE UPDATE ON public.notifications     FOR EACH ROW EXECUTE FUNCTION public.lock_organization_id();

-- ============================================
-- 4. Drop ALL existing policies on these tables and rebuild with strict tenant isolation
-- ============================================
DO $$
DECLARE
  pol RECORD;
  tbl TEXT;
  tables TEXT[] := ARRAY['students','classes','grades','attendance_records','behavior_records','notifications'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Tenant isolation policies (one set per table)
-- ============================================

-- STUDENTS
CREATE POLICY "tenant_select_students" ON public.students FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_insert_students" ON public.students FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_update_students" ON public.students FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_delete_students" ON public.students FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

-- CLASSES
CREATE POLICY "tenant_select_classes" ON public.classes FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_insert_classes" ON public.classes FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_update_classes" ON public.classes FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_delete_classes" ON public.classes FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

-- GRADES
CREATE POLICY "tenant_select_grades" ON public.grades FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_insert_grades" ON public.grades FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_update_grades" ON public.grades FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_delete_grades" ON public.grades FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

-- ATTENDANCE
CREATE POLICY "tenant_select_attendance" ON public.attendance_records FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_insert_attendance" ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_update_attendance" ON public.attendance_records FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_delete_attendance" ON public.attendance_records FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

-- BEHAVIOR
CREATE POLICY "tenant_select_behavior" ON public.behavior_records FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_insert_behavior" ON public.behavior_records FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_update_behavior" ON public.behavior_records FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_delete_behavior" ON public.behavior_records FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

-- NOTIFICATIONS
CREATE POLICY "tenant_select_notifications" ON public.notifications FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_insert_notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_update_notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "tenant_delete_notifications" ON public.notifications FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));