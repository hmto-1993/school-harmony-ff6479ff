import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface TodaySlot {
  period_number: number;
  subject_name: string;
  class_id: string;
}

interface ClassOption { id: string; name: string; }

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function TodayScheduleWidget() {
  const { user, role } = useAuth();
  const [slots, setSlots] = useState<TodaySlot[]>([]);
  const [classNameMap, setClassNameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const todayDay = new Date().getDay();
  const isWeekend = todayDay === 5 || todayDay === 6;

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

      const nameMap = Object.fromEntries(cls.map(c => [c.id, c.name]));
      setClassNameMap(nameMap);

      if (cls.length === 0) { setLoading(false); return; }

      supabase
        .from("timetable_slots")
        .select("period_number, subject_name, class_id")
        .in("class_id", cls.map(c => c.id))
        .eq("day_of_week", todayDay)
        .order("period_number")
        .then(({ data: slotsData }) => {
          setSlots((slotsData || []).filter((s: any) => s.subject_name?.trim()) as TodaySlot[]);
          setLoading(false);
        });
    });
  }, [user, role, todayDay]);

  // Group by period
  const periodMap = new Map<number, string[]>();
  slots.forEach(s => {
    const name = classNameMap[s.class_id] || s.subject_name;
    if (!periodMap.has(s.period_number)) periodMap.set(s.period_number, []);
    periodMap.get(s.period_number)!.push(name);
  });
  const periods = Array.from(periodMap.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <Card className="border-0 ring-1 ring-success/20 bg-gradient-to-br from-success/5 via-card to-success/10 overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-success to-success/70 shadow-md">
            <Clock className="h-4 w-4 text-success-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-bold text-foreground">حصص اليوم</CardTitle>
            <p className="text-[11px] text-muted-foreground">{DAY_NAMES[todayDay]} — جميع الفصول</p>
          </div>
          {periods.length > 0 && (
            <Badge className="bg-success/15 text-success hover:bg-success/20 border-0 text-xs">
              {periods.length} حصص
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1 overflow-y-auto flex-1">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 border-2 border-success/30 border-t-success rounded-full animate-spin" />
          </div>
        ) : isWeekend ? (
          <p className="text-xs text-muted-foreground text-center py-4">🎉 إجازة نهاية الأسبوع</p>
        ) : periods.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">لا توجد حصص مسجلة لهذا اليوم</p>
        ) : (
          <div className="space-y-1.5">
            {periods.map(([period, classNames]) => (
              <div
                key={period}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-success/15 text-success text-[11px] font-bold shrink-0">
                  {period}
                </span>
                <span className="text-xs font-medium text-foreground flex-1">
                  {classNames.join(" ، ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
