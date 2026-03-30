
-- Issue 1: Attach the existing prevent_teacher_pii_update function as a BEFORE UPDATE trigger
CREATE TRIGGER trg_prevent_teacher_pii_update
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_teacher_pii_update();

-- Issue 2: Drop the overly broad storage policy on activities bucket
DROP POLICY IF EXISTS "Authenticated can view activities files" ON storage.objects;
