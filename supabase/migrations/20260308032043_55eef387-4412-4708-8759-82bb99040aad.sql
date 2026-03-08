
CREATE TABLE public.academic_calendar (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  academic_year text NOT NULL DEFAULT '1446-1447',
  semester text NOT NULL DEFAULT 'first',
  start_date date NOT NULL,
  total_weeks integer NOT NULL DEFAULT 18,
  exam_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.academic_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage academic_calendar" ON public.academic_calendar FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view academic_calendar" ON public.academic_calendar FOR SELECT USING (true);
CREATE POLICY "Teachers can insert academic_calendar" ON public.academic_calendar FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Teachers can update own academic_calendar" ON public.academic_calendar FOR UPDATE USING (created_by = auth.uid());
