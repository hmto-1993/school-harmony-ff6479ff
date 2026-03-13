import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FolderOpen, FileText, Download, Trash2, Upload, FolderPlus, File, FileSpreadsheet, Loader2,
  BookOpen, FlaskConical, Microscope, Calculator, Atom, GraduationCap, Brain, TestTube2,
  Ruler, Lightbulb, Pen, Save, X, ClipboardList, Zap, Magnet, Waves, Tag, ArrowRight, School, Plus, Globe,
  Eye, EyeOff
} from "lucide-react";
import { FilePreviewDialog, PreviewButton, isPreviewable, isImage, getFileIcon } from "@/components/library/FilePreview";

interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  section: string;
}

interface ResourceFolder {
  id: string;
  title: string;
  icon: string;
  class_id: string;
  created_by: string;
  created_at: string;
  category: string;
  visible_to_students: boolean;
  classes?: ClassInfo;
  file_count?: number;
}

interface ResourceFile {
  id: string;
  folder_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  created_at: string;
}

const CATEGORY_OPTIONS = [
  { value: "general", label: "عام" },
  { value: "certificates", label: "شهادات" },
  { value: "worksheets", label: "أوراق عمل" },
  { value: "exams", label: "اختبارات" },
  { value: "notes", label: "مذكرات" },
  { value: "books", label: "كتب" },
  { value: "experiments", label: "تجارب" },
  { value: "reviews", label: "مراجعات" },
];

function getCategoryLabel(value: string) {
  return CATEGORY_OPTIONS.find(c => c.value === value)?.label || "عام";
}

const ICON_OPTIONS = [
  { value: "atom", label: "فيزياء", icon: Atom },
  { value: "book", label: "الكتاب", icon: BookOpen },
  { value: "graduation", label: "شهادة", icon: GraduationCap },
  { value: "file", label: "مذكرة", icon: FileText },
  { value: "sheet", label: "أوراق عمل", icon: FileSpreadsheet },
  { value: "testtube", label: "تجارب", icon: TestTube2 },
  { value: "calculator", label: "حسابات", icon: Calculator },
  { value: "ruler", label: "قياسات", icon: Ruler },
  { value: "lightbulb", label: "قوانين", icon: Lightbulb },
  { value: "brain", label: "مراجعة", icon: Brain },
  { value: "microscope", label: "مختبر", icon: Microscope },
  { value: "clipboard", label: "اختبارات", icon: ClipboardList },
  { value: "flask", label: "معمل", icon: FlaskConical },
  { value: "zap", label: "كهرباء", icon: Zap },
  { value: "magnet", label: "مغناطيسية", icon: Magnet },
  { value: "waves", label: "موجات", icon: Waves },
];

function getIconComponent(iconName: string) {
  const found = ICON_OPTIONS.find(o => o.value === iconName);
  return found ? found.icon : FolderOpen;
}

function formatFileSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Color palette for class bags
const CLASS_COLORS = [
  { bg: "bg-blue-500/10", icon: "text-blue-500", border: "border-blue-500/20", hoverBg: "hover:bg-blue-500/15" },
  { bg: "bg-emerald-500/10", icon: "text-emerald-500", border: "border-emerald-500/20", hoverBg: "hover:bg-emerald-500/15" },
  { bg: "bg-violet-500/10", icon: "text-violet-500", border: "border-violet-500/20", hoverBg: "hover:bg-violet-500/15" },
  { bg: "bg-amber-500/10", icon: "text-amber-500", border: "border-amber-500/20", hoverBg: "hover:bg-amber-500/15" },
  { bg: "bg-rose-500/10", icon: "text-rose-500", border: "border-rose-500/20", hoverBg: "hover:bg-rose-500/15" },
  { bg: "bg-cyan-500/10", icon: "text-cyan-500", border: "border-cyan-500/20", hoverBg: "hover:bg-cyan-500/15" },
  { bg: "bg-orange-500/10", icon: "text-orange-500", border: "border-orange-500/20", hoverBg: "hover:bg-orange-500/15" },
  { bg: "bg-pink-500/10", icon: "text-pink-500", border: "border-pink-500/20", hoverBg: "hover:bg-pink-500/15" },
];

