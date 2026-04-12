import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { useQuery } from "@tanstack/react-query";

export interface AbsentStudent {
  id: string;
  full_name: string;
  class_name: string;
}

export interface AtRiskStudent {
  id: string;
  full_name: string;
  class_name: string;
  absenceRate: number;
  totalAbsent: number;
  totalDays: number;
}

export interface DailyAttendance {
  day: string;
  present: number;
  absent: number;
  late: number;
  rate: number;
}

export interface GradeDistribution {
  label: string;
  count: number;
  color: string;
}

export interface BehaviorSummary {
  positive: number;
  negative: number;
  recentTrend: { day: string; positive: number; negative: number }[];
}

const GRADE_COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(195, 100%, 45%)",
  "hsl(45, 93%, 47%)",
  "hsl(25, 95%, 53%)",
  "hsl(0, 84%, 60%)",
];

async function fetchSmartSummary(role: string | null, userId: string | undefined, currentWeek: number | null) {
  const today = format(new Date(), "yyyy-MM-dd");
  const dayIndex = new Date().getDay();
  const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), "yyyy-MM-dd"));
  const dayNames = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

  let teacherClassIds: string[] | null = null;
  if (role === "teacher" && userId) {
    const { data: tc } = await supabase.from("teacher_classes").select("class_id").eq("teacher_id", userId);
    teacherClassIds = (tc || []).map((t: any) => t.class_id);
    if (teacherClassIds.length === 0) {
      return {
        absentToday: [], atRiskStudents: [], currentLesson: null,
        dailyAttendance: [], gradeDistribution: [], behaviorSummary: { positive: 0, negative: 0, recentTrend: [] },
        absSettingsDisplay: { mode: "percentage", threshold: 20, allowedSessions: 0 },
        avgRate: 0, trendDir: "stable" as const,
      };
    }
  }

  let absQuery = supabase.from("attendance_records").select("student_id, students!inner(full_name, class_id, classes!inner(name))").eq("date", today).eq("status", "absent");
  let allAttQuery = supabase.from("attendance_records").select("student_id, status, date").gte("date", last7Days[0]).lte("date", last7Days[6]);
  let studentsQuery = supabase.from("students").select("id, full_name, class_id, classes!inner(name)");
  let behaviorQuery = supabase.from("behavior_records").select("type, date").gte("date", last7Days[0]).lte("date", last7Days[6]);
  const termStart = format(subDays(new Date(), 120), "yyyy-MM-dd");
  let fullAttQuery = supabase.from("attendance_records").select("student_id, status, date").gte("date", termStart);

  if (teacherClassIds) {
    absQuery = absQuery.in("class_id", teacherClassIds);
    allAttQuery = allAttQuery.in("class_id", teacherClassIds);
    studentsQuery = studentsQuery.in("class_id", teacherClassIds);
    behaviorQuery = behaviorQuery.in("class_id", teacherClassIds);
    fullAttQuery = fullAttQuery.in("class_id", teacherClassIds);
  }

  const [absRes, allAttRes, classesRes, lessonRes, settingsRes, gradesRes, behaviorRes, fullAttRes] = await Promise.all([
    absQuery,
    allAttQuery,
    studentsQuery,
    currentWeek
      ? supabase.from("lesson_plans").select("lesson_title").eq("week_number", currentWeek).eq("day_index", dayIndex).eq("slot_index", 0).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("site_settings").select("id, value").in("id", ["absence_threshold", "absence_allowed_sessions", "absence_mode"]),
    supabase.from("grades").select("score, category_id, student_id, grade_categories!inner(max_score)").not("score", "is", null),
    behaviorQuery,
    fullAttQuery,
  ]);

  // Parse settings
  let threshold = 20, allowedSessions = 0, mode = "percentage";
  ((settingsRes as any).data || []).forEach((s: any) => {
    if (s.id === "absence_threshold") threshold = Number(s.value) || 20;
    if (s.id === "absence_allowed_sessions") allowedSessions = Number(s.value) || 0;
    if (s.id === "absence_mode") mode = s.value || "percentage";
  });

  // Absent today
  const absentToday: AbsentStudent[] = (absRes.data || []).map((r: any) => ({
    id: r.student_id, full_name: r.students?.full_name || "", class_name: r.students?.classes?.name || "",
  }));

  // Daily Attendance Chart
  const attData = allAttRes.data || [];
  const dailyMap: Record<string, { present: number; absent: number; late: number }> = {};
  last7Days.forEach(d => { dailyMap[d] = { present: 0, absent: 0, late: 0 }; });
  attData.forEach((r: any) => {
    if (dailyMap[r.date]) {
      if (r.status === "present") dailyMap[r.date].present++;
      else if (r.status === "absent") dailyMap[r.date].absent++;
      else if (r.status === "late") dailyMap[r.date].late++;
    }
  });
  const dailyAttendance: DailyAttendance[] = last7Days.map(d => {
    const v = dailyMap[d];
    const total = v.present + v.absent + v.late;
    return { day: dayNames[new Date(d).getDay()], present: v.present, absent: v.absent, late: v.late, rate: total > 0 ? Math.round((v.present / total) * 100) : 0 };
  });

  // Grade Distribution
  const allGrades = (gradesRes.data || []) as any[];
  const studentIds = (classesRes.data || []).map((s: any) => s.id);
  const grades = teacherClassIds ? allGrades.filter((g: any) => studentIds.includes(g.student_id)) : allGrades;
  const distribution = [
    { label: "ممتاز", count: 0, color: GRADE_COLORS[0] },
    { label: "جيد جداً", count: 0, color: GRADE_COLORS[1] },
    { label: "جيد", count: 0, color: GRADE_COLORS[2] },
    { label: "مقبول", count: 0, color: GRADE_COLORS[3] },
    { label: "ضعيف", count: 0, color: GRADE_COLORS[4] },
  ];
  grades.forEach((g: any) => {
    const maxScore = g.grade_categories?.max_score || 100;
    const pct = (g.score / maxScore) * 100;
    if (pct >= 90) distribution[0].count++;
    else if (pct >= 80) distribution[1].count++;
    else if (pct >= 70) distribution[2].count++;
    else if (pct >= 60) distribution[3].count++;
    else distribution[4].count++;
  });

  // Behavior Summary
  const behaviorData = behaviorRes.data || [];
  let positive = 0, negative = 0;
  const behaviorByDay: Record<string, { positive: number; negative: number }> = {};
  last7Days.forEach(d => { behaviorByDay[d] = { positive: 0, negative: 0 }; });
  behaviorData.forEach((b: any) => {
    const isPositive = ["positive", "إيجابي", "praise", "مشاركة", "participation", "excellence", "تميز"].some(t => b.type?.toLowerCase().includes(t));
    if (isPositive) { positive++; if (behaviorByDay[b.date]) behaviorByDay[b.date].positive++; }
    else { negative++; if (behaviorByDay[b.date]) behaviorByDay[b.date].negative++; }
  });

  // At-Risk Students
  const students = classesRes.data || [];
  const atRiskStudents: AtRiskStudent[] = [];
  if (students.length > 0) {
    const fullDays: Record<string, { absent: number; total: Set<string> }> = {};
    (fullAttRes.data || []).forEach((r: any) => {
      if (!fullDays[r.student_id]) fullDays[r.student_id] = { absent: 0, total: new Set() };
      fullDays[r.student_id].total.add(r.date);
      if (r.status === "absent") fullDays[r.student_id].absent++;
    });

    students.forEach((s: any) => {
      const data = fullDays[s.id];
      if (data && data.total.size >= 5) {
        const rate = (data.absent / data.total.size) * 100;
        let exceeded = false;
        if (mode === "sessions" && allowedSessions > 0) exceeded = data.absent > allowedSessions;
        else exceeded = rate >= threshold;
        if (exceeded) {
          atRiskStudents.push({
            id: s.id, full_name: s.full_name, class_name: (s as any).classes?.name || "",
            absenceRate: Math.round(rate), totalAbsent: data.absent, totalDays: data.total.size,
          });
        }
      }
    });
    atRiskStudents.sort((a, b) => b.absenceRate - a.absenceRate);
  }

  // Compute trend
  const validDays = dailyAttendance.filter(d => d.present + d.absent + d.late > 0);
  const avgRate = validDays.length > 0 ? Math.round(validDays.reduce((s, d) => s + d.rate, 0) / validDays.length) : 0;
  const lastRate = validDays.length > 0 ? validDays[validDays.length - 1].rate : 0;
  const prevRate = validDays.length > 1 ? validDays[validDays.length - 2].rate : lastRate;
  const trendDir = lastRate > prevRate ? "up" : lastRate < prevRate ? "down" : "stable";

  return {
    absentToday, atRiskStudents, currentLesson: lessonRes.data?.lesson_title || null,
    dailyAttendance, gradeDistribution: distribution.filter(d => d.count > 0),
    behaviorSummary: {
      positive, negative,
      recentTrend: last7Days.map(d => ({ day: dayNames[new Date(d).getDay()], positive: behaviorByDay[d].positive, negative: behaviorByDay[d].negative })),
    },
    absSettingsDisplay: { mode, threshold, allowedSessions },
    avgRate, trendDir: trendDir as "up" | "down" | "stable",
  };
}

export function useSmartDashboardData() {
  const { role, user } = useAuth();
  const { currentWeek } = useAcademicWeek();

  const { data, isLoading: loading } = useQuery({
    queryKey: ["smart-dashboard-summary", currentWeek, role, user?.id],
    queryFn: () => fetchSmartSummary(role, user?.id, currentWeek),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user,
  });

  return {
    loading,
    absentToday: data?.absentToday ?? [],
    atRiskStudents: data?.atRiskStudents ?? [],
    currentLesson: data?.currentLesson ?? null,
    dailyAttendance: data?.dailyAttendance ?? [],
    gradeDistribution: data?.gradeDistribution ?? [],
    behaviorSummary: data?.behaviorSummary ?? { positive: 0, negative: 0, recentTrend: [] },
    absSettingsDisplay: data?.absSettingsDisplay ?? { mode: "percentage", threshold: 20, allowedSessions: 0 },
    avgRate: data?.avgRate ?? 0,
    trendDir: data?.trendDir ?? "stable",
    currentWeek,
  };
}
