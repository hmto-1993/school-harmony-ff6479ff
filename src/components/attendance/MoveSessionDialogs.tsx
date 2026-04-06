import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { HijriDatePicker } from "@/components/ui/hijri-date-picker";
import { ArrowRightLeft } from "lucide-react";

interface Props {
  date: string;
  records: { existing_id?: string }[];
  moveDialogOpen: boolean;
  setMoveDialogOpen: (v: boolean) => void;
  moveConfirmOpen: boolean;
  setMoveConfirmOpen: (v: boolean) => void;
  moveTargetDate: Date;
  setMoveTargetDate: (d: Date) => void;
  movingDate: boolean;
  onMoveSession: () => void;
}

export default function MoveSessionDialogs({
  date, records, moveDialogOpen, setMoveDialogOpen,
  moveConfirmOpen, setMoveConfirmOpen,
  moveTargetDate, setMoveTargetDate, movingDate, onMoveSession,
}: Props) {
  return (
    <>
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>نقل حصة التحضير</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">اختر التاريخ الجديد لنقل سجلات الحضور إليه:</p>
          <HijriDatePicker date={moveTargetDate} onDateChange={setMoveTargetDate} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => { setMoveDialogOpen(false); setMoveConfirmOpen(true); }}
              disabled={format(moveTargetDate, "yyyy-MM-dd") === date}
            >
              <ArrowRightLeft className="h-4 w-4 ml-1" />
              التالي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveConfirmOpen} onOpenChange={setMoveConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-warning" />
              تأكيد نقل الحصة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">من:</span>
                <span className="font-semibold">{date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">إلى:</span>
                <span className="font-semibold text-primary">{format(moveTargetDate, "yyyy-MM-dd")}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-warning/20 pt-2">
                <span className="text-muted-foreground">عدد الطلاب المتأثرين:</span>
                <span className="font-bold text-warning">{records.filter(r => r.existing_id).length} طالب</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">سيتم نقل جميع سجلات الحضور المحفوظة لهذا اليوم إلى التاريخ الجديد.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMoveConfirmOpen(false); setMoveDialogOpen(true); }}>رجوع</Button>
            <Button variant="destructive" onClick={onMoveSession} disabled={movingDate}>
              <ArrowRightLeft className="h-4 w-4 ml-1" />
              {movingDate ? "جارٍ النقل..." : "تأكيد النقل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
