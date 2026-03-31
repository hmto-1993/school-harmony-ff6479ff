import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slot {
  day_of_week: number;
  period_number: number;
  subject_name: string;
  class_id: string;
}

interface ClassOption { id: string; name: string; }

const DAYS = [
  { value: 0, label: "الأحد", short: "أحد" },
  { value: 1, label: "الاثنين", short: "اثنين" },
  { value: 2, label: "الثلاثاء", short: "ثلاثاء" },
  { value: 3, label: "الأربعاء", short: "أربعاء" },
  { value: 4, label: "الخميس", short: "خميس" },
];

export default function FullTimetableWidget() {
  const { user, role } = useAuth();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const todayDay = new Date().getDay();

  useEffect(() => {
    if (!user) return;
    const isAdmin = role === "admin";
    const fetchClasses = isAdmin
      ? supabase.from("classes").select("id, name").order("name")
      : supabase.from("teacher_classes").select("class_id, classes(id, name)").eq("teacher_id", user.id);

    fetchClasses.then(({ data }) => {
      const cls = isAdmin
        ? (data || []) as ClassOption[]
        : (data || []).map((tc: any) => tc.classes).filter(Boolean) as ClassOption[];
      setClasses(cls);
      if (cls.length === 0) { setLoading(false); return; }

      const classIds = cls.map(c => c.id);
      supabase
        .from("timetable_slots")
        .select("day_of_week, period_number, subject_name, class_id")
        .in("class_id", classIds)
        .order("period_number")
        .then(({ data: slotsData }) => {
          setSlots((slotsData || []) as Slot[]);
          setLoading(false);
        });
    });
  }, [user, role]);

  // Build grid: grid[`${day}-${period}`] = class name
  const classNameMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const getCell = (day: number, period: number) => {
    const slot = slots.find(s => s.day_of_week === day && s.period_number === period);
    return slot ? (classNameMap[slot.class_id] || slot.subject_name) : "";
  };

  // Determine max period from data
  const maxPeriod = slots.length > 0 ? Math.min(Math.max(...slots.map(s => s.period_number)), 7) : 6;

  return (
    <Card className="border-0 ring-1 ring-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/10 overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
            <Table2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-bold text-foreground">الجدول الأسبوعي</CardTitle>
            <p className="text-[11px] text-muted-foreground">جدول الحصص لجميع الفصول</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-1">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : slots.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">لم يتم تصميم الجدول بعد</p>
        ) : (
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-muted/40">
                  <th className="py-1.5 px-2 text-center font-bold text-muted-foreground border-b border-border/20 w-14">اليوم</th>
                  {Array.from({ length: maxPeriod }, (_, i) => i + 1).map(p => (
                    <th key={p} className="py-1.5 px-1 text-center font-bold text-muted-foreground border-b border-border/20">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day.value} className="border-b border-border/10 last:border-0">
                    <td className={cn(
                      "py-1.5 px-2 text-center font-bold text-xs whitespace-nowrap",
                      day.value === todayDay ? "text-primary bg-primary/10" : "text-primary/70 bg-primary/5"
                    )}>
                      {day.short}
                      {day.value === todayDay && <span className="block text-[9px] font-normal">اليوم</span>}
                    </td>
                    {Array.from({ length: maxPeriod }, (_, i) => i + 1).map(period => {
                      const cellValue = getCell(day.value, period);
                      return (
                        <td key={period} className={cn(
                          "py-1.5 px-1 text-center",
                          day.value === todayDay && "bg-primary/5",
                          cellValue ? "text-foreground font-medium" : "text-muted-foreground/40"
                        )}>
                          {cellValue || "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
