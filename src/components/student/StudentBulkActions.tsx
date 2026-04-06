import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, ArrowRightLeft, Trash2, Pencil, Loader2 } from "lucide-react";
import type { Student } from "@/hooks/useStudentsData";

interface Props {
  selectedIds: Set<string>;
  setSelectedIds: (s: Set<string>) => void;
  classes: { id: string; name: string }[];
  bulkTransferClassId: string;
  setBulkTransferClassId: (v: string) => void;
  bulkTransferring: boolean;
  handleBulkTransfer: () => void;
  bulkDeleting: boolean;
  bulkDeleteConfirmOpen: boolean;
  setBulkDeleteConfirmOpen: (v: boolean) => void;
  handleBulkDelete: () => void;
  students: Student[];
  openEdit: (s: Student) => void;
}

export default function StudentBulkActions({
  selectedIds, setSelectedIds, classes, bulkTransferClassId, setBulkTransferClassId,
  bulkTransferring, handleBulkTransfer, bulkDeleting, bulkDeleteConfirmOpen,
  setBulkDeleteConfirmOpen, handleBulkDelete, students, openEdit,
}: Props) {
  if (selectedIds.size === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-fade-in">
      <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" />{selectedIds.size} طالب محدد</Badge>
      <div className="h-5 w-px bg-border/50" />
      <div className="flex items-center gap-2">
        <Select value={bulkTransferClassId} onValueChange={setBulkTransferClassId}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <ArrowRightLeft className="h-3 w-3 ml-1 shrink-0" />
            <SelectValue placeholder="نقل إلى فصل..." />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleBulkTransfer} disabled={!bulkTransferClassId || bulkTransferring} className="h-8 text-xs">
          {bulkTransferring ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <ArrowRightLeft className="h-3 w-3 ml-1" />}
          نقل
        </Button>
      </div>
      <div className="h-5 w-px bg-border/50" />
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive" className="h-8 text-xs gap-1"><Trash2 className="h-3 w-3" />حذف المحددين</Button>
        </AlertDialogTrigger>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف {selectedIds.size} طالب؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف جميع الطلاب المحددين نهائياً مع بياناتهم. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={bulkDeleting}>
              {bulkDeleting ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Trash2 className="h-3 w-3 ml-1" />}
              حذف {selectedIds.size} طالب
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="h-5 w-px bg-border/50" />
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => {
        const firstSelected = students.find(s => selectedIds.has(s.id));
        if (firstSelected) openEdit(firstSelected);
      }}>
        <Pencil className="h-3 w-3" />تعديل
      </Button>
      <div className="mr-auto" />
      <Button size="sm" variant="ghost" onClick={() => { setSelectedIds(new Set()); setBulkTransferClassId(""); }} className="h-8 text-xs text-muted-foreground">
        إلغاء التحديد
      </Button>
    </div>
  );
}
