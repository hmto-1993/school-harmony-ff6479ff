import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, BookOpen, GraduationCap, TreePalm, AlertTriangle } from "lucide-react";
import { useAcademicWeek, WeekInfo } from "@/hooks/useAcademicWeek";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const HIJRI_MONTHS = ["محرم", "صفر", "ربيع الأول", "ربيع الثاني", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];

function formatDateShort(date: Date): string {
  return `${date.getDate()} ${MONTHS_AR[date.getMonth()]}`;
}

function formatHijriDate(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === "day")?.value || "1";
    const month = parseInt(parts.find(p => p.type === "month")?.value || "1") - 1;
    if (month >= 0 && month < 12) {
      return `${day} ${HIJRI_MONTHS[month]}`;
    }
    return day;
  } catch {
    return "";
  }
}

function getWeekRowStyle(type: WeekInfo["type"]): string {
  switch (type) {
    case "holiday":
      return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800";
    case "midterm":
      return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
    case "final":
      return "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800";
    case "mixed":
      return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
    default:
      return "bg-card border-border";
  }
}

function getWeekBadgeVariant(type: WeekInfo["type"]): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "holiday": return "secondary";
    case "midterm": return "default";
    case "final": return "destructive";
    case "mixed": return "default";
    default: return "outline";
  }
}

function getWeekIcon(type: WeekInfo["type"]) {
  switch (type) {
    case "holiday": return <TreePalm className="h-3 w-3" />;
    case "midterm": return <AlertTriangle className="h-3 w-3" />;
    case "final": return <GraduationCap className="h-3 w-3" />;
    case "mixed": return <AlertTriangle className="h-3 w-3" />;
    default: return <BookOpen className="h-3 w-3" />;
  }
}

function isSameWeek(a: Date, weekStart: Date, weekEnd: Date): boolean {
  const t = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  return t >= weekStart.getTime() && t <= weekEnd.getTime();
}

