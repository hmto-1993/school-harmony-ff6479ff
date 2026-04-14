import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FolderPlus, Loader2, FolderOpen, ArrowRight, Tag, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";
import { useResourceLibrary } from "@/hooks/useResourceLibrary";
import { CATEGORY_OPTIONS } from "@/components/library/constants";
import { IconPicker } from "@/components/library/IconPicker";
import { CategorySelect } from "@/components/library/CategorySelect";
import { ClassesGrid } from "@/components/library/ClassesGrid";
import { FolderCard } from "@/components/library/FolderCard";
import { FolderDetailDialog } from "@/components/library/FolderDetailDialog";
import QuestionBankTab from "@/components/library/QuestionBankTab";

export default function ResourceLibraryPage() {
  const { perms } = useTeacherPermissions();
  const isViewOnly = perms.read_only_mode;
  const lib = useResourceLibrary();
  const [mainTab, setMainTab] = useState<"library" | "questionbank">("library");

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={v => setMainTab(v as any)} dir="rtl">
        <TabsList className="w-auto justify-start mb-4">
          <TabsTrigger value="library" className="gap-1.5"><FolderOpen className="h-4 w-4" />مكتبة المصادر</TabsTrigger>
          <TabsTrigger value="questionbank" className="gap-1.5"><Brain className="h-4 w-4" />بنك الأسئلة</TabsTrigger>
        </TabsList>
        <TabsContent value="questionbank">
          <QuestionBankTab />
        </TabsContent>
        <TabsContent value="library">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {lib.selectedClassId ? (
            <div className="flex items-center gap-2">
              <button onClick={() => { lib.setSelectedClassId(null); lib.setFilterCategory("all"); }} className="text-sm text-primary hover:underline font-medium">المكتبة</button>
              <ArrowRight className="h-4 w-4 text-muted-foreground rotate-180" />
              <h1 className="text-2xl font-bold text-foreground">
                {lib.selectedClassId === "__public__" ? "عام" : lib.selectedClassInfo ? `${lib.selectedClassInfo.grade}/${lib.selectedClassInfo.section}` : ""}
              </h1>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">مكتبة مصادر الفصول</h1>
              <p className="text-sm text-muted-foreground mt-1">اختر فصلاً للوصول إلى حقائب الملفات والمصادر التعليمية</p>
            </>
          )}
        </div>
        {!isViewOnly && (
          <Dialog open={lib.createOpen} onOpenChange={lib.setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl" onClick={() => { if (lib.selectedClassId) lib.setNewClassId(lib.selectedClassId); }}>
                <FolderPlus className="h-4 w-4" /> حقيبة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
              <DialogHeader><DialogTitle>إنشاء حقيبة ملفات</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>عنوان الحقيبة</Label><Input value={lib.newTitle} onChange={e => lib.setNewTitle(e.target.value)} placeholder="مثال: شهادات الشهر" className="mt-1 rounded-xl" /></div>
                <div>
                  <Label>الفصل</Label>
                  <Select value={lib.newClassId} onValueChange={lib.setNewClassId}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__public__">عام (للجميع)</SelectItem>
                      <SelectItem value="__all__">جميع الفصول</SelectItem>
                      {lib.classes.map(c => (<SelectItem key={c.id} value={c.id}>{c.grade}/{c.section}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>التصنيف</Label><CategorySelect value={lib.newCategory} onChange={lib.setNewCategory} /></div>
                <div><Label>الأيقونة</Label><IconPicker value={lib.newIcon} onChange={lib.setNewIcon} /></div>
                <Button onClick={lib.handleCreateFolder} disabled={lib.creating || !lib.newTitle.trim() || !lib.newClassId} className="w-full rounded-xl">
                  {lib.creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {lib.loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !lib.selectedClassId ? (
        <ClassesGrid classes={lib.classes} onSelectClass={lib.setSelectedClassId} />
      ) : (
        <>
          {/* Category filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> التصنيف:</span>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => lib.setFilterCategory("all")} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${lib.filterCategory === "all" ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>الكل</button>
              {CATEGORY_OPTIONS.map(cat => (
                <button key={cat.value} onClick={() => lib.setFilterCategory(cat.value)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${lib.filterCategory === cat.value ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{cat.label}</button>
              ))}
            </div>
          </div>

          {lib.selectedClassFolders.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                <FolderOpen className="h-14 w-14 text-muted-foreground/30" />
                <p className="text-muted-foreground">لا توجد حقائب في هذا الفصل</p>
                <p className="text-xs text-muted-foreground/60">أنشئ حقيبة جديدة لبدء تنظيم الملفات</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lib.selectedClassFolders.map(folder => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  files={lib.allFiles[folder.id] || []}
                  isViewOnly={isViewOnly}
                  onOpenDetail={lib.openFolderDetail}
                  onToggleVisibility={lib.toggleVisibility}
                  onDeleteFile={lib.handleDeleteFile}
                  onPreviewFile={lib.setPreviewFile}
                />
              ))}
            </div>
          )}
        </>
      )}

      <FolderDetailDialog
        selectedFolder={lib.selectedFolder}
        onClose={() => { lib.setSelectedFolder(null); lib.setEditing(false); }}
        folderFiles={lib.folderFiles}
        filesLoading={lib.filesLoading}
        classes={lib.classes}
        selectedClassInfo={lib.selectedClassInfo}
        isViewOnly={isViewOnly}
        editing={lib.editing}
        editTitle={lib.editTitle} setEditTitle={lib.setEditTitle}
        editIcon={lib.editIcon} setEditIcon={lib.setEditIcon}
        editClassId={lib.editClassId} setEditClassId={lib.setEditClassId}
        editCategory={lib.editCategory} setEditCategory={lib.setEditCategory}
        saving={lib.saving}
        onStartEditing={lib.startEditing}
        onSaveEdit={lib.handleSaveEdit}
        onCancelEdit={() => lib.setEditing(false)}
        uploading={lib.uploading}
        dragging={lib.dragging}
        onFileUpload={lib.handleFileUpload}
        onDrop={lib.handleDrop}
        onDragOver={lib.handleDragOver}
        onDragLeave={lib.handleDragLeave}
        onDeleteFolder={lib.handleDeleteFolder}
        onDeleteFile={lib.handleDeleteFile}
        onToggleVisibility={lib.toggleVisibility}
        previewFile={lib.previewFile}
        setPreviewFile={lib.setPreviewFile}
      />
        </TabsContent>
      </Tabs>
    </div>
  );
}
