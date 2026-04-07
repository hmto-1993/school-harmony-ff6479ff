import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  excuseFile: File | null;
  setExcuseFile: (f: File | null) => void;
  excuseReason: string;
  setExcuseReason: (r: string) => void;
  excuseUploading: boolean;
  onSubmit: () => void;
}

export default function ExcuseUploadDialog({ open, onOpenChange, excuseFile, setExcuseFile, excuseReason, setExcuseReason, excuseUploading, onSubmit }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />تقديم عذر للغياب
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">يمكنك رفع صورة التقرير الطبي أو أي مستند يثبت العذر</p>
          <div className="space-y-2">
            <label className="text-sm font-medium">ملف العذر (صورة) *</label>
            <Input type="file" accept="image/*" onChange={(e) => setExcuseFile(e.target.files?.[0] || null)} className="cursor-pointer" />
            <p className="text-xs text-muted-foreground">الحد الأقصى: 5 ميجابايت</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">سبب العذر (اختياري)</label>
            <Textarea value={excuseReason} onChange={(e) => setExcuseReason(e.target.value)} placeholder="مثال: تقرير طبي بسبب المرض" rows={2} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={onSubmit} disabled={!excuseFile || excuseUploading} className="gap-1.5">
            {excuseUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            رفع العذر
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
