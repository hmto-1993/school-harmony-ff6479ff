import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface BulkSendConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: { id: string; full_name: string; parent_phone: string | null }[];
  onConfirm: () => void;
}

export default function BulkSendConfirmDialog({
  open,
  onOpenChange,
  students,
  onConfirm,
}: BulkSendConfirmDialogProps) {
  const withPhone = students.filter((s) => s.parent_phone);
  const withoutPhone = students.filter((s) => !s.parent_phone);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد الإرسال الجماعي</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>أنت على وشك إرسال التقارير لجميع أولياء أمور الفصل.</p>
              <div className="rounded-xl bg-muted/60 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">إجمالي الطلاب:</span>
                  <Badge variant="secondary" className="text-sm">{students.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">طلاب بأرقام هواتف (سيتم الإرسال):</span>
                  <Badge className="text-sm bg-primary">{withPhone.length}</Badge>
                </div>
                {withoutPhone.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-destructive">طلاب بدون أرقام (لن يتم الإرسال):</span>
                    <Badge variant="destructive" className="text-sm">{withoutPhone.length}</Badge>
                  </div>
                )}
              </div>
              {withoutPhone.length > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
                  <strong>الطلاب بدون أرقام:</strong>{" "}
                  {withoutPhone.map((s) => s.full_name).join("، ")}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={withPhone.length === 0}
          >
            <Send className="h-4 w-4 ml-2" />
            إرسال ({withPhone.length} طالب)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
