
CREATE TABLE public.library_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'عام',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view resources"
  ON public.library_resources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert resources"
  ON public.library_resources FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete resources"
  ON public.library_resources FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
