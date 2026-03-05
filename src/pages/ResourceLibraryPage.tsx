import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  Ruler, Lightbulb, Pen, Save, X, ClipboardList, Zap, Magnet, Waves, Tag
} from "lucide-react";

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

export default function ResourceLibraryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [filterClassId, setFilterClassId] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchClasses();
    fetchFolders();
  }, [fetchClasses, fetchFolders]);

  const handleCreateFolder = async () => {
    if (!newTitle.trim() || !newClassId || !user) return;
    setCreating(true);
    const { error } = await supabase.from("resource_folders").insert({
      title: newTitle.trim(),
      icon: newIcon,
      class_id: newClassId,
      created_by: user.id,
      category: newCategory,
    } as any);
    setCreating(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم إنشاء الحقيبة بنجاح" });
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !selectedFolder) return;
    setUploading(true);

    const files = Array.from(e.target.files);
    for (const file of files) {
      const filePath = `${selectedFolder.id}/${Date.now()}_${file.name}`;
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
    fetchFolders();
    e.target.value = "";
  };

  const handleDeleteFile = async (fileId: string) => {
    await supabase.from("resource_files").delete().eq("id", fileId);
    if (selectedFolder) openFolderDetail(selectedFolder);
    fetchFolders();
  };

  const filteredFolders = folders.filter(f => {
    const classMatch = filterClassId === "all" || f.class_id === filterClassId;
    const categoryMatch = filterCategory === "all" || (f as any).category === filterCategory;
    return classMatch && categoryMatch;
  });

  const getClassLabel = (folder: ResourceFolder) => {
    const c = folder.classes;
    return c ? `${c.grade}/${c.section}` : "";
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مكتبة مصادر الفصول</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة حقائب الملفات والمصادر التعليمية لكل شعبة</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl">
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
                <Label>الشعبة</Label>
                <Select value={newClassId} onValueChange={setNewClassId}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue placeholder="اختر الشعبة" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} - {c.grade}/{c.section}</SelectItem>
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

      {/* Filter Bars */}
      <div className="space-y-3">
        {/* Class filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">الشعبة:</span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterClassId("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filterClassId === "all"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              الكل
            </button>
            {classes.map(c => (
              <button
                key={c.id}
                onClick={() => setFilterClassId(c.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filterClassId === c.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {c.grade}/{c.section}
              </button>
            ))}
          </div>
        </div>

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
                  ? "bg-accent text-accent-foreground shadow-md"
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
                    ? "bg-accent text-accent-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredFolders.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <FolderOpen className="h-14 w-14 text-muted-foreground/30" />
            <p className="text-muted-foreground">لا توجد حقائب ملفات بعد</p>
            <p className="text-xs text-muted-foreground/60">أنشئ حقيبة جديدة لبدء تنظيم الملفات</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFolders.map(folder => {
            const IconComp = getIconComponent(folder.icon);
            return (
              <Card
                key={folder.id}
                className="group cursor-pointer border-border/60 hover:border-primary/40 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden"
                onClick={() => openFolderDetail(folder)}
              >
                <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <IconComp className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-base leading-tight">{folder.title}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <Badge variant="secondary" className="rounded-full text-xs">
                      {getClassLabel(folder)}
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-xs">
                      {getCategoryLabel(folder.category)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <File className="h-3.5 w-3.5" />
                    <span>{folder.file_count || 0} ملف</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
                      <Label>الشعبة</Label>
                      <Select value={editClassId} onValueChange={setEditClassId}>
                        <SelectTrigger className="mt-1 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} - {c.grade}/{c.section}</SelectItem>
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
                          <Badge variant="outline" className="rounded-full text-[10px]">{getClassLabel(selectedFolder)}</Badge>
                          <Badge variant="secondary" className="rounded-full text-[10px]">{getCategoryLabel(selectedFolder.category)}</Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={startEditing} className="gap-1.5 text-muted-foreground hover:text-primary">
                      <Pen className="h-3.5 w-3.5" /> تعديل
                    </Button>
                  </div>
                )}
              </DialogHeader>

              {!editing && (
                <>
                  {/* Upload */}
                  <div className="mt-4">
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-primary/30 rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors">
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <Upload className="h-5 w-5 text-primary" />
                      )}
                      <span className="text-sm font-medium text-primary">
                        {uploading ? "جاري الرفع..." : "رفع ملفات"}
                      </span>
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
                      folderFiles.map(file => (
                        <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                          <FileText className="h-5 w-5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                            <p className="text-[11px] text-muted-foreground">{formatFileSize(file.file_size)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Delete folder */}
                  <div className="mt-6 pt-4 border-t border-border">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full rounded-xl gap-2"
                      onClick={() => handleDeleteFolder(selectedFolder.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف الحقيبة
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
