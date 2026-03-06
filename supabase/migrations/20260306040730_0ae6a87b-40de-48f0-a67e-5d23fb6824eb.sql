
-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all', -- 'all' or 'classes'
  target_class_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Teachers and admins can insert
CREATE POLICY "Authenticated can insert announcements"
  ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Everyone can read (for students)
CREATE POLICY "Anyone can read announcements"
  ON public.announcements FOR SELECT
  USING (true);

-- Admins can manage all
CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can delete own
CREATE POLICY "Teachers can delete own announcements"
  ON public.announcements FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Teachers can update own
CREATE POLICY "Teachers can update own announcements"
  ON public.announcements FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
