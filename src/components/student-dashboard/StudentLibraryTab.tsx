import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FolderOpen, Globe, School, FileText, Download, ArrowRight } from "lucide-react";
import { FilePreviewDialog, PreviewButton, isPreviewable, isImage } from "@/components/library/FilePreview";
import { getIconComponent, formatFileSize } from "./constants";
import type { ResourceFolder, ResourceFile } from "./constants";

interface Props {
  folders: ResourceFolder[];
  foldersLoading: boolean;
  selectedFolder: ResourceFolder | null;
  setSelectedFolder: (f: ResourceFolder | null) => void;
  folderFiles: ResourceFile[];
  setFolderFiles: (f: ResourceFile[]) => void;
  filesLoading: boolean;
  previewFile: { url: string; name: string } | null;
  setPreviewFile: (f: { url: string; name: string } | null) => void;
  openFolder: (folder: ResourceFolder) => void;
  studentClass: any;
}

export default function StudentLibraryTab({
  folders, foldersLoading, selectedFolder, setSelectedFolder,
  folderFiles, setFolderFiles, filesLoading,
  previewFile, setPreviewFile, openFolder, studentClass,
}: Props) {
  const generalFolders = folders.filter(f => !f.class_id);
  const classFolders = folders.filter(f => !!f.class_id);

  return (
    <>
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-amber-500 to-blue-500" />
            المكتبة التعليمية
          </CardTitle>
        </CardHeader>
        <CardContent>
          {foldersLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : selectedFolder ? (
            <div className="space-y-4">
              <button onClick={() => { setSelectedFolder(null); setFolderFiles([]); }} className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                <ArrowRight className="h-4 w-4 rotate-180" />
                العودة للمكتبة
              </button>
              <div className="flex items-center gap-3 mb-4">
                {(() => { const IC = getIconComponent(selectedFolder.icon); return (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center"><IC className="h-6 w-6 text-primary" /></div>
                ); })()}
                <div>
                  <h3 className="font-bold text-foreground">{selectedFolder.title}</h3>
                  <p className="text-xs text-muted-foreground">{!selectedFolder.class_id ? "عام" : studentClass?.name || ""}</p>
                </div>
              </div>
              {filesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : folderFiles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد ملفات بعد</p>
              ) : (
                <div className="space-y-2">
                  {folderFiles.map(file => {
                    const previewable = isPreviewable(file.file_name);
                    const isImg = isImage(file.file_name);
                    return (
                      <div key={file.id} className={cn("flex items-center gap-3 p-3 rounded-xl bg-muted/30 dark:bg-muted/20 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors border border-border/20", previewable && "cursor-pointer")} onClick={() => previewable && setPreviewFile({ url: file.file_url, name: file.file_name })}>
                        {isImg ? <img src={file.file_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 border border-border/30" /> : <FileText className="h-5 w-5 text-primary shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                          <p className="text-[11px] text-muted-foreground">{formatFileSize(file.file_size)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <PreviewButton fileName={file.file_name} fileUrl={file.file_url} onPreview={() => setPreviewFile({ url: file.file_url, name: file.file_name })} />
                          <a href={file.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-2 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary transition-colors">
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <FolderOpen className="h-14 w-14 text-muted-foreground/30" />
              <p className="text-muted-foreground">لا توجد مصادر متاحة حالياً</p>
            </div>
          ) : (
            <div className="space-y-6">
              {generalFolders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="h-5 w-5 text-amber-500" />
                    <h3 className="font-bold text-foreground text-sm">عام</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {generalFolders.map(folder => {
                      const IC = getIconComponent(folder.icon);
                      return (
                        <Card key={folder.id} className="group cursor-pointer border-amber-500/20 hover:border-amber-500/40 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500/5 to-transparent dark:from-amber-500/10" onClick={() => openFolder(folder)}>
                          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform"><IC className="h-6 w-6 text-amber-500" /></div>
                            <h4 className="font-semibold text-foreground text-sm leading-tight">{folder.title}</h4>
                            <span className="text-[11px] text-muted-foreground">{folder.file_count} ملف</span>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
              {classFolders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <School className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-foreground text-sm">{studentClass?.name || "فصلي"}</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {classFolders.map(folder => {
                      const IC = getIconComponent(folder.icon);
                      return (
                        <Card key={folder.id} className="group cursor-pointer border-primary/20 hover:border-primary/40 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10" onClick={() => openFolder(folder)}>
                          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform"><IC className="h-6 w-6 text-primary" /></div>
                            <h4 className="font-semibold text-foreground text-sm leading-tight">{folder.title}</h4>
                            <span className="text-[11px] text-muted-foreground">{folder.file_count} ملف</span>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {previewFile && (
        <FilePreviewDialog fileUrl={previewFile.url} fileName={previewFile.name} onClose={() => setPreviewFile(null)} />
      )}
    </>
  );
}
