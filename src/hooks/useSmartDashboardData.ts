import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";

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

export function useSmartDashboardData() {
  const { role, user } = useAuth();
  const [absentToday, setAbsentToday] = useState<AbsentStudent[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [currentLesson, setCurrentLesson] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentWeek } = useAcademicWeek();

  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendance[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [behaviorSummary, setBehaviorSummary] = useState<BehaviorSummary>({ positive: 0, negative: 0, recentTrend: [] });
  const [absSettingsDisplay, setAbsSettingsDisplay] = useState({ mode: "percentage", threshold: 20, allowedSessions: 0 });

  useEffect(() => {
    fetchSummary();
  }, [currentWeek]);

  const fetchSummary = async () => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const dayIndex = new Date().getDay();
    const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), "yyyy-MM-dd"));

    let teacherClassIds: string[] | null = null;
    if (role === "teacher" && user) {
      const { data: tc } = await supabase
        .from("teacher_classes")
        .select("class_id")
        .eq("teacher_id", user.id);
      teacherClassIds = (tc || []).map((t: any) => t.class_id);
      if (teacherClassIds.length === 0) {
        setLoading(false);
        return;
      }
    }

    let absQuery = supabase
      .from("attendance_records")
      .select("student_id, students!inner(full_name, class_id, classes!inner(name))")
      .eq("date", today)
      .eq("status", "absent");
    if (teacherClassIds) absQuery = absQuery.in("class_id", teacherClassIds);

    let allAttQuery = supabase
      .from("attendance_records")
      .select("student_id, status, date")
      .gte("date", last7Days[0])
      .lte("date", last7Days[6]);
    if (teacherClassIds) allAttQuery = allAttQuery.in("class_id", teacherClassIds);

    let studentsQuery = supabase
      .from("students")
      .select("id, full_name, class_id, classes!inner(name)");
    if (teacherClassIds) studentsQuery = studentsQuery.in("class_id", teacherClassIds);

    let behaviorQuery = supabase
      .from("behavior_records")
      .select("type, date")
      .gte("date", last7Days[0])
      .lte("date", last7Days[6]);
    if (teacherClassIds) behaviorQuery = behaviorQuery.in("class_id", teacherClassIds);

    let fullAttQuery = supabase.from("attendance_records").select("student_id, status, date").limit(5000);
    if (teacherClassIds) fullAttQuery = fullAttQuery.in("class_id", teacherClassIds);

    const [absRes, allAttRes, classesRes, lessonRes, settingsRes, gradesRes, behaviorRes, fullAttRes] = await Promise.all([
      absQuery,
      allAttQuery,
      studentsQuery,
      currentWeek
        ? supabase
            .from("lesson_plans")
            .select("lesson_title")
            .eq("week_number", currentWeek)
            .eq("day_index", dayIndex)
            .eq("slot_index", 0)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("site_settings")
        .select("id, value")
        .in("id", ["absence_threshold", "absence_allowed_sessions", "absence_mode"]),
      supabase
        .from("grades")
        .select("score, category_id, student_id, grade_categories!inner(max_score)")
        .not("score", "is", null),
      behaviorQuery,
      fullAttQuery,
    ]);

    // Parse settings
    let threshold = 20;
    let allowedSessions = 0;
    let mode = "percentage";
    ((settingsRes as any).data || []).forEach((s: any) => {
      if (s.id === "absence_threshold") threshold = Number(s.value) || 20;
      if (s.id === "absence_allowed_sessions") allowedSessions = Number(s.value) || 0;
      if (s.id === "absence_mode") mode = s.value || "percentage";
    });
    setAbsSettingsDisplay({ mode, threshold, allowedSessions });

    // Absent today
    const absentList: AbsentStudent[] = (absRes.data || []).map((r: any) => ({
      id: r.student_id,
      full_name: r.students?.full_name || "",
      class_name: r.students?.classes?.name || "",
    }));
    setAbsentToday(absentList);
    setCurrentLesson(lessonRes.data?.lesson_title || null);

    // Daily Attendance Chart
    const attData = allAttRes.data || [];
    const dayNames = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];
    const dailyMap: Record<string, { present: number; absent: number; late: number }> = {};
    last7Days.forEach(d => { dailyMap[d] = { present: 0, absent: 0, late: 0 }; });
    attData.forEach((r: any) => {
      if (dailyMap[r.date]) {
        if (r.status === "present") dailyMap[r.date].present++;
        else if (r.status === "absent") dailyMap[r.date].absent++;
        else if (r.status === "late") dailyMap[r.date].late++;
      }
    });
    const dailyArr: DailyAttendance[] = last7Days.map(d => {
      const v = dailyMap[d];
      const total = v.present + v.absent + v.late;
      return {
        day: dayNames[new Date(d).getDay()],
        present: v.present, absent: v.absent, late: v.late,
        rate: total > 0 ? Math.round((v.present / total) * 100) : 0,
      };
    });
    setDailyAttendance(dailyArr);

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
    setGradeDistribution(distribution.filter(d => d.count > 0));

    // Behavior Summary
    const behaviorData = behaviorRes.data || [];
    let positive = 0, negative = 0;
    const behaviorByDay: Record<string, { positive: number; negative: number }> = {};
    last7Days.forEach(d => { behaviorByDay[d] = { positive: 0, negative: 0 }; });
    behaviorData.forEach((b: any) => {
      const isPositive = ["positive", "إيجابي", "praise", "مشاركة", "participation", "excellence", "تميز"].some(
        t => b.type?.toLowerCase().includes(t)
      );
      if (isPositive) {
        positive++;
        if (behaviorByDay[b.date]) behaviorByDay[b.date].positive++;
      } else {
        negative++;
        if (behaviorByDay[b.date]) behaviorByDay[b.date].negative++;
      }
    });
    setBehaviorSummary({
      positive, negative,
      recentTrend: last7Days.map(d => ({
        day: dayNames[new Date(d).getDay()],
        positive: behaviorByDay[d].positive,
        negative: behaviorByDay[d].negative,
      })),
    });

    // At-Risk Students
    const students = classesRes.data || [];
    if (students.length > 0) {
      const fullDays: Record<string, { absent: number; total: Set<string> }> = {};
      (fullAttRes.data || []).forEach((r: any) => {
        if (!fullDays[r.student_id]) fullDays[r.student_id] = { absent: 0, total: new Set() };
        fullDays[r.student_id].total.add(r.date);
        if (r.status === "absent") fullDays[r.student_id].absent++;
      });

      const risk: AtRiskStudent[] = [];
      students.forEach((s: any) => {
        const data = fullDays[s.id];
        if (data && data.total.size >= 5) {
          const rate = (data.absent / data.total.size) * 100;
          let exceeded = false;
          if (mode === "sessions" && allowedSessions > 0) {
            exceeded = data.absent > allowedSessions;
          } else {
            exceeded = rate >= threshold;
          }
          if (exceeded) {
            risk.push({
              id: s.id, full_name: s.full_name,
              class_name: (s as any).classes?.name || "",
              absenceRate: Math.round(rate),
              totalAbsent: data.absent,
              totalDays: data.total.size,
            });
          }
        }
      });
      risk.sort((a, b) => b.absenceRate - a.absenceRate);
      setAtRiskStudents(risk);
    }

    setLoading(false);
  };

  // Compute trend
  const validDays = dailyAttendance.filter(d => d.present + d.absent + d.late > 0);
  const avgRate = validDays.length > 0 ? Math.round(validDays.reduce((s, d) => s + d.rate, 0) / validDays.length) : 0;
  const lastRate = validDays.length > 0 ? validDays[validDays.length - 1].rate : 0;
  const prevRate = validDays.length > 1 ? validDays[validDays.length - 2].rate : lastRate;
  const trendDir = lastRate > prevRate ? "up" : lastRate < prevRate ? "down" : "stable";

  return {
    loading, absentToday, atRiskStudents, currentLesson,
    dailyAttendance, gradeDistribution, behaviorSummary,
    absSettingsDisplay, avgRate, trendDir, currentWeek,
  };
}
