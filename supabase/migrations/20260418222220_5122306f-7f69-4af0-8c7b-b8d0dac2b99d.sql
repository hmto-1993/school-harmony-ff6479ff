
-- ========================================
-- Phase 2: RLS Hardening for Subscriber Isolation
-- ========================================

-- Helper function: check if a row's creator belongs to the same organization
CREATE OR REPLACE FUNCTION public.same_org_as_creator(_creator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _creator_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p1
      JOIN public.profiles p2 ON p2.organization_id = p1.organization_id
      WHERE p1.user_id = auth.uid()
        AND p2.user_id = _creator_id
        AND p1.organization_id IS NOT NULL
    );
$$;

-- Helper: same_org via class_id (for tables linked to classes)
CREATE OR REPLACE FUNCTION public.same_org_as_class(_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = _class_id
      AND c.organization_id = public.get_user_org(auth.uid())
  );
$$;

-- ========================================
-- 1) academic_calendar: isolate by creator's org
-- ========================================
DROP POLICY IF EXISTS "Authenticated can view academic_calendar" ON public.academic_calendar;
CREATE POLICY "Org members view academic_calendar"
  ON public.academic_calendar FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR public.same_org_as_creator(created_by)
    OR created_by = auth.uid()
  );

-- ========================================
-- 2) announcements: isolate by creator's org
-- ========================================
DROP POLICY IF EXISTS "Authenticated can read announcements" ON public.announcements;
CREATE POLICY "Org members read announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR public.same_org_as_creator(created_by)
    OR created_by = auth.uid()
  );

-- ========================================
-- 3) popup_messages: isolate by creator's org
-- ========================================
DROP POLICY IF EXISTS "Anyone can read popup_messages" ON public.popup_messages;
CREATE POLICY "Org members read popup_messages"
  ON public.popup_messages FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR public.same_org_as_creator(created_by)
    OR created_by = auth.uid()
  );
-- Keep public/anon read for student/parent portals via separate policy
CREATE POLICY "Anon read popup_messages"
  ON public.popup_messages FOR SELECT TO anon
  USING (true);

-- ========================================
-- 4) grade_categories: isolate by class's org (when class_id is set)
-- ========================================
DROP POLICY IF EXISTS "Authenticated can view grade_categories" ON public.grade_categories;
CREATE POLICY "Org members view grade_categories"
  ON public.grade_categories FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR class_id IS NULL  -- global defaults
    OR public.same_org_as_class(class_id)
  );

-- Restrict admin-only INSERT/UPDATE/DELETE to allow org owners too
DROP POLICY IF EXISTS "Admins can manage grade_categories" ON public.grade_categories;
CREATE POLICY "Org owners manage grade_categories"
  ON public.grade_categories FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (class_id IS NOT NULL AND public.same_org_as_class(class_id))
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (class_id IS NOT NULL AND public.same_org_as_class(class_id))
  );

-- ========================================
-- 5) timetable_slots: isolate via class's org
-- ========================================
DROP POLICY IF EXISTS "Authenticated can view timetable_slots" ON public.timetable_slots;
DROP POLICY IF EXISTS "Viewers can view timetable_slots" ON public.timetable_slots;
DROP POLICY IF EXISTS "Teachers can view timetable_slots" ON public.timetable_slots;
CREATE POLICY "Org members view timetable_slots"
  ON public.timetable_slots FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR class_id IS NULL
    OR public.same_org_as_class(class_id)
  );

-- ========================================
-- 6) attendance_schedule_exceptions: tighten SELECT
-- ========================================
DROP POLICY IF EXISTS "Authenticated can view schedule exceptions" ON public.attendance_schedule_exceptions;
CREATE POLICY "Org members view schedule exceptions"
  ON public.attendance_schedule_exceptions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR public.same_org_as_class(class_id)
  );

-- ========================================
-- 7) lesson_plans: tighten cross-org leaks
-- ========================================
DROP POLICY IF EXISTS "Teachers can view lesson_plans for their classes" ON public.lesson_plans;
CREATE POLICY "Org members view lesson_plans"
  ON public.lesson_plans FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_viewer(auth.uid())
    OR created_by = auth.uid()
    OR public.same_org_as_class(class_id)
  );

-- ========================================
-- 8) Question bank: isolate by creator's org
-- ========================================
DROP POLICY IF EXISTS "Teachers can view chapters" ON public.question_bank_chapters;
CREATE POLICY "Org members view chapters"
  ON public.question_bank_chapters FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
    OR public.same_org_as_creator(created_by)
  );

DROP POLICY IF EXISTS "Teachers can view lessons" ON public.question_bank_lessons;
CREATE POLICY "Org members view bank lessons"
  ON public.question_bank_lessons FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
    OR public.same_org_as_creator(created_by)
  );

DROP POLICY IF EXISTS "Teachers can view bank questions" ON public.question_bank_questions;
CREATE POLICY "Org members view bank questions"
  ON public.question_bank_questions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
    OR public.same_org_as_creator(created_by)
  );

-- ========================================
-- 9) custom_form_sections / templates: keep creator-only (already isolated)
-- No changes needed — already filtered by created_by = auth.uid()
-- ========================================

-- ========================================
-- 10) Block subscribers from inserting privileged user_roles
-- ========================================
-- Existing "Admins can manage all roles" allows admin only — good.
-- Add explicit deny-by-default for non-admins on INSERT to be safe:
DROP POLICY IF EXISTS "Block non-admin role escalation" ON public.user_roles;
CREATE POLICY "Block non-admin role escalation"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ========================================
-- 11) Lock organizations: subscribers cannot create new orgs (already auto-created on signup)
-- ========================================
DROP POLICY IF EXISTS "Users can create their own organizations" ON public.organizations;
CREATE POLICY "Only admins create organizations"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ========================================
-- 12) staff_logins: hide cross-org logins from subscribers
-- ========================================
DROP POLICY IF EXISTS "Admins can view all staff_logins" ON public.staff_logins;
CREATE POLICY "Primary admin views all staff_logins"
  ON public.staff_logins FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND public.is_primary_owner(auth.uid())
  );

-- ========================================
-- 13) student_logins: restrict to own org's students (teachers already restricted by class)
-- Already scoped via teacher_classes — no change needed
-- ========================================
