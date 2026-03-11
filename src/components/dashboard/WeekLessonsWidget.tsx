import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { cn } from "@/lib/utils";

interface LessonItem {
  id: string;
  day_index: number;
  slot_index: number;
  lesson_title: string;
  is_completed: boolean;
}

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export default function WeekLessonsWidget() {
  const { currentWeek } = useAcademicWeek();
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWeek) {
      setLoading(false);
      return;
    }
    supabase
      .from("lesson_plans")
      .select("id, day_index, slot_index, lesson_title, is_completed")
      .eq("week_number", currentWeek)
      .order("day_index")
      .order("slot_index")
      .then(({ data }) => {
        setLessons((data || []).filter((l) => l.lesson_title.trim()));
        setLoading(false);
      });
  }, [currentWeek]);

  const completedCount = lessons.filter((l) => l.is_completed).length;
  const todayDayIndex = new Date().getDay(); // 0=Sun

  if (loading) {
    return <Card className="border-0 ring-1 ring-border/30 animate-pulse h-48 bg-muted/30" />;
  }

  // Group by day
  const byDay = new Map<number, LessonItem[]>();
  lessons.forEach((l) => {
    if (!byDay.has(l.day_index)) byDay.set(l.day_index, []);
    byDay.get(l.day_index)!.push(l);
  });

  return (
    <Card className="border-0 ring-1 ring-info/20 bg-gradient-to-br from-info/5 via-card to-info/10 overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-info to-info/70 shadow-md">
            <BookOpen className="h-4 w-4 text-info-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-bold text-foreground">
              دروس الأسبوع {currentWeek || "—"}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">خطة الدروس الأسبوعية</p>
          </div>
          {lessons.length > 0 && (
            <Badge className="bg-info/15 text-info hover:bg-info/20 border-0 text-xs">
              {completedCount}/{lessons.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        {lessons.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {currentWeek ? "لم يتم تعيين دروس لهذا الأسبوع" : "لا يوجد تقويم أكاديمي"}
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
            {Array.from(byDay.entries()).map(([dayIdx, dayLessons]) => (
              <div key={dayIdx}>
                <p className={cn(
                  "text-[11px] font-bold mb-1",
                  dayIdx === todayDayIndex ? "text-info" : "text-muted-foreground"
                )}>
                  {DAY_NAMES[dayIdx] || `يوم ${dayIdx}`}
                  {dayIdx === todayDayIndex && (
                    <span className="mr-1 text-[10px] font-normal">(اليوم)</span>
                  )}
                </p>
                <div className="space-y-1">
                  {dayLessons.map((l) => (
                    <div
                      key={l.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                        l.is_completed
                          ? "bg-success/10 text-success"
                          : "bg-muted/50 text-foreground"
                      )}
                    >
                      {l.is_completed && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />}
                      <span className={cn("truncate flex-1", l.is_completed && "line-through opacity-70")}>
                        {l.lesson_title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