export default function ResourceLibraryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [loading, setLoading] = useState(true);

  // Two-level navigation: null = show classes, string = show folders inside that class
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Create folder dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newIcon, setNewIcon] = useState("atom");
  const [newClassId, setNewClassId] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [creating, setCreating] = useState(false);

  // Folder detail dialog
  const [selectedFolder, setSelectedFolder] = useState<ResourceFolder | null>(null);
  const [folderFiles, setFolderFiles] = useState<ResourceFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  // Files mapped by folder_id for inline display
  const [allFiles, setAllFiles] = useState<Record<string, ResourceFile[]>>({});

  // Edit mode inside folder detail
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
      const { data: fileCounts } = await supabase
        .from("resource_files")
        .select("folder_id");

      const countMap: Record<string, number> = {};
      fileCounts?.forEach((f: any) => {
        countMap[f.folder_id] = (countMap[f.folder_id] || 0) + 1;
      });

      setFolders(data.map((f: any) => ({ ...f, file_count: countMap[f.id] || 0 })));
    }
    setLoading(false);
  }, []);

  const fetchAllFilesForFolders = useCallback(async (folderIds: string[]) => {
    if (!folderIds.length) { setAllFiles({}); return; }
    const { data } = await supabase
      .from("resource_files")
      .select("*")
      .in("folder_id", folderIds)
      .order("created_at", { ascending: false });
    
    const grouped: Record<string, ResourceFile[]> = {};
    data?.forEach((f: any) => {
      if (!grouped[f.folder_id]) grouped[f.folder_id] = [];
      grouped[f.folder_id].push(f);
    });
    setAllFiles(grouped);
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchFolders();
  }, [fetchClasses, fetchFolders]);

  // Fetch files for all folders in the selected class
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
        title: newTitle.trim(),
        icon: newIcon,
        class_id: classId,
        created_by: user.id,
        category: newCategory,
      } as any);
      if (error) {
        hasError = true;
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
        break;
      }
    }

    setCreating(false);
    if (!hasError) {
      toast({ title: targetClassIds.length > 1 ? `تم إنشاء الحقيبة في ${targetClassIds.length} فصل` : "تم إنشاء الحقيبة بنجاح" });
      setCreateOpen(false);
      setNewTitle("");
      setNewIcon("atom");
      setNewClassId("");
      setNewCategory("general");
      fetchFolders();
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const { error } = await supabase.from("resource_folders").delete().eq("id", folderId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حذف الحقيبة" });
      setSelectedFolder(null);
      setEditing(false);
      fetchFolders();
    }
  };

  const openFolderDetail = async (folder: ResourceFolder) => {
    setSelectedFolder(folder);
    setEditing(false);
    setFilesLoading(true);
    const { data } = await supabase
      .from("resource_files")
      .select("*")
      .eq("folder_id", folder.id)
      .order("created_at", { ascending: false });
    setFolderFiles(data || []);
    setFilesLoading(false);
  };

  const startEditing = () => {
    if (!selectedFolder) return;
    setEditTitle(selectedFolder.title);
    setEditIcon(selectedFolder.icon);
    setEditClassId(selectedFolder.class_id);
    setEditCategory(selectedFolder.category || "general");
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedFolder || !editTitle.trim() || !editClassId) return;
    setSaving(true);
    const { error } = await supabase
      .from("resource_folders")
      .update({ title: editTitle.trim(), icon: editIcon, class_id: editClassId, category: editCategory } as any)
      .eq("id", selectedFolder.id);
    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم تحديث الحقيبة" });
      setEditing(false);
      const { data } = await supabase
        .from("resource_folders")
        .select("*, classes(id, name, grade, section)")
        .eq("id", selectedFolder.id)
        .single();
      if (data) {
        setSelectedFolder({ ...data, file_count: selectedFolder.file_count } as ResourceFolder);
      }
      fetchFolders();
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length || !selectedFolder) return;
    setUploading(true);

    for (const file of files) {
      // Sanitize filename: replace non-ASCII chars with transliterated safe name, keep extension
      const ext = file.name.substring(file.name.lastIndexOf('.'));
      const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = `${selectedFolder.id}/${safeName}`;
      const { error: uploadError } = await supabase.storage.from("library").upload(filePath, file);
      if (uploadError) {
        toast({ title: "خطأ في رفع الملف", description: uploadError.message, variant: "destructive" });
        continue;
      }
      const { data: urlData } = supabase.storage.from("library").getPublicUrl(filePath);
      await supabase.from("resource_files").insert({
        folder_id: selectedFolder.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
      });
    }

    setUploading(false);
    toast({ title: `تم رفع ${files.length} ملف بنجاح` });
    openFolderDetail(selectedFolder);
    fetchFolders().then(() => {
      // Refresh inline files after folders update
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
    await uploadFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (!e.dataTransfer.files?.length) return;
    await uploadFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDeleteFile = async (fileId: string, folderId?: string) => {
    await supabase.from("resource_files").delete().eq("id", fileId);
    if (selectedFolder) openFolderDetail(selectedFolder);
    // Also update inline files
    if (folderId) {
      setAllFiles(prev => ({
        ...prev,
        [folderId]: (prev[folderId] || []).filter(f => f.id !== fileId),
      }));
    }
    fetchFolders();
  };

  const toggleVisibility = async (folderId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("resource_folders")
      .update({ visible_to_students: !currentValue } as any)
      .eq("id", folderId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, visible_to_students: !currentValue } : f));
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(prev => prev ? { ...prev, visible_to_students: !currentValue } : prev);
      }
      toast({ title: !currentValue ? "مرئية للطلاب" : "مخفية عن الطلاب" });
    }
  };

  // Group folders by class
  const getFoldersForClass = (classId: string) => {
    return folders.filter(f => f.class_id === classId);
  };

  const getPublicFolders = () => folders.filter(f => !f.class_id);

  const getFolderCountForClass = (classId: string) => {
    return folders.filter(f => f.class_id === classId).length;
  };

  const getFileCountForClass = (classId: string) => {
    return folders.filter(f => f.class_id === classId).reduce((sum, f) => sum + (f.file_count || 0), 0);
  };

  // Classes that have folders
  const classesWithFolders = classes.filter(c => getFolderCountForClass(c.id) > 0);
  const classesWithoutFolders = classes.filter(c => getFolderCountForClass(c.id) === 0);
  const publicFolders = getPublicFolders();

  const selectedClassInfo = selectedClassId && selectedClassId !== "__public__" ? classes.find(c => c.id === selectedClassId) : null;
  const selectedClassFolders = selectedClassId
    ? (selectedClassId === "__public__"
      ? publicFolders.filter(f => filterCategory === "all" || f.category === filterCategory)
      : getFoldersForClass(selectedClassId).filter(f => filterCategory === "all" || f.category === filterCategory))
    : [];

  const getClassColor = (index: number) => CLASS_COLORS[index % CLASS_COLORS.length];

  const IconPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div className="grid grid-cols-4 gap-2 mt-2">
      {ICON_OPTIONS.map(opt => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
              value === opt.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );

  const CategorySelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="mt-1 rounded-xl">
        <SelectValue placeholder="اختر التصنيف" />
      </SelectTrigger>
      <SelectContent>
        {CATEGORY_OPTIONS.map(c => (
          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {selectedClassId ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSelectedClassId(null); setFilterCategory("all"); }}
                className="text-sm text-primary hover:underline font-medium"
              >
                المكتبة
              </button>
              <ArrowRight className="h-4 w-4 text-muted-foreground rotate-180" />
              <h1 className="text-2xl font-bold text-foreground">
                {selectedClassId === "__public__" ? "عام" : selectedClassInfo ? `${selectedClassInfo.grade}/${selectedClassInfo.section}` : ""}
              </h1>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">مكتبة مصادر الفصول</h1>
              <p className="text-sm text-muted-foreground mt-1">اختر فصلاً للوصول إلى حقائب الملفات والمصادر التعليمية</p>
            </>
          )}
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl" onClick={() => { if (selectedClassId) setNewClassId(selectedClassId); }}>
              <FolderPlus className="h-4 w-4" />
              حقيبة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء حقيبة ملفات</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>عنوان الحقيبة</Label>
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="مثال: شهادات الشهر"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                 <Label>الفصل</Label>
                <Select value={newClassId} onValueChange={setNewClassId}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue placeholder="اختر الفصل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__public__">عام (للجميع)</SelectItem>
                    <SelectItem value="__all__">جميع الفصول</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.grade}/{c.section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>التصنيف</Label>
                <CategorySelect value={newCategory} onChange={setNewCategory} />
              </div>
              <div>
                <Label>الأيقونة</Label>
                <IconPicker value={newIcon} onChange={setNewIcon} />
              </div>
              <Button onClick={handleCreateFolder} disabled={creating || !newTitle.trim() || !newClassId} className="w-full rounded-xl">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !selectedClassId ? (
        /* ===== LEVEL 1: Class Bags Grid ===== */
        <>
          {classesWithFolders.length === 0 && classesWithoutFolders.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                <School className="h-14 w-14 text-muted-foreground/30" />
                <p className="text-muted-foreground">لا توجد شعب مسجلة بعد</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {/* Public/General Card */}
              <Card
                className="group cursor-pointer border-2 border-amber-500/20 hover:bg-amber-500/15 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden"
                onClick={() => setSelectedClassId("__public__")}
              >
                <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Globe className="h-10 w-10 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm leading-tight">عام</h3>
                  </div>
                </CardContent>
              </Card>
              {classes.map((cls, index) => {
                const color = getClassColor(index);
                return (
                  <Card
                    key={cls.id}
                    className={`group cursor-pointer border-2 ${color.border} ${color.hoverBg} hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden`}
                    onClick={() => setSelectedClassId(cls.id)}
                  >
                    <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
                      <div className={`w-20 h-20 rounded-2xl ${color.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <School className={`h-10 w-10 ${color.icon}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm leading-tight">{cls.grade} / {cls.section}</h3>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ===== LEVEL 2: Folders inside selected class ===== */
        <>
          {/* Category filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" /> التصنيف:
            </span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterCategory("all")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filterCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                الكل
              </button>
              {CATEGORY_OPTIONS.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setFilterCategory(cat.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    filterCategory === cat.value
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Folders Grid */}
          {selectedClassFolders.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                <FolderOpen className="h-14 w-14 text-muted-foreground/30" />
                <p className="text-muted-foreground">لا توجد حقائب في هذا الفصل</p>
                <p className="text-xs text-muted-foreground/60">أنشئ حقيبة جديدة لبدء تنظيم الملفات</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedClassFolders.map(folder => {
                const IconComp = getIconComponent(folder.icon);
                const isHidden = folder.visible_to_students === false;
                const folderFilesList = allFiles[folder.id] || [];
                return (
                  <Card
                    key={folder.id}
                    className={cn(
                      "group border-border/60 hover:border-primary/40 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden relative",
                      isHidden && "opacity-60"
                    )}
                  >
                    {/* Eye toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleVisibility(folder.id, folder.visible_to_students); }}
                      className={cn(
                        "absolute top-3 left-14 z-10 p-1.5 rounded-xl transition-all duration-200",
                        isHidden
                          ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 dark:bg-rose-500/20 dark:hover:bg-rose-500/30"
                          : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30"
                      )}
                      title={isHidden ? "مخفية عن الطلاب - اضغط للإظهار" : "مرئية للطلاب - اضغط للإخفاء"}
                    >
                      {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>

                    {/* Folder Header - clickable to open detail */}
                    <div
                      className="p-4 pb-2 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => openFolderDetail(folder)}
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
                        <IconComp className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-sm leading-tight truncate">{folder.title}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="rounded-full text-[10px]">
                            {getCategoryLabel(folder.category)}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">{folder.file_count || 0} ملف</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-primary">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Files List inside card */}
                    <CardContent className="px-4 pt-1 pb-3">
                      {folderFilesList.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground/60 text-center py-3">لا توجد ملفات بعد</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {folderFilesList.map(file => {
                            const previewable = isPreviewable(file.file_name);
                            const isImg = isImage(file.file_name);
                            return (
                              <div
                                key={file.id}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-lg bg-muted/40 dark:bg-muted/20 hover:bg-muted/70 dark:hover:bg-muted/40 transition-colors group/file",
                                  previewable && "cursor-pointer"
                                )}
                                onClick={() => previewable && setPreviewFile({ url: file.file_url, name: file.file_name })}
                              >
                                {isImg ? (
                                  <img src={file.file_url} alt="" className="h-8 w-8 rounded object-cover shrink-0 border border-border/30" />
                                ) : (
                                  getFileIcon(file.file_name)
                                )}
                                <span className="text-xs text-foreground truncate flex-1 min-w-0">{file.file_name}</span>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover/file:opacity-100 transition-opacity shrink-0">
                                  <a
                                    href={file.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <button
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent dir="rtl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>حذف الملف؟</AlertDialogTitle>
                                        <AlertDialogDescription>سيتم حذف الملف نهائياً.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteFile(file.id, folder.id)}>حذف</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Folder Detail Dialog */}
      <Dialog open={!!selectedFolder} onOpenChange={open => { if (!open) { setSelectedFolder(null); setEditing(false); } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          {selectedFolder && (
            <>
              <DialogHeader>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <Label>عنوان الحقيبة</Label>
                      <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="mt-1 rounded-xl" />
                    </div>
                    <div>
                      <Label>الفصل</Label>
                      <Select value={editClassId} onValueChange={setEditClassId}>
                        <SelectTrigger className="mt-1 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.grade}/{c.section}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>التصنيف</Label>
                      <CategorySelect value={editCategory} onChange={setEditCategory} />
                    </div>
                    <div>
                      <Label>الأيقونة</Label>
                      <IconPicker value={editIcon} onChange={setEditIcon} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEdit} disabled={saving || !editTitle.trim() || !editClassId} className="flex-1 rounded-xl gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> حفظ</>}
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(false)} className="rounded-xl gap-2">
                        <X className="h-4 w-4" /> إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {(() => { const IC = getIconComponent(selectedFolder.icon); return <IC className="h-6 w-6 text-primary" />; })()}
                      <div>
                        <DialogTitle className="text-lg">{selectedFolder.title}</DialogTitle>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="rounded-full text-[10px]">{selectedClassInfo ? `${selectedClassInfo.grade}/${selectedClassInfo.section}` : ""}</Badge>
                          <Badge variant="secondary" className="rounded-full text-[10px]">{getCategoryLabel(selectedFolder.category)}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleVisibility(selectedFolder.id, selectedFolder.visible_to_students)}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          selectedFolder.visible_to_students
                            ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 dark:bg-emerald-500/20"
                            : "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 dark:bg-rose-500/20"
                        )}
                        title={selectedFolder.visible_to_students ? "مرئية للطلاب" : "مخفية عن الطلاب"}
                      >
                        {selectedFolder.visible_to_students ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <Button variant="ghost" size="sm" onClick={startEditing} className="gap-1.5 text-muted-foreground hover:text-primary">
                        <Pen className="h-3.5 w-3.5" /> تعديل
                      </Button>
                    </div>
                  </div>
                )}
              </DialogHeader>

              {!editing && (
                <>
                  {/* Upload with Drag & Drop */}
                  <div
                    className="mt-4"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                      dragging
                        ? "border-primary bg-primary/10 scale-[1.02]"
                        : "border-primary/30 hover:bg-primary/5"
                    }`}>
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      ) : (
                        <Upload className={`h-6 w-6 text-primary transition-transform ${dragging ? "scale-125" : ""}`} />
                      )}
                      <span className="text-sm font-medium text-primary">
                        {uploading ? "جاري الرفع..." : dragging ? "أفلت الملفات هنا..." : "اسحب الملفات هنا أو اضغط للرفع"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">يمكنك سحب عدة ملفات دفعة واحدة</span>
                      <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                  </div>

                  {/* File List */}
                  <div className="mt-4 space-y-2">
                    {filesLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : folderFiles.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">لا توجد ملفات بعد</p>
                    ) : (
                      folderFiles.map(file => {
                        const previewable = isPreviewable(file.file_name);
                        const isImg = isImage(file.file_name);
                        return (
                          <div
                            key={file.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl bg-muted/50 dark:bg-muted/30 hover:bg-muted dark:hover:bg-muted/40 transition-colors",
                              previewable && "cursor-pointer"
                            )}
                            onClick={() => previewable && setPreviewFile({ url: file.file_url, name: file.file_name })}
                          >
                            {isImg ? (
                              <img src={file.file_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 border border-border/30" />
                            ) : (
                              <FileText className="h-5 w-5 text-primary shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                              <p className="text-[11px] text-muted-foreground">{formatFileSize(file.file_size)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <PreviewButton fileName={file.file_name} fileUrl={file.file_url} onPreview={() => setPreviewFile({ url: file.file_url, name: file.file_name })} />
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent dir="rtl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>حذف الملف؟</AlertDialogTitle>
                                    <AlertDialogDescription>سيتم حذف الملف نهائياً.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteFile(file.id, selectedFolder?.id)}>حذف</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Delete folder */}
                  <div className="mt-6 pt-4 border-t border-border">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full rounded-xl gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف الحقيبة
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف الحقيبة؟</AlertDialogTitle>
                          <AlertDialogDescription>سيتم حذف الحقيبة وجميع الملفات بداخلها نهائياً.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteFolder(selectedFolder.id)}>حذف</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      {previewFile && (
        <FilePreviewDialog
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
