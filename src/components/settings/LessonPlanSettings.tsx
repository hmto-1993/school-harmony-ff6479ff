import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Save, BookOpen, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassOption {
  id: string;
  name: string;
}

interface LessonSlot {
  id?: string;
  lesson_title: string;
  objectives: string;
  teacher_reflection: string;
  is_completed: boolean;
}

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export default function LessonPlanSettings({ classes }: { classes: ClassOption[] }) {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [periodsPerWeek, setPeriodsPerWeek] = useState(5);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4]);
  const [slots, setSlots] = useState<Record<string, LessonSlot>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch schedule for the class
  useEffect(() => {
    if (!selectedClassId) return;
    (async () => {
      const { data } = await supabase
        .from("class_schedules")
        .select("periods_per_week, days_of_week")
        .eq("class_id", selectedClassId)
        .maybeSingle();
      if (data) {
        setPeriodsPerWeek(data.periods_per_week);
        setDaysOfWeek(data.days_of_week);
      } else {
        setPeriodsPerWeek(5);
        setDaysOfWeek([0, 1, 2, 3, 4]);
      }
    })();
  }, [selectedClassId]);

  // Fetch lesson plans for selected class + week
  const fetchLessons = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);
    const { data } = await supabase
      .from("lesson_plans")
      .select("*")
      .eq("class_id", selectedClassId)
      .eq("week_number", weekNumber);

    const map: Record<string, LessonSlot> = {};
    (data || []).forEach((lp: any) => {
      const key = `${lp.day_index}-${lp.slot_index}`;
      map[key] = {
        id: lp.id,
        lesson_title: lp.lesson_title || "",
        objectives: lp.objectives || "",
        teacher_reflection: lp.teacher_reflection || "",
        is_completed: lp.is_completed || false,
      };
    });
    setSlots(map);
    setLoading(false);
  }, [selectedClassId, weekNumber]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const slotsPerDay = Math.max(1, Math.ceil(periodsPerWeek / Math.max(daysOfWeek.length, 1)));

  const updateSlot = (dayIdx: number, slotIdx: number, field: keyof LessonSlot, value: string | boolean) => {
    const key = `${dayIdx}-${slotIdx}`;
    setSlots((prev) => ({
      ...prev,
      [key]: {
        ...prev[key] || { lesson_title: "", objectives: "", teacher_reflection: "", is_completed: false },
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!user || !selectedClassId) return;
    setSaving(true);

    // Delete existing for this class+week, then insert all
    await supabase
      .from("lesson_plans")
      .delete()
      .eq("class_id", selectedClassId)
      .eq("week_number", weekNumber)
      .eq("created_by", user.id);

    const rows = Object.entries(slots)
      .filter(([, s]) => s.lesson_title.trim())
      .map(([key, s]) => {
        const [dayIdx, slotIdx] = key.split("-").map(Number);
        return {
          class_id: selectedClassId,
          week_number: weekNumber,
          day_index: dayIdx,
          slot_index: slotIdx,
          lesson_title: s.lesson_title,
          objectives: s.objectives,
          teacher_reflection: s.teacher_reflection,
          is_completed: s.is_completed,
          created_by: user.id,
        };
      });

    if (rows.length > 0) {
      const { error } = await supabase.from("lesson_plans").insert(rows);
      if (error) {
        toast({ title: "خطأ", description: "فشل حفظ الخطة", variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    toast({ title: "✅ تم الحفظ", description: `تم حفظ خطة الأسبوع ${weekNumber}` });
    setSaving(false);
    fetchLessons();
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5 min-w-[180px]">
          <Label className="text-xs font-semibold">الفصل</Label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold">الأسبوع</Label>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekNumber(Math.max(1, weekNumber - 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Badge variant="secondary" className="text-sm px-3 min-w-[40px] justify-center">{weekNumber}</Badge>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekNumber(weekNumber + 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !selectedClassId} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ الخطة
        </Button>
      </div>

      {/* Grid */}
      {selectedClassId && !loading && (
        <div className="overflow-auto rounded-xl border border-border/40">
          <table className="w-full border-collapse" dir="rtl" style={{ fontSize: 13 }}>
            <thead>
              <tr className="bg-muted">
                <th className="border border-border/30 px-3 py-2 text-center font-bold text-muted-foreground" style={{ minWidth: 80 }}>اليوم</th>
                <th className="border border-border/30 px-3 py-2 text-center font-bold text-muted-foreground" style={{ minWidth: 40 }}>الحصة</th>
                <th className="border border-border/30 px-3 py-2 text-right font-bold text-muted-foreground" style={{ minWidth: 200 }}>عنوان الدرس</th>
                <th className="border border-border/30 px-3 py-2 text-right font-bold text-muted-foreground" style={{ minWidth: 200 }}>الأهداف</th>
                <th className="border border-border/30 px-3 py-2 text-right font-bold text-muted-foreground" style={{ minWidth: 150 }}>ملاحظات المعلم</th>
                <th className="border border-border/30 px-3 py-2 text-center font-bold text-muted-foreground" style={{ minWidth: 60 }}>مكتمل</th>
              </tr>
            </thead>
            <tbody>
              {daysOfWeek.map((dayIdx) =>
                Array.from({ length: slotsPerDay }, (_, slotIdx) => {
                  const key = `${dayIdx}-${slotIdx}`;
                  const slot = slots[key] || { lesson_title: "", objectives: "", teacher_reflection: "", is_completed: false };
                  return (
                    <tr key={key} className={cn(slotIdx % 2 === 0 ? "bg-card" : "bg-muted/30")}>
                      {slotIdx === 0 && (
                        <td
                          rowSpan={slotsPerDay}
                          className="border border-border/20 px-3 py-2 text-center font-bold text-foreground bg-muted/50"
                        >
                          {DAY_NAMES[dayIdx] || `يوم ${dayIdx + 1}`}
                        </td>
                      )}
                      <td className="border border-border/20 px-2 py-2 text-center font-semibold text-muted-foreground">
                        {slotIdx + 1}
                      </td>
                      <td className="border border-border/20 p-1">
                        <Input
                          value={slot.lesson_title}
                          onChange={(e) => updateSlot(dayIdx, slotIdx, "lesson_title", e.target.value)}
                          placeholder="عنوان الدرس"
                          className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1"
                        />
                      </td>
                      <td className="border border-border/20 p-1">
                        <Input
                          value={slot.objectives}
                          onChange={(e) => updateSlot(dayIdx, slotIdx, "objectives", e.target.value)}
                          placeholder="الأهداف"
                          className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1"
                        />
                      </td>
                      <td className="border border-border/20 p-1">
                        <Input
                          value={slot.teacher_reflection}
                          onChange={(e) => updateSlot(dayIdx, slotIdx, "teacher_reflection", e.target.value)}
                          placeholder="ملاحظات"
                          className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1"
                        />
                      </td>
                      <td className="border border-border/20 px-2 py-2 text-center">
                        <button
                          onClick={() => updateSlot(dayIdx, slotIdx, "is_completed", !slot.is_completed)}
                          className={cn(
                            "h-6 w-6 rounded-md border-2 inline-flex items-center justify-center transition-colors",
                            slot.is_completed
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {slot.is_completed && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedClassId && loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!selectedClassId && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <BookOpen className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm">اختر الفصل لبدء إعداد خطة الدروس</p>
        </div>
      )}
    </div>
  );
}