function addDaysUtil(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export default function AcademicCalendarWidget() {
  const { calendarData, currentWeek, getWeeksInfo } = useAcademicWeek();
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo | null>(null);
  const [schoolDays, setSchoolDays] = useState<number[]>([0, 1, 2, 3, 4]); // default Sun-Thu

  useEffect(() => {
    supabase
      .from("class_schedules")
      .select("days_of_week")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.days_of_week && data.days_of_week.length > 0) {
          setSchoolDays(data.days_of_week.sort((a: number, b: number) => a - b));
        }
      });
  }, []);

  const weeks = useMemo(() => getWeeksInfo(), [getWeeksInfo]);

  const today = new Date();

  // Build status text for selected or current week
  const activeWeek = selectedWeek || weeks.find(w => w.weekNumber === currentWeek) || null;

  const statusText = useMemo(() => {
    if (!activeWeek) return null;
    const parts: string[] = [];
    // Hijri range
    const hijriStart = formatHijriDate(activeWeek.startDate);
    const hijriEnd = formatHijriDate(activeWeek.endDate);
    if (hijriStart && hijriEnd) {
      parts.push(`${hijriStart} - ${hijriEnd} هـ`);
    }
    // Gregorian range
    parts.push(`${formatDateShort(activeWeek.startDate)} - ${formatDateShort(activeWeek.endDate)} م`);
    parts.push(`الأسبوع ${activeWeek.weekNumber}`);
    if (activeWeek.type !== "normal") {
      parts.push(activeWeek.label);
    }
    return parts.join(" • ");
  }, [activeWeek]);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              التقويم الأكاديمي
            </CardTitle>
          </div>

          {/* Status banner */}
          {calendarData && statusText && (
            <div className={cn(
              "mt-2 rounded-lg px-3 py-2 text-sm font-medium text-center transition-colors",
              activeWeek?.type === "final" && "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200",
              activeWeek?.type === "midterm" && "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200",
              activeWeek?.type === "holiday" && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200",
              activeWeek?.type === "mixed" && "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200",
              activeWeek?.type === "normal" && "bg-muted text-muted-foreground",
            )}>
              {statusText}
            </div>
          )}

          {!calendarData && (
            <p className="text-sm text-muted-foreground mt-1">
              اذهب إلى الإعدادات لتحديد بداية الفصل الدراسي
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {calendarData && weeks.length > 0 && (
            <>
              {/* Week-based grid */}
              <div className="border rounded-lg overflow-hidden max-h-[360px] overflow-y-auto">
                {/* Header */}
                <div className="grid grid-cols-[50px_1fr_auto] bg-muted/50 text-xs font-medium text-muted-foreground sticky top-0 z-10">
                  <div className="p-2 text-center border-l border-border">الأسبوع</div>
                  <div className="p-2 text-center border-l border-border">الفترة</div>
                  <div className="p-2 text-center px-3">الحالة</div>
                </div>

                {/* Weeks */}
                {weeks.map((week) => {
                  const isCurrent = week.weekNumber === currentWeek;
                  const isSelected = selectedWeek?.weekNumber === week.weekNumber;

                  return (
                    <div
                      key={week.weekNumber}
                      onClick={() => setSelectedWeek(isSelected ? null : week)}
                      className={cn(
                        "grid grid-cols-[50px_1fr_auto] border-t cursor-pointer transition-all",
                        isCurrent
                          ? "bg-sky-100 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 ring-2 ring-sky-400 dark:ring-sky-500 ring-inset shadow-md"
                          : getWeekRowStyle(week.type),
                        !isCurrent && isSelected && "ring-2 ring-primary/60 ring-inset shadow-sm",
                        "hover:brightness-95 dark:hover:brightness-110",
                      )}
                    >
                      {/* Week number */}
                      <div className={cn(
                        "p-2 text-center text-sm font-bold border-l flex items-center justify-center",
                        isCurrent ? "text-sky-700 dark:text-sky-300" : "text-foreground/70",
                      )}>
                        {isCurrent ? (
                          <span className="bg-sky-500 dark:bg-sky-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold">
                            {week.weekNumber}
                          </span>
                        ) : week.weekNumber}
                      </div>

                      {/* Date range - School days only */}
                      <div className="p-2 border-l flex flex-col justify-center gap-0.5">
                        {(() => {
                          const firstDay = schoolDays[0] ?? 0;
                          const lastDay = schoolDays[schoolDays.length - 1] ?? 4;
                          const weekStartDay = week.startDate.getDay();
                          const schoolStart = addDaysUtil(week.startDate, ((firstDay - weekStartDay) + 7) % 7);
                          const schoolEnd = addDaysUtil(week.startDate, ((lastDay - weekStartDay) + 7) % 7);
                          return (
                            <>
                              <span className="text-xs text-foreground/80">
                                {formatDateShort(schoolStart)} – {formatDateShort(schoolEnd)} م
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatHijriDate(schoolStart)} – {formatHijriDate(schoolEnd)} هـ
                              </span>
                            </>
                          );
                        })()}
                      </div>

                      {/* Status badge */}
                      <div className="p-2 flex items-center justify-center px-3">
                        {week.type !== "normal" ? (
                          <Badge variant={getWeekBadgeVariant(week.type)} className="gap-1 text-[10px] whitespace-nowrap">
                            {getWeekIcon(week.type)}
                            <span className="hidden sm:inline">{week.label.length > 20 ? week.label.slice(0, 20) + "…" : week.label}</span>
                            <span className="sm:hidden">
                              {week.type === "holiday" ? "إجازة" : week.type === "midterm" ? "نصفي" : week.type === "final" ? "نهائي" : "مختلط"}
                            </span>
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">دراسة</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300" />
                  <span>إجازة</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300" />
                  <span>اختبارات نصفية</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-rose-100 dark:bg-rose-900/40 border border-rose-300" />
                  <span>اختبارات نهائية</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-sky-100 dark:bg-sky-900/40 border-2 border-sky-400" />
                  <span>الأسبوع الحالي</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-card border border-border" />
                  <span>دراسة</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
