import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Upload, X, FileImage } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignedUrl } from "@/hooks/use-signed-url";

function ExcuseFileLink({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const signed = useSignedUrl("school-assets", fileUrl);
  return (
    <a href={signed || "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
      <FileImage className="h-3 w-3" />{fileName}
    </a>
  );
}

interface Warning {
  id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedWarning: Warning | null;
  warnings: Warning[];
  absentDates: { date: string; day_name: string }[];
  existingExcuses: any[];
  onSelectWarning: (w: Warning) => void;
  onOpenExcuse: () => void;
}

export default function WarningDetailDialog({ open, onOpenChange, selectedWarning, warnings, absentDates, existingExcuses, onSelectWarning, onOpenExcuse }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />تفاصيل الإنذار
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {selectedWarning && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(selectedWarning.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{selectedWarning.message}</p>
            </div>
          )}
          {absentDates.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 text-foreground">سجل أيام الغياب:</p>
              <div className="overflow-auto rounded-xl border border-border/40 max-h-60">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border/30">#</th>
                      <th className="text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border/30">التاريخ</th>
                      <th className="text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border/30">اليوم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absentDates.map((d, i) => (
                      <tr key={d.date} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                        <td className="text-center p-2 text-xs">{i + 1}</td>
                        <td className="text-center p-2 text-xs">{d.date}</td>
                        <td className="text-center p-2 text-xs">{d.day_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {warnings.length > 1 && (
            <div>
              <p className="text-sm font-semibold mb-2 text-foreground">جميع الإنذارات ({warnings.length}):</p>
              <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                {warnings.map((w) => (
                  <div key={w.id} className={cn("rounded-lg border p-3 text-xs cursor-pointer transition-colors", selectedWarning?.id === w.id ? "border-destructive/40 bg-destructive/10" : "border-border/30 bg-muted/20 hover:bg-muted/40")} onClick={() => onSelectWarning(w)}>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{new Date(w.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}</span>
                      {!w.is_read && <Badge variant="destructive" className="text-[9px] px-1 py-0">جديد</Badge>}
                    </div>
                    <p className="line-clamp-1 mt-1 text-foreground">{w.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedWarning && (() => {
            const excuse = existingExcuses.find(e => e.notification_id === selectedWarning.id);
            if (!excuse) return null;
            return (
              <div className={cn("rounded-xl border p-4", excuse.status === "pending" ? "border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20" : excuse.status === "accepted" ? "border-emerald-300/50 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-red-300/50 bg-red-50/50 dark:bg-red-950/20")}>
                <div className="flex items-center gap-2 mb-2">
                  <FileImage className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">العذر المقدم</span>
                  <Badge variant={excuse.status === "pending" ? "secondary" : excuse.status === "accepted" ? "default" : "destructive"} className="text-xs mr-auto">
                    {excuse.status === "pending" ? "قيد المراجعة" : excuse.status === "accepted" ? "✅ مقبول" : "❌ مرفوض"}
                  </Badge>
                </div>
                <ExcuseFileLink fileUrl={excuse.file_url} fileName={excuse.file_name} />
                {excuse.reason && <p className="text-xs text-muted-foreground mt-2">{excuse.reason}</p>}
                {excuse.review_note && <p className="text-xs mt-2 text-foreground">ملاحظة المعلم: {excuse.review_note}</p>}
              </div>
            );
          })()}
        </div>
        <DialogFooter className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 ml-1" />إغلاق
          </Button>
          {selectedWarning && !existingExcuses.find(e => e.notification_id === selectedWarning.id) && (
            <Button onClick={onOpenExcuse} className="gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white">
              <Upload className="h-4 w-4" />تقديم عذر
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
