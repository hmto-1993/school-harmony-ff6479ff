import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slot {
  period_number: number;
  subject_name: string;
}

interface ClassOption { id: string; name: string; }

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function TodayScheduleWidget() {
  const { user, role } = useAuth();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [todaySlots, setTodaySlots] = useState<Slot[]>([]);
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
    supabase
      .from("timetable_slots")
      .select("period_number, subject_name")
      .eq("class_id", selectedClassId)
      .eq("day_of_week", todayDay)
      .order("period_number")
      .then(({ data }) => {
        setTodaySlots((data || []).filter(s => s.subject_name.trim()) as Slot[]);
        setLoading(false);
      });
  }, [selectedClassId, todayDay]);

  const isWeekend = todayDay === 5 || todayDay === 6;

  return (
    <Card className="border-0 ring-1 ring-success/20 bg-gradient-to-br from-success/5 via-card to-success/10 overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-success to-success/70 shadow-md">
            <Clock className="h-4 w-4 text-success-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-bold text-foreground">حصص اليوم</CardTitle>
            <p className="text-[11px] text-muted-foreground">{DAY_NAMES[todayDay]}</p>
          </div>
          {todaySlots.length > 0 && (
            <Badge className="bg-success/15 text-success hover:bg-success/20 border-0 text-xs">
              {todaySlots.length} حصص
            </Badge>
          )}
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
      <CardContent className="px-4 pb-4 pt-1">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 border-2 border-success/30 border-t-success rounded-full animate-spin" />
          </div>
        ) : isWeekend ? (
          <p className="text-xs text-muted-foreground text-center py-4">🎉 إجازة نهاية الأسبوع</p>
        ) : todaySlots.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">لا توجد حصص مسجلة لهذا اليوم</p>
        ) : (
          <div className="space-y-1.5">
            {todaySlots.map((slot, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-success/15 text-success text-[11px] font-bold shrink-0">
                  {slot.period_number}
                </span>
                <span className="text-xs font-medium text-foreground flex-1">{slot.subject_name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
