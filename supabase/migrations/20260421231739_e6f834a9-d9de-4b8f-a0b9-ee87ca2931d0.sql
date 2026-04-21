
-- ============================================================
-- FIX 1: profiles — restrict PII exposure to primary owner / global admin only
-- ============================================================
-- Org-level owners/admins (subscribers) no longer see siblings' raw PII rows.
-- Only the profile owner, the global app-role admin, and the primary owner / super owner
-- retain SELECT access to full profile rows (which include national_id, phone, subscription_*).

DROP POLICY IF EXISTS "Owner views org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin views managed profiles" ON public.profiles;

-- Allow the platform primary owner / super owner to view all profiles (needed for
-- TeacherManagementHub and SubscriptionsManagementPanel).
CREATE POLICY "Primary owner views all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_primary_owner(auth.uid()) OR public.is_super_owner(auth.uid()));

-- ============================================================
-- FIX 2: resource_folders — remove anonymous folder enumeration
-- ============================================================
-- Anonymous internet users could list every folder marked visible_to_students,
-- exposing folder titles, categories and creator IDs. Anonymous SELECT is dropped;
-- students access library content through the authenticated student-portal flow.

DROP POLICY IF EXISTS "Students can view visible folders" ON public.resource_folders;

-- ============================================================
-- FIX 3: staff_logins — allow non-primary admins to audit login records
-- ============================================================
-- Add a SELECT policy so any user with the global 'admin' app role can review
-- staff login history (closes the audit gap noted by the scanner).

DROP POLICY IF EXISTS "Admins view staff_logins" ON public.staff_logins;
CREATE POLICY "Admins view staff_logins"
ON public.staff_logins
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
