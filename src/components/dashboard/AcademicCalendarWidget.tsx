import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Settings2, CalendarDays, BookOpen, GraduationCap } from "lucide-react";
import { useAcademicWeek, ExamDate } from "@/hooks/useAcademicWeek";
import { cn } from "@/lib/utils";
import AcademicCalendarSettings from "./AcademicCalendarSettings";

const WEEKDAYS = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function AcademicCalendarWidget() {
  const { calendarData, getWeekForDate, getExamForDate, isExamWeek, currentWeek } = useAcademicWeek();
  const [showSettings, setShowSettings] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const today = new Date();

  const handlePrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const handleNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const { weeks, firstDay } = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const dates: (Date | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) dates.push(new Date(viewYear, viewMonth, d));
    while (dates.length % 7 !== 0) dates.push(null);
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < dates.length; i += 7) weeks.push(dates.slice(i, i + 7));
    return { weeks, firstDay };
  }, [viewYear, viewMonth]);

  // Get week number for the first date in each row
  const getRowWeek = (week: (Date | null)[]) => {
    const firstDate = week.find(d => d !== null);
    if (!firstDate) return null;
    return getWeekForDate(firstDate);
  };

  // Get exam info for a date
  const getDateExamStyle = (date: Date): string => {
    const exam = getExamForDate(date);
    if (exam) {
      return exam.type === "midterm"
        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-bold"
        : "bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-200 font-bold";
    }
    const examWeek = isExamWeek(date);
    if (examWeek) {
      return examWeek.type === "midterm"
        ? "bg-amber-50 dark:bg-amber-900/20"
        : "bg-red-50 dark:bg-red-900/20";
    }
    return "";
  };

  // Current status banner
  const statusParts: string[] = [];
  if (currentWeek) statusParts.push(`الأسبوع ${currentWeek}`);
  const todayExam = isExamWeek(today);
  if (todayExam) statusParts.push(todayExam.label);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              التقويم الأكاديمي
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} className="h-8 w-8">
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Status banner */}
          {calendarData && statusParts.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {currentWeek && (
                <Badge variant="secondary" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  الأسبوع {currentWeek} من {calendarData.total_weeks}
                </Badge>
              )}
              {todayExam && (
                <Badge variant={todayExam.type === "final" ? "destructive" : "outline"} className="gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {todayExam.label}
                </Badge>
              )}
            </div>
          )}

          {!calendarData && (
            <p className="text-sm text-muted-foreground mt-1">
              اضغط على الإعدادات لتحديد بداية الفصل الدراسي
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={handlePrev} className="p-1 rounded hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">{MONTHS_AR[viewMonth]} {viewYear}</span>
            <button onClick={handleNext} className="p-1 rounded hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Grid */}
          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[40px_repeat(7,1fr)] bg-muted/50 text-xs font-medium text-muted-foreground">
              <div className="p-1.5 text-center border-l border-border">أسبوع</div>
              {WEEKDAYS.map(d => (
                <div key={d} className="p-1.5 text-center border-l border-border last:border-l-0">{d}</div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, wi) => {
              const weekNum = getRowWeek(week);
              return (
                <div key={wi} className="grid grid-cols-[40px_repeat(7,1fr)] border-t border-border">
                  <div className={cn(
                    "p-1 text-center text-[10px] font-bold border-l border-border flex items-center justify-center",
                    weekNum ? "text-primary bg-primary/5" : "text-muted-foreground/40"
                  )}>
                    {weekNum || "-"}
                  </div>
                  {week.map((day, di) => {
                    if (!day) return <div key={di} className="p-1 border-l border-border last:border-l-0 min-h-[32px]" />;
                    const isToday = isSameDay(day, today);
                    const examStyle = calendarData ? getDateExamStyle(day) : "";
                    const inAcademic = calendarData ? getWeekForDate(day) !== null : false;

                    return (
                      <div key={di} className={cn(
                        "p-1 text-center text-xs border-l border-border last:border-l-0 min-h-[32px] flex items-center justify-center transition-colors",
                        examStyle,
                        isToday && "ring-2 ring-primary ring-inset rounded-sm",
                        !inAcademic && calendarData && "opacity-40",
                      )}>
                        {day.getDate()}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          {calendarData && calendarData.exam_dates.length > 0 && (
            <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300" />
                <span>اختبارات نصفية</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/40 border border-red-300" />
                <span>اختبارات نهائية</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showSettings && <AcademicCalendarSettings onClose={() => setShowSettings(false)} />}
    </>
  );
}
