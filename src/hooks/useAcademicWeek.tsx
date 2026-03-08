import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ExamDate {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "اختبارات منتصف الفصل"
  type: "midterm" | "final";
}

export interface AcademicCalendarData {
  id?: string;
  start_date: string;
  total_weeks: number;
  exam_dates: ExamDate[];
  semester: string;
  academic_year: string;
}

interface AcademicWeekContextValue {
  calendarData: AcademicCalendarData | null;
  loading: boolean;
  currentWeek: number | null;
  getWeekForDate: (date: Date) => number | null;
  getExamForDate: (date: Date) => ExamDate | null;
  isExamWeek: (date: Date) => ExamDate | null;
  refetch: () => Promise<void>;
}

const AcademicWeekContext = createContext<AcademicWeekContextValue | undefined>(undefined);

function dateDiffDays(a: Date, b: Date): number {
  const msPerDay = 86400000;
  const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((bUtc - aUtc) / msPerDay);
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
      setCalendarData({
        id: data.id,
        start_date: data.start_date,
        total_weeks: data.total_weeks,
        exam_dates: (data.exam_dates as any as ExamDate[]) || [],
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
    // Check if any exam date falls in the same week
    const start = new Date(calendarData.start_date);
    for (const exam of calendarData.exam_dates) {
      const examDate = new Date(exam.date);
      const examWeek = getWeekForDate(examDate);
      if (examWeek === week) return exam;
    }
    return null;
  }, [calendarData, getWeekForDate]);

  const currentWeek = getWeekForDate(new Date());

  return (
    <AcademicWeekContext.Provider value={{
      calendarData, loading, currentWeek,
      getWeekForDate, getExamForDate, isExamWeek,
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
