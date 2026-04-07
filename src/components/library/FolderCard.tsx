import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, Download, Trash2, Eye, EyeOff } from "lucide-react";
import { isPreviewable, isImage, getFileIcon } from "@/components/library/FilePreview";
import { getIconComponent, getCategoryLabel } from "./constants";
import type { ResourceFolder, ResourceFile } from "./constants";

interface FolderCardProps {
  folder: ResourceFolder;
  files: ResourceFile[];
  isViewOnly: boolean;
  onOpenDetail: (folder: ResourceFolder) => void;
  onToggleVisibility: (folderId: string, currentValue: boolean) => void;
  onDeleteFile: (fileId: string, folderId: string) => void;
  onPreviewFile: (file: { url: string; name: string }) => void;
}

export function FolderCard({ folder, files, isViewOnly, onOpenDetail, onToggleVisibility, onDeleteFile, onPreviewFile }: FolderCardProps) {
  const IconComp = getIconComponent(folder.icon);
  const isHidden = folder.visible_to_students === false;

  return (
    <Card className={cn(
      "group border-border/60 hover:border-primary/40 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden relative",
      isHidden && "opacity-60"
    )}>
      {!isViewOnly && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(folder.id, folder.visible_to_students); }}
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
      )}

      <div className="p-4 pb-2 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onOpenDetail(folder)}>
        <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
          <IconComp className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-sm leading-tight truncate">{folder.title}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="outline" className="rounded-full text-[10px]">{getCategoryLabel(folder.category)}</Badge>
            <span className="text-[11px] text-muted-foreground">{folder.file_count || 0} ملف</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-primary">
          <Upload className="h-4 w-4" />
        </Button>
      </div>

      <CardContent className="px-4 pt-1 pb-3">
        {files.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/60 text-center py-3">لا توجد ملفات بعد</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {files.map(file => {
              const previewable = isPreviewable(file.file_name);
              const isImg = isImage(file.file_name);
              return (
                <div
                  key={file.id}
                  className={cn("flex items-center gap-2 p-2 rounded-lg bg-muted/40 dark:bg-muted/20 hover:bg-muted/70 dark:hover:bg-muted/40 transition-colors group/file", previewable && "cursor-pointer")}
                  onClick={() => previewable && onPreviewFile({ url: file.file_url, name: file.file_name })}
                >
                  {isImg ? (
                    <img src={file.file_url} alt="" className="h-8 w-8 rounded object-cover shrink-0 border border-border/30" />
                  ) : getFileIcon(file.file_name)}
                  <span className="text-xs text-foreground truncate flex-1 min-w-0">{file.file_name}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover/file:opacity-100 transition-opacity shrink-0">
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-primary/10 text-primary transition-colors">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    {!isViewOnly && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors">
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
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDeleteFile(file.id, folder.id)}>حذف</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
