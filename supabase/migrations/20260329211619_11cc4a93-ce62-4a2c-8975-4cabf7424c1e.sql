
-- Create parent_messages table for parent-teacher communication
CREATE TABLE public.parent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  message_type text NOT NULL DEFAULT 'message' CHECK (message_type IN ('message', 'appointment')),
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  parent_name text NOT NULL DEFAULT '',
  parent_phone text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'replied')),
  teacher_reply text DEFAULT '',
  replied_by uuid DEFAULT NULL,
  replied_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (parents are anon via edge function context)
CREATE POLICY "Anon can insert parent_messages"
  ON public.parent_messages FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Teachers can view messages for their classes
CREATE POLICY "Teachers can view parent_messages for their classes"
  ON public.parent_messages FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_viewer(auth.uid())
    OR EXISTS (
      SELECT 1 FROM teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = parent_messages.class_id
    )
  );

-- Teachers can update (reply) messages for their classes
CREATE POLICY "Teachers can update parent_messages for their classes"
  ON public.parent_messages FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM teacher_classes tc
      WHERE tc.teacher_id = auth.uid() AND tc.class_id = parent_messages.class_id
    )
  );

-- Admins can manage all
CREATE POLICY "Admins can manage parent_messages"
  ON public.parent_messages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update site_settings RLS to include new key
DROP POLICY IF EXISTS "Public can read safe settings" ON public.site_settings;
CREATE POLICY "Public can read safe settings" ON public.site_settings
  FOR SELECT TO public
  USING (id = ANY (ARRAY[
    'school_name', 'school_subtitle', 'school_logo_url',
    'print_header', 'print_header_config', 'print_header_config_attendance',
    'print_header_config_grades', 'print_header_config_behavior', 'print_header_config_student_logins',
    'quiz_color_mcq', 'quiz_color_tf', 'quiz_color_selected',
    'dashboard_title', 'show_hero_section',
    'parent_welcome_message', 'parent_welcome_enabled',
    'parent_show_national_id', 'parent_show_grades', 'parent_show_attendance', 'parent_show_behavior',
    'parent_show_honor_roll', 'parent_show_absence_warning', 'parent_show_contact_teacher'
  ]));
