-- Fix 1: Make quiz_questions_student view respect RLS on underlying table
ALTER VIEW public.quiz_questions_student SET (security_invoker = true);

-- Fix 2: Ensure activities bucket is private (idempotent)
UPDATE storage.buckets SET public = false WHERE id = 'activities';

-- Add storage RLS policy for authenticated users to view excuse files in school-assets
CREATE POLICY "Authenticated can view excuse files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'school-assets' AND (storage.foldername(name))[1] = 'excuses');

CREATE POLICY "Anon can upload excuse files via edge function"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'school-assets' AND (storage.foldername(name))[1] = 'excuses');