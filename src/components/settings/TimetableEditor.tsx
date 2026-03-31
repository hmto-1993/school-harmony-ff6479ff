import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Save, Table2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimetableEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClassOption {
  id: string;
  name: string;
}

interface TimetableSlot {
  id?: string;
  class_id: string;
  day_of_week: number;
  period_number: number;
  subject_name: string;
}

const DAYS = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الاثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
];

const MAX_PERIODS = 8;

export default function TimetableEditor({ open, onOpenChange }: TimetableEditorProps) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [periodsCount, setPeriodsCount] = useState(7);
  const [activeDays, setActiveDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("classes").select("id, name").order("name").then(({ data }) => {
      const cls = (data || []) as ClassOption[];
      setClasses(cls);
      if (cls.length > 0 && !selectedClassId) setSelectedClassId(cls[0].id);
    });
  }, [open]);

  const fetchSlots = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);

    // Fetch schedule config
    const { data: schedule } = await supabase
      .from("class_schedules")
      .select("periods_per_week, days_of_week")
      .eq("class_id", selectedClassId)
      .maybeSingle();

    if (schedule) {
      setPeriodsCount(Math.min(MAX_PERIODS, Math.max(1, schedule.periods_per_week)));
      setActiveDays(schedule.days_of_week as number[]);
    } else {
      setPeriodsCount(7);
      setActiveDays([0, 1, 2, 3, 4]);
    }

    // Fetch timetable slots
    const { data } = await supabase
      .from("timetable_slots")
      .select("*")
      .eq("class_id", selectedClassId)
      .order("day_of_week")
      .order("period_number");

    setSlots((data || []) as TimetableSlot[]);
    setLoading(false);
  }, [selectedClassId]);

  useEffect(() => {
    if (open && selectedClassId) fetchSlots();
  }, [open, selectedClassId, fetchSlots]);

  const getSlotValue = (day: number, period: number) => {
    return slots.find(s => s.day_of_week === day && s.period_number === period)?.subject_name || "";
  };

  const updateSlot = (day: number, period: number, value: string) => {
    setSlots(prev => {
      const existing = prev.find(s => s.day_of_week === day && s.period_number === period);
      if (existing) {
        return prev.map(s =>
          s.day_of_week === day && s.period_number === period
            ? { ...s, subject_name: value }
            : s
        );
      }
      return [...prev, { class_id: selectedClassId, day_of_week: day, period_number: period, subject_name: value }];
    });
  };

  const handleSave = async () => {
    if (!selectedClassId) return;
    setSaving(true);

    // Delete all existing slots for this class
    await supabase.from("timetable_slots").delete().eq("class_id", selectedClassId);

    // Insert non-empty slots
    const toInsert = slots
      .filter(s => s.subject_name.trim())
      .map(s => ({
        class_id: selectedClassId,
        day_of_week: s.day_of_week,
        period_number: s.period_number,
        subject_name: s.subject_name.trim(),
      }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from("timetable_slots").insert(toInsert);
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    toast({ title: "تم الحفظ", description: "تم حفظ جدول الحصص بنجاح" });
    setSaving(false);
  };

  const copyFromClass = async (sourceClassId: string) => {
    if (!sourceClassId || sourceClassId === selectedClassId) return;
    const { data } = await supabase
      .from("timetable_slots")
      .select("day_of_week, period_number, subject_name")
      .eq("class_id", sourceClassId);

    if (data && data.length > 0) {
      setSlots(data.map(s => ({ ...s, class_id: selectedClassId })));
      toast({ title: "تم النسخ", description: "تم نسخ الجدول. اضغط حفظ لتثبيت التغييرات." });
    } else {
      toast({ title: "تنبيه", description: "لا يوجد جدول في الفصل المحدد", variant: "destructive" });
    }
  };

  const className = classes.find(c => c.id === selectedClassId)?.name || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-primary" />
            تصميم جدول الحصص
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Class selector + copy */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">اختر الفصل</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="اختر الفصل" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px]">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">نسخ من فصل آخر</label>
              <Select onValueChange={copyFromClass}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="نسخ من..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.filter(c => c.id !== selectedClassId).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="py-2.5 px-3 text-right font-bold text-xs text-muted-foreground border-b border-border/30 w-20">
                      الحصة
                    </th>
                    {activeDays.map(day => (
                      <th key={day} className="py-2.5 px-2 text-center font-bold text-xs text-muted-foreground border-b border-border/30">
                        {DAYS.find(d => d.value === day)?.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: periodsCount }, (_, i) => i + 1).map(period => (
                    <tr key={period} className="border-b border-border/20 last:border-0">
                      <td className="py-1.5 px-3 text-center font-bold text-xs text-primary bg-primary/5">
                        {period}
                      </td>
                      {activeDays.map(day => (
                        <td key={day} className="py-1 px-1">
                          <Input
                            value={getSlotValue(day, period)}
                            onChange={e => updateSlot(day, period, e.target.value)}
                            placeholder="المادة"
                            className="h-8 text-xs text-center border-border/30 bg-background/50 focus:bg-background"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            💡 عدد الحصص وأيام الدراسة يتم تحديدها من إعدادات جدول الفصل (أيقونة التقويم بجانب كل فصل)
          </p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">إلغاء</Button>
          </DialogClose>
          <Button size="sm" onClick={handleSave} disabled={saving || loading}>
            <Save className="h-4 w-4 ml-1.5" />
            {saving ? "جارٍ الحفظ..." : "حفظ الجدول"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
