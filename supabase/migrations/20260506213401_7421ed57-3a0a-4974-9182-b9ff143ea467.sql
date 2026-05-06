CREATE POLICY "Students (anon) can view visible resource_folders"
ON public.resource_folders
FOR SELECT
TO anon
USING (visible_to_students = true);