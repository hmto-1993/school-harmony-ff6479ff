import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ExcellenceStudent {
  id: string;
  full_name: string;
  class_name: string;
  perfectAttendance: boolean;
  fullMarks: boolean;
  fullMarkTests: string[];
}

export interface DisciplinaryStudent {
  id: string;
  full_name: string;
  class_name: string;
  absenceDays: number;
  warningStatus: "sent" | "pending";
}

export interface AnalyticsStats {
  avgClassScore: number;
  fullMarkCertificates: number;
  absenceWarnings: number;
  perfectAttendanceCount: number;
  totalStudents: number;
}

export const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export function useMonthlyAnalytics(selectedClass: string) {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [classFilter, setClassFilter] = useState(selectedClass || "all");

  const [excellenceStudents, setExcellenceStudents] = useState<ExcellenceStudent[]>([]);
  const [disciplinaryStudents, setDisciplinaryStudents] = useState<DisciplinaryStudent[]>([]);
  const [stats, setStats] = useState<AnalyticsStats>({
    avgClassScore: 0, fullMarkCertificates: 0, absenceWarnings: 0,
    perfectAttendanceCount: 0, totalStudents: 0,
  });

  useEffect(() => {
    setClassFilter(selectedClass || "all");
  }, [selectedClass]);

  const monthStart = useMemo(() => {
    const m = parseInt(selectedMonth);
    const y = parseInt(selectedYear);
    return new Date(y, m, 1).toISOString().split("T")[0];
  }, [selectedMonth, selectedYear]);

  const monthEnd = useMemo(() => {
    const m = parseInt(selectedMonth);
    const y = parseInt(selectedYear);
    return new Date(y, m + 1, 0).toISOString().split("T")[0];
  }, [selectedMonth, selectedYear]);

  const fetchAnalytics = async () => {
    setLoading(true);

    let studentsQuery = supabase
      .from("students")
      .select("id, full_name, class_id, classes(name)")
      .order("full_name");

    if (classFilter !== "all") {
      studentsQuery = studentsQuery.eq("class_id", classFilter);
    }

    const [
      { data: students },
      { data: attendance },
      { data: grades },
      { data: notifications },
    ] = await Promise.all([
      studentsQuery,
      supabase.from("attendance_records")
        .select("student_id, status, date")
        .gte("date", monthStart)
        .lte("date", monthEnd),
      supabase.from("grades")
        .select("student_id, score, category_id, grade_categories(name, max_score)")
        .not("score", "is", null),
      supabase.from("notifications")
        .select("student_id, type, created_at")
        .in("type", ["absent", "warning"])
        .gte("created_at", `${monthStart}T00:00:00`)
        .lte("created_at", `${monthEnd}T23:59:59`),
    ]);

    if (!students || students.length === 0) {
      setExcellenceStudents([]);
      setDisciplinaryStudents([]);
      setStats({ avgClassScore: 0, fullMarkCertificates: 0, absenceWarnings: 0, perfectAttendanceCount: 0, totalStudents: 0 });
      setLoading(false);
      return;
    }

    const studentAbsences = new Map<string, number>();
    const studentHasAttendance = new Set<string>();
    (attendance || []).forEach(a => {
      studentHasAttendance.add(a.student_id);
      if (a.status === "absent") {
        studentAbsences.set(a.student_id, (studentAbsences.get(a.student_id) || 0) + 1);
      }
    });

    const studentFullMarks = new Map<string, string[]>();
    let fullMarkCertCount = 0;
    (grades || []).forEach(g => {
      const catName = (g.grade_categories as any)?.name || "";
      const maxScore = (g.grade_categories as any)?.max_score || 0;
      if (g.score === maxScore && maxScore > 0) {
        const existing = studentFullMarks.get(g.student_id) || [];
        if (!existing.includes(catName)) {
          studentFullMarks.set(g.student_id, [...existing, catName]);
          fullMarkCertCount++;
        }
      }
    });

    const studentWarnings = new Set<string>();
    (notifications || []).forEach(n => {
      studentWarnings.add(n.student_id);
    });

    const scores = (grades || []).map(g => {
      const max = (g.grade_categories as any)?.max_score || 100;
      return max > 0 ? (g.score! / max) * 100 : 0;
    });
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const excellence: ExcellenceStudent[] = [];
    const disciplinary: DisciplinaryStudent[] = [];
    let perfectCount = 0;

    for (const student of students) {
      const absences = studentAbsences.get(student.id) || 0;
      const hasAttendance = studentHasAttendance.has(student.id);
      const isPerfectAttendance = hasAttendance && absences === 0;
      const fullMarks = studentFullMarks.get(student.id) || [];
      const className = (student.classes as any)?.name || "";

      if (isPerfectAttendance) perfectCount++;

      if (isPerfectAttendance || fullMarks.length > 0) {
        excellence.push({
          id: student.id, full_name: student.full_name, class_name: className,
          perfectAttendance: isPerfectAttendance, fullMarks: fullMarks.length > 0, fullMarkTests: fullMarks,
        });
      }

      if (absences >= 3) {
        disciplinary.push({
          id: student.id, full_name: student.full_name, class_name: className,
          absenceDays: absences, warningStatus: studentWarnings.has(student.id) ? "sent" : "pending",
        });
      }
    }

    excellence.sort((a, b) => {
      const aScore = (a.perfectAttendance ? 1 : 0) + (a.fullMarks ? 1 : 0);
      const bScore = (b.perfectAttendance ? 1 : 0) + (b.fullMarks ? 1 : 0);
      return bScore - aScore;
    });
    disciplinary.sort((a, b) => b.absenceDays - a.absenceDays);

    setExcellenceStudents(excellence);
    setDisciplinaryStudents(disciplinary);
    setStats({
      avgClassScore: avgScore, fullMarkCertificates: fullMarkCertCount,
      absenceWarnings: disciplinary.length, perfectAttendanceCount: perfectCount,
      totalStudents: students.length,
    });
    setLoading(false);
  };

  const getMonthLabel = () => `${MONTHS_AR[parseInt(selectedMonth)]} ${selectedYear}`;

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return {
    loading, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
    classFilter, setClassFilter, excellenceStudents, disciplinaryStudents,
    stats, fetchAnalytics, getMonthLabel, years,
  };
}
