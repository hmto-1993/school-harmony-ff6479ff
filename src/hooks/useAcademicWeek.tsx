import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ExamDate {
  date: string; // YYYY-MM-DD
  label: string;
  type: "midterm" | "final";
}

export interface HolidayDate {
  date: string; // YYYY-MM-DD (start date)
  end_date?: string; // YYYY-MM-DD (optional end date for ranges)
  label: string;
}

export interface AcademicCalendarData {
  id?: string;
  start_date: string;
  total_weeks: number;
  exam_dates: ExamDate[];
  holidays: HolidayDate[];
  semester: string;
  academic_year: string;
}

export type WeekType = "normal" | "midterm" | "final" | "holiday" | "mixed";

export interface WeekInfo {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  type: WeekType;
  label: string;
  examDates: ExamDate[];
  holidayDates: HolidayDate[];
}

interface AcademicWeekContextValue {
  calendarData: AcademicCalendarData | null;
  loading: boolean;
  currentWeek: number | null;
  getWeekForDate: (date: Date) => number | null;
  getExamForDate: (date: Date) => ExamDate | null;
  isExamWeek: (date: Date) => ExamDate | null;
  getWeeksInfo: () => WeekInfo[];
  refetch: () => Promise<void>;
}

const AcademicWeekContext = createContext<AcademicWeekContextValue | undefined>(undefined);

function dateDiffDays(a: Date, b: Date): number {
  const msPerDay = 86400000;
  const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((bUtc - aUtc) / msPerDay);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function AcademicWeekProvider({ children }: { children: ReactNode }) {
  const [calendarData, setCalendarData] = useState<AcademicCalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("academic_calendar")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const rawExamDates = (data.exam_dates as any) || [];
      // Separate exam_dates and holidays from the combined array
      const examDates: ExamDate[] = [];
      const holidays: HolidayDate[] = [];
      
      for (const item of rawExamDates) {
        if (item.type === "holiday") {
          holidays.push({ date: item.date, end_date: item.end_date, label: item.label });
        } else {
          examDates.push({ date: item.date, label: item.label, type: item.type });
        }
      }

      setCalendarData({
        id: data.id,
        start_date: data.start_date,
        total_weeks: data.total_weeks,
        exam_dates: examDates,
        holidays,
        semester: data.semester,
        academic_year: data.academic_year,
      });
    } else {
      setCalendarData(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const getWeekForDate = useCallback((date: Date): number | null => {
    if (!calendarData) return null;
    const start = new Date(calendarData.start_date);
    const diff = dateDiffDays(start, date);
    if (diff < 0) return null;
    const week = Math.floor(diff / 7) + 1;
    if (week > calendarData.total_weeks) return null;
    return week;
  }, [calendarData]);

  const getExamForDate = useCallback((date: Date): ExamDate | null => {
    if (!calendarData) return null;
    const dateStr = date.toISOString().split("T")[0];
    return calendarData.exam_dates.find(e => e.date === dateStr) || null;
  }, [calendarData]);

  const isExamWeek = useCallback((date: Date): ExamDate | null => {
    if (!calendarData) return null;
    const week = getWeekForDate(date);
    if (!week) return null;
    const start = new Date(calendarData.start_date);
    for (const exam of calendarData.exam_dates) {
      const examDate = new Date(exam.date);
      const examWeek = getWeekForDate(examDate);
      if (examWeek === week) return exam;
    }
    return null;
  }, [calendarData, getWeekForDate]);

  const getWeeksInfo = useCallback((): WeekInfo[] => {
    if (!calendarData) return [];
    const weeks: WeekInfo[] = [];
    const start = new Date(calendarData.start_date);

    for (let w = 1; w <= calendarData.total_weeks; w++) {
      const weekStart = addDays(start, (w - 1) * 7);
      const weekEnd = addDays(weekStart, 6);

      // Find exams in this week
      const weekExams = calendarData.exam_dates.filter(e => {
        const d = new Date(e.date);
        return d >= weekStart && d <= weekEnd;
      });

      // Find holidays in this week
      const weekHolidays = calendarData.holidays.filter(h => {
        const d = new Date(h.date);
        return d >= weekStart && d <= weekEnd;
      });

      let type: WeekType = "normal";
      let label = `أسبوع ${w}`;

      if (weekExams.length > 0 && weekHolidays.length > 0) {
        type = "mixed";
        label = weekExams[0].label;
      } else if (weekExams.length > 0) {
        const hasFinal = weekExams.some(e => e.type === "final");
        type = hasFinal ? "final" : "midterm";
        label = weekExams[0].label;
      } else if (weekHolidays.length > 0) {
        type = "holiday";
        label = weekHolidays[0].label;
      }

      weeks.push({
        weekNumber: w,
        startDate: weekStart,
        endDate: weekEnd,
        type,
        label,
        examDates: weekExams,
        holidayDates: weekHolidays,
      });
    }
    return weeks;
  }, [calendarData]);

  const currentWeek = getWeekForDate(new Date());

  return (
    <AcademicWeekContext.Provider value={{
      calendarData, loading, currentWeek,
      getWeekForDate, getExamForDate, isExamWeek,
      getWeeksInfo,
      refetch: fetchCalendar,
    }}>
      {children}
    </AcademicWeekContext.Provider>
  );
}

export function useAcademicWeek() {
  const context = useContext(AcademicWeekContext);
  if (!context) throw new Error("useAcademicWeek must be used within AcademicWeekProvider");
  return context;
}
