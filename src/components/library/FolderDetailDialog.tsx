import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Trash2, Upload, Loader2, Pen, Save, X, Eye, EyeOff, FileText } from "lucide-react";
import { FilePreviewDialog, PreviewButton, isPreviewable, isImage } from "@/components/library/FilePreview";
import { IconPicker } from "./IconPicker";
import { CategorySelect } from "./CategorySelect";
import { getIconComponent, getCategoryLabel, formatFileSize } from "./constants";
import type { ClassInfo, ResourceFolder, ResourceFile } from "./constants";

interface FolderDetailDialogProps {
  selectedFolder: ResourceFolder | null;
  onClose: () => void;
  folderFiles: ResourceFile[];
  filesLoading: boolean;
  classes: ClassInfo[];
  selectedClassInfo: ClassInfo | null;
  isViewOnly: boolean;
  // Edit
  editing: boolean;
  editTitle: string; setEditTitle: (v: string) => void;
  editIcon: string; setEditIcon: (v: string) => void;
  editClassId: string; setEditClassId: (v: string) => void;
  editCategory: string; setEditCategory: (v: string) => void;
  saving: boolean;
  onStartEditing: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  // Upload
  uploading: boolean;
  dragging: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  // Actions
  onDeleteFolder: (id: string) => void;
  onDeleteFile: (fileId: string, folderId?: string) => void;
  onToggleVisibility: (folderId: string, currentValue: boolean) => void;
  previewFile: { url: string; name: string } | null;
  setPreviewFile: (f: { url: string; name: string } | null) => void;
}

export function FolderDetailDialog(props: FolderDetailDialogProps) {
  const { selectedFolder, onClose, folderFiles, filesLoading, classes, selectedClassInfo, isViewOnly,
    editing, editTitle, setEditTitle, editIcon, setEditIcon, editClassId, setEditClassId, editCategory, setEditCategory,
    saving, onStartEditing, onSaveEdit, onCancelEdit,
    uploading, dragging, onFileUpload, onDrop, onDragOver, onDragLeave,
    onDeleteFolder, onDeleteFile, onToggleVisibility, previewFile, setPreviewFile } = props;

  return (
    <>
      <Dialog open={!!selectedFolder} onOpenChange={open => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          {selectedFolder && (
            <>
              <DialogHeader>
                {editing ? (
                  <div className="space-y-3">
                    <div><Label>عنوان الحقيبة</Label><Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="mt-1 rounded-xl" /></div>
                    <div>
                      <Label>الفصل</Label>
                      <Select value={editClassId} onValueChange={setEditClassId}>
                        <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>{classes.map(c => (<SelectItem key={c.id} value={c.id}>{c.grade}/{c.section}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>التصنيف</Label><CategorySelect value={editCategory} onChange={setEditCategory} /></div>
                    <div><Label>الأيقونة</Label><IconPicker value={editIcon} onChange={setEditIcon} /></div>
                    <div className="flex gap-2">
                      <Button onClick={onSaveEdit} disabled={saving || !editTitle.trim() || !editClassId} className="flex-1 rounded-xl gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> حفظ</>}
                      </Button>
                      <Button variant="outline" onClick={onCancelEdit} className="rounded-xl gap-2"><X className="h-4 w-4" /> إلغاء</Button>
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
                    {!isViewOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onToggleVisibility(selectedFolder.id, selectedFolder.visible_to_students)}
                          className={cn("p-2 rounded-xl transition-all", selectedFolder.visible_to_students ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 dark:bg-emerald-500/20" : "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 dark:bg-rose-500/20")}
                          title={selectedFolder.visible_to_students ? "مرئية للطلاب" : "مخفية عن الطلاب"}
                        >
                          {selectedFolder.visible_to_students ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <Button variant="ghost" size="sm" onClick={onStartEditing} className="gap-1.5 text-muted-foreground hover:text-primary">
                          <Pen className="h-3.5 w-3.5" /> تعديل
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </DialogHeader>

              {!editing && (
                <>
                  {!isViewOnly && (
                    <div className="mt-4" onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
                      <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${dragging ? "border-primary bg-primary/10 scale-[1.02]" : "border-primary/30 hover:bg-primary/5"}`}>
                        {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className={`h-6 w-6 text-primary transition-transform ${dragging ? "scale-125" : ""}`} />}
                        <span className="text-sm font-medium text-primary">{uploading ? "جاري الرفع..." : dragging ? "أفلت الملفات هنا..." : "اسحب الملفات هنا أو اضغط للرفع"}</span>
                        <span className="text-[11px] text-muted-foreground">يمكنك سحب عدة ملفات دفعة واحدة</span>
                        <input type="file" multiple className="hidden" onChange={onFileUpload} disabled={uploading} />
                      </label>
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    {filesLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : folderFiles.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">لا توجد ملفات بعد</p>
                    ) : (
                      folderFiles.map(file => {
                        const previewable = isPreviewable(file.file_name);
                        const isImg = isImage(file.file_name);
                        return (
                          <div key={file.id} className={cn("flex items-center gap-3 p-3 rounded-xl bg-muted/50 dark:bg-muted/30 hover:bg-muted dark:hover:bg-muted/40 transition-colors", previewable && "cursor-pointer")}
                            onClick={() => previewable && setPreviewFile({ url: file.file_url, name: file.file_name })}>
                            {isImg ? <img src={file.file_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 border border-border/30" /> : <FileText className="h-5 w-5 text-primary shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                              <p className="text-[11px] text-muted-foreground">{formatFileSize(file.file_size)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <PreviewButton fileName={file.file_name} fileUrl={file.file_url} onPreview={() => setPreviewFile({ url: file.file_url, name: file.file_name })} />
                              <a href={file.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"><Download className="h-4 w-4" /></a>
                              {!isViewOnly && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><button onClick={e => e.stopPropagation()} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button></AlertDialogTrigger>
                                  <AlertDialogContent dir="rtl">
                                    <AlertDialogHeader><AlertDialogTitle>حذف الملف؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف الملف نهائياً.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDeleteFile(file.id, selectedFolder?.id)}>حذف</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {!isViewOnly && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="w-full rounded-xl gap-2"><Trash2 className="h-4 w-4" /> حذف الحقيبة</Button></AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader><AlertDialogTitle>حذف الحقيبة؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف الحقيبة وجميع الملفات بداخلها نهائياً.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDeleteFolder(selectedFolder.id)}>حذف</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {previewFile && <FilePreviewDialog fileUrl={previewFile.url} fileName={previewFile.name} onClose={() => setPreviewFile(null)} />}
    </>
  );
}
