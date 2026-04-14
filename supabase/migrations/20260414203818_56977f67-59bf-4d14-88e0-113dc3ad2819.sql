
-- Fix: set view to SECURITY INVOKER so RLS of the querying user applies
ALTER VIEW public.students_safe SET (security_invoker = on);
