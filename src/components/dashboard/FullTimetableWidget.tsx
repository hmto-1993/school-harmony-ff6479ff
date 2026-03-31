import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slot {
  day_of_week: number;
  period_number: number;
  subject_name: string;
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
  const [selectedClassId, setSelectedClassId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [activeDays, setActiveDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [maxPeriod, setMaxPeriod] = useState(7);
  const [loading, setLoading] = useState(true);
  const todayDay = new Date().getDay();

  useEffect(() => {
    if (!user) return;
    const isAdmin = role === "admin";
    if (isAdmin) {
      supabase.from("classes").select("id, name").order("name").then(({ data }) => {
        const cls = (data || []) as ClassOption[];
        setClasses(cls);
        if (cls.length > 0) setSelectedClassId(cls[0].id);
      });
    } else {
      supabase.from("teacher_classes").select("class_id, classes(id, name)").eq("teacher_id", user.id).then(({ data }) => {
        const cls = (data || []).map((tc: any) => tc.classes).filter(Boolean) as ClassOption[];
        setClasses(cls);
        if (cls.length > 0) setSelectedClassId(cls[0].id);
      });
    }
  }, [user, role]);

  useEffect(() => {
    if (!selectedClassId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      supabase.from("timetable_slots").select("day_of_week, period_number, subject_name").eq("class_id", selectedClassId).order("period_number"),
      supabase.from("class_schedules").select("periods_per_week, days_of_week").eq("class_id", selectedClassId).maybeSingle(),
    ]).then(([slotsRes, schedRes]) => {
      setSlots((slotsRes.data || []) as Slot[]);
      if (schedRes.data) {
        setActiveDays(schedRes.data.days_of_week as number[]);
        setMaxPeriod(Math.min(schedRes.data.periods_per_week, 7));
      } else {
        setActiveDays([0, 1, 2, 3, 4]);
        setMaxPeriod(6);
      }
      setLoading(false);
    });
  }, [selectedClassId]);

  const getSubject = (day: number, period: number) => {
    return slots.find(s => s.day_of_week === day && s.period_number === period)?.subject_name || "";
  };

  return (
    <Card className="border-0 ring-1 ring-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/10 overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
            <Table2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-bold text-foreground">الجدول الأسبوعي</CardTitle>
            <p className="text-[11px] text-muted-foreground">جدول الحصص الكامل</p>
          </div>
        </div>
        {classes.length > 1 && (
          <div className="mt-2">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="h-7 text-[11px] border-border/30 bg-background/50">
                <SelectValue placeholder="اختر الفصل" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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
                  <th className="py-1.5 px-1.5 text-center font-bold text-muted-foreground border-b border-border/20 w-10">#</th>
                  {activeDays.map(day => (
                    <th key={day} className={cn(
                      "py-1.5 px-1 text-center font-bold border-b border-border/20",
                      day === todayDay ? "text-primary bg-primary/10" : "text-muted-foreground"
                    )}>
                      {DAYS.find(d => d.value === day)?.short}
                      {day === todayDay && <span className="block text-[9px] font-normal">اليوم</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxPeriod }, (_, i) => i + 1).map(period => (
                  <tr key={period} className="border-b border-border/10 last:border-0">
                    <td className="py-1.5 px-1.5 text-center font-bold text-primary/70 bg-primary/5">{period}</td>
                    {activeDays.map(day => {
                      const subj = getSubject(day, period);
                      return (
                        <td key={day} className={cn(
                          "py-1.5 px-1 text-center",
                          day === todayDay && "bg-primary/5",
                          subj ? "text-foreground font-medium" : "text-muted-foreground/40"
                        )}>
                          {subj || "—"}
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
