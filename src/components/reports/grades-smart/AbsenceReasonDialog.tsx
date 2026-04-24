import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ABSENCE_REASONS } from "./grades-helpers";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (reason: string, notes: string) => void;
  studentName: string;
  categoryName: string;
  initial?: { reason: string; notes: string };
}

export default function AbsenceReasonDialog({ open, onClose, onSave, studentName, categoryName, initial }: Props) {
  const [reason, setReason] = useState(initial?.reason || "unexcused");
  const [notes, setNotes] = useState(initial?.notes || "");

  useEffect(() => {
    if (open) {
      setReason(initial?.reason || "unexcused");
      setNotes(initial?.notes || "");
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تسجيل سبب الغياب عن الاختبار</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <strong>{studentName}</strong> — {categoryName}
          </div>
          <div>
            <Label className="text-xs">سبب الغياب</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ABSENCE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">ملاحظات إضافية</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="تفاصيل إضافية (اختياري)..."
              maxLength={500}
              className="min-h-[80px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>إلغاء</Button>
            <Button onClick={() => { onSave(reason, notes); onClose(); }}>حفظ</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
