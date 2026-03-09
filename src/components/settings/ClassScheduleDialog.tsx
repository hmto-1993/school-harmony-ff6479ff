import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Save, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
}

const DAYS = [
  { value: 0, label: "الأحد", short: "أحد" },
  { value: 1, label: "الاثنين", short: "اثنين" },
  { value: 2, label: "الثلاثاء", short: "ثلاثاء" },
  { value: 3, label: "الأربعاء", short: "أربعاء" },
  { value: 4, label: "الخميس", short: "خميس" },
];

export default function ClassScheduleDialog({ open, onOpenChange, classId, className }: ClassScheduleDialogProps) {
  const [periodsPerWeek, setPeriodsPerWeek] = useState(5);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [saving, setSaving] = useState(false);
  const [scheduleId, setScheduleId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !classId) return;
    supabase
      .from("class_schedules")
      .select("*")
      .eq("class_id", classId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setScheduleId(data.id);
          setPeriodsPerWeek(data.periods_per_week);
          setSelectedDays(data.days_of_week as number[]);
        } else {
          setScheduleId(null);
          setPeriodsPerWeek(5);
          setSelectedDays([0, 1, 2, 3, 4]);
        }
      });
  }, [open, classId]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      toast({ title: "تنبيه", description: "يرجى اختيار يوم واحد على الأقل", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (scheduleId) {
      const { error } = await supabase
        .from("class_schedules")
        .update({ periods_per_week: periodsPerWeek, days_of_week: selectedDays })
        .eq("id", scheduleId);
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تم الحفظ", description: `تم تحديث جدول فصل ${className}` });
        onOpenChange(false);
      }
    } else {
      const { error } = await supabase
        .from("class_schedules")
        .insert({ class_id: classId, periods_per_week: periodsPerWeek, days_of_week: selectedDays });
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تم الحفظ", description: `تم ضبط جدول فصل ${className}` });
        onOpenChange(false);
      }
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            جدول فصل {className}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Periods per week */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">عدد الحصص في الأسبوع</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg"
                onClick={() => setPeriodsPerWeek((p) => Math.max(1, p - 1))}
              >
                −
              </Button>
              <Input
                type="number"
                min={1}
                max={20}
                value={periodsPerWeek}
                onChange={(e) => setPeriodsPerWeek(Math.max(1, Math.min(20, Number(e.target.value))))}
                className="h-9 w-16 text-center text-lg font-bold"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg"
                onClick={() => setPeriodsPerWeek((p) => Math.min(20, p + 1))}
              >
                +
              </Button>
              <span className="text-xs text-muted-foreground">حصة/أسبوع</span>
            </div>
          </div>

          {/* Days selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">أيام الدراسة</Label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day) => {
                const selected = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "flex-1 min-w-[56px] py-2.5 px-1 rounded-xl border-2 text-xs font-bold transition-all duration-200",
                      selected
                        ? "border-primary bg-primary/10 text-primary shadow-sm scale-[1.04]"
                        : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedDays.length} أيام محددة
            </p>
          </div>

          {/* Summary */}
          {selectedDays.length > 0 && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
              <span className="text-muted-foreground">الملخص: </span>
              <span className="font-semibold text-primary">
                {periodsPerWeek} حصة
              </span>
              {" · "}
              <span className="text-foreground">
                {selectedDays.map((d) => DAYS.find((x) => x.value === d)?.short).join("، ")}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">إلغاء</Button>
          </DialogClose>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 ml-1.5" />
            {saving ? "جارٍ الحفظ..." : "حفظ الجدول"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
