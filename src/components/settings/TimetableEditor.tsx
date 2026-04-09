import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Save, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimetableEditorProps {
  classes: { id: string; name: string }[];
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
const EMPTY = "__empty__";

export default function TimetableEditor({ classes }: TimetableEditorProps) {
  // grid[`${day}-${period}`] = classId
  const [grid, setGrid] = useState<Record<string, string>>({});
  const [periodsCount, setPeriodsCount] = useState(DEFAULT_PERIODS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const key = (day: number, period: number) => `${day}-${period}`;

  const fetchSlots = useCallback(async () => {
    if (classes.length === 0) return;
    setLoading(true);
    const classIds = classes.map(c => c.id);
    const { data } = await supabase
      .from("timetable_slots")
      .select("class_id, day_of_week, period_number")
      .in("class_id", classIds);

    const newGrid: Record<string, string> = {};
    let maxP = DEFAULT_PERIODS;
    (data || []).forEach((s: any) => {
      newGrid[key(s.day_of_week, s.period_number)] = s.class_id;
      if (s.period_number > maxP) maxP = s.period_number;
    });
    setGrid(newGrid);
    setPeriodsCount(Math.min(MAX_PERIODS, Math.max(DEFAULT_PERIODS, maxP)));
    setLoading(false);
  }, [classes]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const getCell = (day: number, period: number) => grid[key(day, period)] || "";

  const setCell = (day: number, period: number, classId: string) => {
    setGrid(prev => {
      const next = { ...prev };
      if (classId) {
        next[key(day, period)] = classId;
      } else {
        delete next[key(day, period)];
      }
      return next;
    });
  };

  const togglePeriod7 = () => {
    if (periodsCount >= MAX_PERIODS) {
      // Remove period 7 from grid
      setGrid(prev => {
        const next = { ...prev };
        DAYS.forEach(d => { delete next[key(d.value, MAX_PERIODS)]; });
        return next;
      });
      setPeriodsCount(DEFAULT_PERIODS);
    } else {
      setPeriodsCount(MAX_PERIODS);
    }
  };

  const handleSave = async () => {
    if (classes.length === 0) return;
    setSaving(true);

    const classIds = classes.map(c => c.id);
    // Delete all existing slots for these classes
    await supabase.from("timetable_slots").delete().in("class_id", classIds);

    // Build insert rows
    const classNameMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
    const toInsert = Object.entries(grid)
      .filter(([, cid]) => cid && classIds.includes(cid))
      .map(([k, cid]) => {
        const [d, p] = k.split("-").map(Number);
        return {
          class_id: cid,
          day_of_week: d,
          period_number: p,
          subject_name: classNameMap[cid] || "",
        };
      })
      .filter(s => s.period_number <= periodsCount);

    if (toInsert.length > 0) {
      const { error } = await supabase.from("timetable_slots").insert(toInsert);
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    // Sync class_schedules with timetable data
    const classStats: Record<string, { periods: number; days: Set<number> }> = {};
    toInsert.forEach(s => {
      if (!classStats[s.class_id]) classStats[s.class_id] = { periods: 0, days: new Set() };
      classStats[s.class_id].periods++;
      classStats[s.class_id].days.add(s.day_of_week);
    });

    for (const cid of classIds) {
      const stats = classStats[cid];
      const periodsPerWeek = stats?.periods || 0;
      const daysOfWeek = stats ? Array.from(stats.days).sort() : [0, 1, 2, 3, 4];

      const { data: existing } = await supabase
        .from("class_schedules")
        .select("id")
        .eq("class_id", cid)
        .maybeSingle();

      if (existing) {
        await supabase.from("class_schedules")
          .update({ periods_per_week: periodsPerWeek, days_of_week: daysOfWeek })
          .eq("id", existing.id);
      } else if (periodsPerWeek > 0) {
        await supabase.from("class_schedules")
          .insert({ class_id: cid, periods_per_week: periodsPerWeek, days_of_week: daysOfWeek });
      }
    }

    toast({ title: "تم الحفظ", description: "تم حفظ جدول الحصص وتحديث إعدادات التحضير" });
    setSaving(false);
  };

  if (classes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">لا توجد فصول مضافة بعد</p>;
  }

  return (
    <div className="space-y-4">
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
                  <th className="py-2.5 px-3 text-center font-bold text-xs text-muted-foreground border-b border-border/30 w-20">اليوم</th>
                  {Array.from({ length: periodsCount }, (_, i) => i + 1).map(period => (
                    <th key={period} className="py-2.5 px-2 text-center font-bold text-xs text-muted-foreground border-b border-border/30">
                      الحصة {period}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day.value} className="border-b border-border/20 last:border-0">
                    <td className="py-1.5 px-3 text-center font-bold text-xs text-primary bg-primary/5 whitespace-nowrap">{day.label}</td>
                    {Array.from({ length: periodsCount }, (_, i) => i + 1).map(period => {
                      const val = getCell(day.value, period);
                      return (
                        <td key={period} className="py-1 px-1">
                          <Select
                            value={val || EMPTY}
                            onValueChange={v => setCell(day.value, period, v === EMPTY ? "" : v)}
                          >
                            <SelectTrigger className={cn(
                              "h-8 text-[11px] border-border/30",
                              val ? "bg-primary/10 text-primary font-semibold" : "bg-background/50 text-muted-foreground"
                            )}>
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={EMPTY} className="text-xs text-muted-foreground">— فارغة —</SelectItem>
                              {classes.map(c => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      );
                    })}
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
