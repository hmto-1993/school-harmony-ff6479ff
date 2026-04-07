import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Plus, Trash2, Loader2, TreePalm } from "lucide-react";
import { ExamDate, HolidayDate } from "@/hooks/useAcademicWeek";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  startDate: string; setStartDate: (v: string) => void;
  totalWeeks: number; setTotalWeeks: (v: number) => void;
  semester: string; setSemester: (v: string) => void;
  academicYear: string; setAcademicYear: (v: string) => void;
  examDates: ExamDate[]; holidays: HolidayDate[];
  addExamDate: () => void; removeExamDate: (i: number) => void;
  updateExamDate: (i: number, field: keyof ExamDate, value: string) => void;
  addHoliday: () => void; removeHoliday: (i: number) => void;
  updateHoliday: (i: number, field: string, value: string) => void;
  saving: boolean; deleting: boolean;
  hasCalendarData: boolean;
  onSave: () => void; onClose: () => void; onDelete: () => void;
}

export default function CalendarManualTab(props: Props) {
  const {
    startDate, setStartDate, totalWeeks, setTotalWeeks,
    semester, setSemester, academicYear, setAcademicYear,
    examDates, holidays,
    addExamDate, removeExamDate, updateExamDate,
    addHoliday, removeHoliday, updateHoliday,
    saving, deleting, hasCalendarData,
    onSave, onClose, onDelete,
  } = props;

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">تاريخ بداية الفصل</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">عدد الأسابيع</Label>
          <Input type="number" min={1} max={52} value={totalWeeks} onChange={e => setTotalWeeks(+e.target.value)} className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">الفصل الدراسي</Label>
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="first">الأول</SelectItem>
              <SelectItem value="second">الثاني</SelectItem>
              <SelectItem value="third">الثالث</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">العام الدراسي</Label>
          <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="mt-1" placeholder="1446-1447" />
        </div>
      </div>

      {/* Exam dates */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">مواعيد الاختبارات</Label>
          <Button variant="ghost" size="sm" onClick={addExamDate} className="gap-1 text-xs h-7">
            <Plus className="h-3 w-3" /> إضافة
          </Button>
        </div>
        {examDates.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">لا توجد مواعيد اختبارات</p>}
        {examDates.map((exam, i) => (
          <div key={i} className="flex items-end gap-2 bg-muted/30 rounded-lg p-2">
            <div className="flex-1">
              <Label className="text-[10px]">التاريخ</Label>
              <Input type="date" value={exam.date} onChange={e => updateExamDate(i, "date", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="flex-1">
              <Label className="text-[10px]">الوصف</Label>
              <Input value={exam.label} onChange={e => updateExamDate(i, "label", e.target.value)} className="h-8 text-xs" placeholder="اختبارات نصفية" />
            </div>
            <div className="w-24">
              <Label className="text-[10px]">النوع</Label>
              <Select value={exam.type} onValueChange={v => updateExamDate(i, "type", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="midterm">نصفي</SelectItem>
                  <SelectItem value="final">نهائي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeExamDate(i)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Holidays */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <TreePalm className="h-4 w-4 text-emerald-500" />
            مواعيد الإجازات
          </Label>
          <Button variant="ghost" size="sm" onClick={addHoliday} className="gap-1 text-xs h-7">
            <Plus className="h-3 w-3" /> إضافة
          </Button>
        </div>
        {holidays.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">لا توجد إجازات</p>}
        {holidays.map((holiday, i) => (
          <div key={i} className="flex items-end gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <Label className="text-[10px]">من تاريخ</Label>
              <Input type="date" value={holiday.date} onChange={e => updateHoliday(i, "date", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <Label className="text-[10px]">إلى تاريخ <span className="text-muted-foreground">(اختياري)</span></Label>
              <Input type="date" value={holiday.end_date || ""} onChange={e => updateHoliday(i, "end_date", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <Label className="text-[10px]">الوصف</Label>
              <Input value={holiday.label} onChange={e => updateHoliday(i, "label", e.target.value)} className="h-8 text-xs" placeholder="إجازة اليوم الوطني" />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeHoliday(i)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Save & Delete */}
      <div className="flex gap-2 mt-4 border-t pt-4">
        <Button onClick={onSave} disabled={saving} className="flex-1 gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
          حفظ التقويم
        </Button>
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        {hasCalendarData && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deleting}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>حذف التقويم الأكاديمي؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف التقويم الأكاديمي وجميع مواعيد الاختبارات والإجازات المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>
                  حذف التقويم
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
