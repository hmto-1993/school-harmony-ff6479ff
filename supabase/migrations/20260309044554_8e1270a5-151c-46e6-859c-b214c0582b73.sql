
-- Add status column to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent';

-- Create excuse_submissions table
CREATE TABLE public.excuse_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  reason text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid DEFAULT NULL,
  reviewed_at timestamp with time zone DEFAULT NULL,
  review_note text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.excuse_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can view excuse submissions (students see theirs, teachers see all)
CREATE POLICY "Anyone can view excuse_submissions" ON public.excuse_submissions
  FOR SELECT USING (true);

-- Anyone can insert excuse submissions (student portal is anonymous)
CREATE POLICY "Anyone can insert excuse_submissions" ON public.excuse_submissions
  FOR INSERT WITH CHECK (true);

-- Authenticated users can update excuse submissions (teacher review)
CREATE POLICY "Authenticated can update excuse_submissions" ON public.excuse_submissions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Admins can manage all
CREATE POLICY "Admins can manage excuse_submissions" ON public.excuse_submissions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
