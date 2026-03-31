import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Save, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimetableEditorProps {
  classes: { id: string; name: string }[];
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

const DEFAULT_PERIODS = 6;
const MAX_PERIODS = 7;

export default function TimetableEditor({ classes }: TimetableEditorProps) {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [periodsCount, setPeriodsCount] = useState(DEFAULT_PERIODS);
  const [configuredPeriods, setConfiguredPeriods] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load configured periods for all classes
  useEffect(() => {
    if (classes.length === 0) return;
    supabase
      .from("class_schedules")
      .select("class_id, periods_per_week")
      .in("class_id", classes.map(c => c.id))
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data || []).forEach((s: any) => { map[s.class_id] = s.periods_per_week; });
        setConfiguredPeriods(map);
      });
    if (classes.length > 0 && !selectedClassId) setSelectedClassId(classes[0].id);
  }, [classes]);

  const fetchSlots = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);
    const [{ data: schedule }, { data }] = await Promise.all([
      supabase.from("class_schedules").select("periods_per_week").eq("class_id", selectedClassId).maybeSingle(),
      supabase.from("timetable_slots").select("*").eq("class_id", selectedClassId).order("day_of_week").order("period_number"),
    ]);
    const p = schedule?.periods_per_week ?? DEFAULT_PERIODS;
    setPeriodsCount(Math.min(MAX_PERIODS, Math.max(1, p)));
    setSlots((data || []) as TimetableSlot[]);
    setLoading(false);
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedClassId) fetchSlots();
  }, [selectedClassId, fetchSlots]);

  const getSlotValue = (day: number, period: number) =>
    slots.find(s => s.day_of_week === day && s.period_number === period)?.subject_name || "";

  const updateSlot = (day: number, period: number, value: string) => {
    setSlots(prev => {
      const existing = prev.find(s => s.day_of_week === day && s.period_number === period);
      if (existing) {
        return prev.map(s =>
          s.day_of_week === day && s.period_number === period ? { ...s, subject_name: value } : s
        );
      }
      return [...prev, { class_id: selectedClassId, day_of_week: day, period_number: period, subject_name: value }];
    });
  };

  const togglePeriod7 = () => {
    if (periodsCount >= MAX_PERIODS) {
      // Remove period 7 slots
      setSlots(prev => prev.filter(s => s.period_number < MAX_PERIODS));
      setPeriodsCount(DEFAULT_PERIODS);
    } else {
      setPeriodsCount(MAX_PERIODS);
    }
  };

  const handleSave = async () => {
    if (!selectedClassId) return;
    setSaving(true);
    await supabase.from("timetable_slots").delete().eq("class_id", selectedClassId);

    const toInsert = slots
      .filter(s => s.subject_name.trim() && s.period_number <= periodsCount)
      .map(s => ({ class_id: selectedClassId, day_of_week: s.day_of_week, period_number: s.period_number, subject_name: s.subject_name.trim() }));

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

  if (classes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">لا توجد فصول مضافة بعد</p>;
  }

  return (
    <div className="space-y-4">
      {/* Class Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {classes.map(c => {
          const isActive = c.id === selectedClassId;
          const cp = configuredPeriods[c.id];
          return (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 border-2",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-md scale-[1.02]"
                  : "border-border/40 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-muted/60"
              )}
            >
              <span>{c.name}</span>
              {cp != null && (
                <span className={cn(
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-md text-[10px] font-bold",
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                )}>
                  {cp}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Timetable Grid */}
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="py-2.5 px-3 text-center font-bold text-xs text-muted-foreground border-b border-border/30 w-16">الحصة</th>
                  {DAYS.map(day => (
                    <th key={day.value} className="py-2.5 px-2 text-center font-bold text-xs text-muted-foreground border-b border-border/30">
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: periodsCount }, (_, i) => i + 1).map(period => (
                  <tr key={period} className="border-b border-border/20 last:border-0">
                    <td className="py-1.5 px-3 text-center font-bold text-xs text-primary bg-primary/5">{period}</td>
                    {DAYS.map(day => (
                      <td key={day.value} className="py-1 px-1">
                        <Input
                          value={getSlotValue(day.value, period)}
                          onChange={e => updateSlot(day.value, period, e.target.value)}
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

          {/* Actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePeriod7}
              className="text-xs"
            >
              {periodsCount >= MAX_PERIODS ? (
                <><Minus className="h-3.5 w-3.5 ml-1" />حذف الحصة 7</>
              ) : (
                <><Plus className="h-3.5 w-3.5 ml-1" />إضافة حصة 7</>
              )}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || loading}>
              <Save className="h-4 w-4 ml-1.5" />
              {saving ? "جارٍ الحفظ..." : "حفظ الجدول"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
