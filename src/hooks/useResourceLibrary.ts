import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ClassInfo, ResourceFolder, ResourceFile } from "@/components/library/constants";

export function useResourceLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Create folder
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newIcon, setNewIcon] = useState("atom");
  const [newClassId, setNewClassId] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [creating, setCreating] = useState(false);

  // Folder detail
  const [selectedFolder, setSelectedFolder] = useState<ResourceFolder | null>(null);
  const [folderFiles, setFolderFiles] = useState<ResourceFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [allFiles, setAllFiles] = useState<Record<string, ResourceFile[]>>({});

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchClasses = useCallback(async () => {
    const { data } = await supabase.from("classes").select("id, name, grade, section").order("grade");
    if (data) setClasses(data);
  }, []);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("resource_folders")
      .select("*, classes(id, name, grade, section)")
      .order("created_at", { ascending: false });
    if (data) {
      const { data: fileCounts } = await supabase.from("resource_files").select("folder_id");
      const countMap: Record<string, number> = {};
      fileCounts?.forEach((f: any) => { countMap[f.folder_id] = (countMap[f.folder_id] || 0) + 1; });
      setFolders(data.map((f: any) => ({ ...f, file_count: countMap[f.id] || 0 })));
    }
    setLoading(false);
  }, []);

  const fetchAllFilesForFolders = useCallback(async (folderIds: string[]) => {
    if (!folderIds.length) { setAllFiles({}); return; }
    const { data } = await supabase
      .from("resource_files").select("*").in("folder_id", folderIds)
      .order("created_at", { ascending: false });
    const grouped: Record<string, ResourceFile[]> = {};
    data?.forEach((f: any) => {
      if (!grouped[f.folder_id]) grouped[f.folder_id] = [];
      grouped[f.folder_id].push(f);
    });
    setAllFiles(grouped);
  }, []);

  useEffect(() => { fetchClasses(); fetchFolders(); }, [fetchClasses, fetchFolders]);

  useEffect(() => {
    if (selectedClassId) {
      const folderIds = selectedClassId === "__public__"
        ? folders.filter(f => !f.class_id).map(f => f.id)
        : folders.filter(f => f.class_id === selectedClassId).map(f => f.id);
      fetchAllFilesForFolders(folderIds);
    } else {
      setAllFiles({});
    }
  }, [selectedClassId, folders, fetchAllFilesForFolders]);

  const handleCreateFolder = async () => {
    if (!newTitle.trim() || !newClassId || !user) return;
    setCreating(true);
    const isPublic = newClassId === "__public__";
    const targetClassIds = newClassId === "__all__" ? classes.map(c => c.id) : isPublic ? [null] : [newClassId];
    let hasError = false;
    for (const classId of targetClassIds) {
      const { error } = await supabase.from("resource_folders").insert({
        title: newTitle.trim(), icon: newIcon, class_id: classId, created_by: user.id, category: newCategory,
      } as any);
      if (error) { hasError = true; toast({ title: "خطأ", description: error.message, variant: "destructive" }); break; }
    }
    setCreating(false);
    if (!hasError) {
      toast({ title: targetClassIds.length > 1 ? `تم إنشاء الحقيبة في ${targetClassIds.length} فصل` : "تم إنشاء الحقيبة بنجاح" });
      setCreateOpen(false); setNewTitle(""); setNewIcon("atom"); setNewClassId(""); setNewCategory("general");
      fetchFolders();
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const { error } = await supabase.from("resource_folders").delete().eq("id", folderId);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); }
    else { toast({ title: "تم حذف الحقيبة" }); setSelectedFolder(null); setEditing(false); fetchFolders(); }
  };

  const openFolderDetail = async (folder: ResourceFolder) => {
    setSelectedFolder(folder); setEditing(false); setFilesLoading(true);
    const { data } = await supabase.from("resource_files").select("*").eq("folder_id", folder.id).order("created_at", { ascending: false });
    setFolderFiles(data || []); setFilesLoading(false);
  };

  const startEditing = () => {
    if (!selectedFolder) return;
    setEditTitle(selectedFolder.title); setEditIcon(selectedFolder.icon);
    setEditClassId(selectedFolder.class_id); setEditCategory(selectedFolder.category || "general");
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedFolder || !editTitle.trim() || !editClassId) return;
    setSaving(true);
    const { error } = await supabase.from("resource_folders")
      .update({ title: editTitle.trim(), icon: editIcon, class_id: editClassId, category: editCategory } as any)
      .eq("id", selectedFolder.id);
    setSaving(false);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "تم تحديث الحقيبة" }); setEditing(false);
      const { data } = await supabase.from("resource_folders").select("*, classes(id, name, grade, section)").eq("id", selectedFolder.id).single();
      if (data) setSelectedFolder({ ...data, file_count: selectedFolder.file_count } as ResourceFolder);
      fetchFolders();
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length || !selectedFolder) return;
    setUploading(true);
    for (const file of files) {
      const ext = file.name.substring(file.name.lastIndexOf('.'));
      const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = `${selectedFolder.id}/${safeName}`;
      const { error: uploadError } = await supabase.storage.from("library").upload(filePath, file);
      if (uploadError) { toast({ title: "خطأ في رفع الملف", description: uploadError.message, variant: "destructive" }); continue; }
      const { data: urlData } = supabase.storage.from("library").getPublicUrl(filePath);
      await supabase.from("resource_files").insert({ folder_id: selectedFolder.id, file_name: file.name, file_url: urlData.publicUrl, file_size: file.size });
    }
    setUploading(false); toast({ title: `تم رفع ${files.length} ملف بنجاح` });
    openFolderDetail(selectedFolder);
    fetchFolders().then(() => {
      if (selectedClassId) {
        const folderIds = selectedClassId === "__public__"
          ? folders.filter(f => !f.class_id).map(f => f.id)
          : folders.filter(f => f.class_id === selectedClassId).map(f => f.id);
        if (!folderIds.includes(selectedFolder.id)) folderIds.push(selectedFolder.id);
        fetchAllFilesForFolders(folderIds);
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    await uploadFiles(Array.from(e.target.files)); e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    if (!e.dataTransfer.files?.length) return;
    await uploadFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };

  const handleDeleteFile = async (fileId: string, folderId?: string) => {
    await supabase.from("resource_files").delete().eq("id", fileId);
    if (selectedFolder) openFolderDetail(selectedFolder);
    if (folderId) setAllFiles(prev => ({ ...prev, [folderId]: (prev[folderId] || []).filter(f => f.id !== fileId) }));
    fetchFolders();
  };

  const toggleVisibility = async (folderId: string, currentValue: boolean) => {
    const { error } = await supabase.from("resource_folders").update({ visible_to_students: !currentValue } as any).eq("id", folderId);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); }
    else {
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, visible_to_students: !currentValue } : f));
      if (selectedFolder?.id === folderId) setSelectedFolder(prev => prev ? { ...prev, visible_to_students: !currentValue } : prev);
      toast({ title: !currentValue ? "مرئية للطلاب" : "مخفية عن الطلاب" });
    }
  };

  // Computed
  const getPublicFolders = () => folders.filter(f => !f.class_id);
  const getFolderCountForClass = (classId: string) => folders.filter(f => f.class_id === classId).length;
  const publicFolders = getPublicFolders();
  const selectedClassInfo = selectedClassId && selectedClassId !== "__public__" ? classes.find(c => c.id === selectedClassId) : null;
  const selectedClassFolders = selectedClassId
    ? (selectedClassId === "__public__"
      ? publicFolders.filter(f => filterCategory === "all" || f.category === filterCategory)
      : folders.filter(f => f.class_id === selectedClassId).filter(f => filterCategory === "all" || f.category === filterCategory))
    : [];

  return {
    classes, folders, loading, selectedClassId, setSelectedClassId, filterCategory, setFilterCategory,
    createOpen, setCreateOpen, newTitle, setNewTitle, newIcon, setNewIcon, newClassId, setNewClassId,
    newCategory, setNewCategory, creating, handleCreateFolder,
    selectedFolder, setSelectedFolder, folderFiles, filesLoading, uploading, dragging, previewFile, setPreviewFile,
    allFiles, editing, setEditing, editTitle, setEditTitle, editIcon, setEditIcon, editClassId, setEditClassId,
    editCategory, setEditCategory, saving,
    openFolderDetail, startEditing, handleSaveEdit, handleDeleteFolder,
    handleFileUpload, handleDrop, handleDragOver, handleDragLeave, handleDeleteFile, toggleVisibility,
    selectedClassInfo, selectedClassFolders, publicFolders, getFolderCountForClass,
  };
}
