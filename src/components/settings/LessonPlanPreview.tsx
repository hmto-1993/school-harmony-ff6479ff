import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { BookOpen, CalendarRange, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LessonSlot } from "@/hooks/useLessonPlanData";
import { WEEKLY_DAY_INDEX } from "@/hooks/useLessonPlanData";

const DAY_LABELS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

interface Props {
  slots: Record<string, LessonSlot>;
  daysOfWeek: number[];
  weekNumber: number;
}

export default function LessonPlanPreview({ slots, daysOfWeek, weekNumber }: Props) {
  const todayDayIndex = new Date().getDay();

  const byDay = new Map<number, { title: string; completed: boolean }[]>();
  const weeklyLessons: { title: string; completed: boolean }[] = [];

  Object.entries(slots).forEach(([key, slot]) => {
    if (!slot.lesson_title.trim()) return;
    const [dayIdx] = key.split("-").map(Number);
    if (dayIdx === WEEKLY_DAY_INDEX) {
      weeklyLessons.push({ title: slot.lesson_title, completed: slot.is_completed });
    } else {
      if (!byDay.has(dayIdx)) byDay.set(dayIdx, []);
      byDay.get(dayIdx)!.push({ title: slot.lesson_title, completed: slot.is_completed });
    }
  });

  const allLessons = [...weeklyLessons, ...Array.from(byDay.values()).flat()];
  const completedCount = allLessons.filter(l => l.completed).length;
  const total = allLessons.length;

  return (
    <div className="mt-6">
      <Label className="text-xs font-bold text-muted-foreground mb-2 block">معاينة الويدجت في لوحة التحكم</Label>
      <div className="max-w-sm mx-auto">
        <Card className="border-0 ring-1 ring-info/20 bg-gradient-to-br from-info/5 via-card to-info/10 overflow-hidden">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-info to-info/70 shadow-md">
                <BookOpen className="h-4 w-4 text-info-foreground" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm font-bold text-foreground">دروس الأسبوع {weekNumber}</CardTitle>
                <p className="text-[11px] text-muted-foreground">خطة الدروس الأسبوعية</p>
              </div>
              {total > 0 && (
                <Badge className="bg-info/15 text-info hover:bg-info/20 border-0 text-xs">
                  {completedCount}/{total}
                </Badge>
              )}
            </div>
            {total > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <Progress value={(completedCount / total) * 100} className="h-2 flex-1 bg-muted/50 [&>div]:bg-gradient-to-l [&>div]:from-success [&>div]:to-success/70" />
                <span className="text-[10px] font-semibold text-muted-foreground min-w-[32px] text-left">
                  {Math.round((completedCount / total) * 100)}%
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
              {weeklyLessons.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold mb-1 text-accent flex items-center gap-1">
                    <CalendarRange className="h-3 w-3" />أسبوعي
                  </p>
                  <div className="space-y-1">
                    {weeklyLessons.map((l, i) => (
                      <div key={i} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs", l.completed ? "bg-success/10 text-success" : "bg-accent/10 text-foreground")}>
                        {l.completed ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" /> : <Circle className="h-3.5 w-3.5 shrink-0 text-accent" />}
                        <span className={cn("truncate flex-1", l.completed && "line-through opacity-70")}>{l.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Array.from(byDay.entries()).sort(([a], [b]) => a - b).map(([dayIdx, dayLessons]) => (
                <div key={dayIdx}>
                  <p className={cn("text-[11px] font-bold mb-1", dayIdx === todayDayIndex ? "text-info" : "text-muted-foreground")}>
                    {DAY_LABELS[dayIdx] || `يوم ${dayIdx}`}
                    {dayIdx === todayDayIndex && <span className="mr-1 text-[10px] font-normal">(اليوم)</span>}
                  </p>
                  <div className="space-y-1">
                    {dayLessons.map((l, i) => (
                      <div key={i} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs", l.completed ? "bg-success/10 text-success" : "bg-muted/50 text-foreground")}>
                        {l.completed ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" /> : <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        <span className={cn("truncate flex-1", l.completed && "line-through opacity-70")}>{l.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
