
-- 1) Enum + column
DO $$ BEGIN
  CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status public.approval_status NOT NULL DEFAULT 'pending';

-- 2) Auto-approve the system primary owner & global admins; keep new subscribers pending
UPDATE public.profiles p
SET approval_status = 'approved'
WHERE public.is_primary_owner(p.user_id)
   OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin');

-- 3) Helper: is the user approved (or primary owner / global admin)?
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND (
      public.is_primary_owner(_user_id)
      OR public.has_role(_user_id, 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = _user_id AND approval_status = 'approved'
      )
    );
$$;

-- 4) Trigger: prevent non-admins from changing their own approval_status
CREATE OR REPLACE FUNCTION public.protect_approval_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role)
       AND NOT public.is_primary_owner(auth.uid()) THEN
      NEW.approval_status := OLD.approval_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_approval_status ON public.profiles;
CREATE TRIGGER trg_protect_approval_status
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_approval_status();

-- 5) RPC for owner/admin to approve or reject a user
CREATE OR REPLACE FUNCTION public.set_user_approval(_target_user uuid, _status public.approval_status)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_caller, 'admin'::public.app_role)
     AND NOT public.is_primary_owner(v_caller) THEN
    RAISE EXCEPTION 'Only the system owner or administrators can change approval status';
  END IF;

  UPDATE public.profiles
     SET approval_status = _status,
         updated_at = now()
   WHERE user_id = _target_user;

  RETURN jsonb_build_object('user_id', _target_user, 'status', _status);
END;
$$;

-- 6) RLS hardening: block pending users from CRUD on data tables.
-- Pattern: keep existing policies, add an additional restrictive policy that requires approval.

-- Helper macro: applied to each sensitive table
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'classes','students','grades','attendance_records','behavior_records','notifications',
    'grade_categories','manual_category_scores','teacher_activities','quiz_questions','quiz_submissions',
    'resource_folders','resource_files','custom_form_sections','custom_form_templates','form_issued_logs',
    'form_favorites','lesson_plans','academic_calendar','announcements','popup_messages',
    'question_bank_chapters','question_bank_lessons','question_bank_questions','class_schedules',
    'attendance_schedule_exceptions','parent_messages','excuse_submissions','shared_views','push_subscriptions'
  ]
  LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS "approved_users_only" ON public.%I;
      CREATE POLICY "approved_users_only" ON public.%I
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (public.is_user_approved(auth.uid()))
      WITH CHECK (public.is_user_approved(auth.uid()));
    $f$, t, t);
  END LOOP;
END $$;
