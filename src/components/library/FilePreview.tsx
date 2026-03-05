import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Download, X, FileText, Image, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

function isImage(name: string) {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(name);
}

function isPdf(name: string) {
  return /\.pdf$/i.test(name);
}

function isPreviewable(name: string) {
  return isImage(name) || isPdf(name);
}

function FilePreviewDialog({ fileUrl, fileName, onClose }: FilePreviewProps) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden rounded-2xl" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-gradient-to-l from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isImage(fileName) ? (
              <Image className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <FileText className="h-4 w-4 text-primary shrink-0" />
            )}
            <span className="text-sm font-medium text-foreground truncate">{fileName}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl hover:bg-primary/10 dark:hover:bg-primary/20 text-primary transition-colors"
              title="تحميل"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-auto bg-muted/20 dark:bg-muted/10" style={{ height: "75vh" }}>
          {isImage(fileName) ? (
            <div className="flex items-center justify-center h-full p-4">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : isPdf(fileName) ? (
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title={fileName}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Preview button component for use in file lists
function PreviewButton({ fileName, fileUrl, onPreview }: { fileName: string; fileUrl: string; onPreview: () => void }) {
  if (!isPreviewable(fileName)) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onPreview(); }}
      className="p-2 rounded-xl bg-accent/10 hover:bg-accent/20 dark:bg-accent/20 dark:hover:bg-accent/30 text-accent transition-colors"
      title="معاينة"
    >
      <Eye className="h-4 w-4" />
    </button>
  );
}

export { FilePreviewDialog, PreviewButton, isPreviewable, isImage, isPdf };
