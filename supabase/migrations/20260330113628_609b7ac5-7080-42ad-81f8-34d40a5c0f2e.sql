
-- Create or replace the trigger function to prevent non-admins from modifying sensitive student fields
CREATE OR REPLACE FUNCTION public.prevent_teacher_pii_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    NEW.national_id := OLD.national_id;
    NEW.parent_phone := OLD.parent_phone;
    NEW.academic_number := OLD.academic_number;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS prevent_teacher_pii_update ON public.students;
CREATE TRIGGER prevent_teacher_pii_update
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_teacher_pii_update();
