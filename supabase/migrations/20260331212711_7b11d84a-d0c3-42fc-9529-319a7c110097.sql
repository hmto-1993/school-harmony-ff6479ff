
CREATE TABLE public.timetable_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL DEFAULT 0,
  period_number INTEGER NOT NULL DEFAULT 1,
  subject_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, day_of_week, period_number)
);

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage timetable_slots"
ON public.timetable_slots FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Teachers can view their class timetables
CREATE POLICY "Teachers can view timetable_slots"
ON public.timetable_slots FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_classes tc
    WHERE tc.teacher_id = auth.uid() AND tc.class_id = timetable_slots.class_id
  )
);

-- Teachers can insert timetable_slots for their classes
CREATE POLICY "Teachers can insert timetable_slots"
ON public.timetable_slots FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teacher_classes tc
    WHERE tc.teacher_id = auth.uid() AND tc.class_id = timetable_slots.class_id
  )
);

-- Teachers can update timetable_slots for their classes
CREATE POLICY "Teachers can update timetable_slots"
ON public.timetable_slots FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_classes tc
    WHERE tc.teacher_id = auth.uid() AND tc.class_id = timetable_slots.class_id
  )
);

-- Teachers can delete timetable_slots for their classes
CREATE POLICY "Teachers can delete timetable_slots"
ON public.timetable_slots FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teacher_classes tc
    WHERE tc.teacher_id = auth.uid() AND tc.class_id = timetable_slots.class_id
  )
);

-- Viewers can see timetable_slots
CREATE POLICY "Viewers can view timetable_slots"
ON public.timetable_slots FOR SELECT TO authenticated
USING (is_viewer(auth.uid()));

-- Authenticated can view all (for dashboard widgets)
CREATE POLICY "Authenticated can view timetable_slots"
ON public.timetable_slots FOR SELECT TO authenticated
USING (true);
