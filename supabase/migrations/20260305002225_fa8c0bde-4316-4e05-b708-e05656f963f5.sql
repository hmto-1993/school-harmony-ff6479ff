
-- Create resource_folders table
CREATE TABLE public.resource_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'folder',
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resource_files table
CREATE TABLE public.resource_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID REFERENCES public.resource_folders(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resource_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for resource_folders
CREATE POLICY "Authenticated can view resource_folders" ON public.resource_folders FOR SELECT USING (true);
CREATE POLICY "Admins can manage resource_folders" ON public.resource_folders FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can insert resource_folders" ON public.resource_folders FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Teachers can update own resource_folders" ON public.resource_folders FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Teachers can delete own resource_folders" ON public.resource_folders FOR DELETE USING (created_by = auth.uid());

-- RLS policies for resource_files
CREATE POLICY "Authenticated can view resource_files" ON public.resource_files FOR SELECT USING (true);
CREATE POLICY "Admins can manage resource_files" ON public.resource_files FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can insert resource_files" ON public.resource_files FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.resource_folders rf WHERE rf.id = resource_files.folder_id AND rf.created_by = auth.uid())
);
CREATE POLICY "Teachers can delete resource_files" ON public.resource_files FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.resource_folders rf WHERE rf.id = resource_files.folder_id AND rf.created_by = auth.uid())
);
