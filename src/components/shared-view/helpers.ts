import type { ClassSummary } from "./types";

export function computeStudentAvgUI(cls: ClassSummary, studentId: string, categories: any[]): number | null {
  const classCategories = categories.filter((c: any) => c.class_id === cls.id || c.class_id === null);
  const gradesBySt: Record<string, { sum: number; count: number; max: number }> = {};
  cls.grades.filter((g: any) => g.student_id === studentId).forEach((g: any) => {
    const cat = classCategories.find((c: any) => c.id === g.category_id);
    if (!cat || g.score === null) return;
    if (!gradesBySt[g.category_id]) gradesBySt[g.category_id] = { sum: 0, count: 0, max: cat.max_score };
    gradesBySt[g.category_id].sum += Number(g.score);
    gradesBySt[g.category_id].count++;
  });
  cls.manualScores.filter((m: any) => m.student_id === studentId).forEach((m: any) => {
    const cat = classCategories.find((c: any) => c.id === m.category_id);
    if (!cat) return;
    gradesBySt[m.category_id] = { sum: Number(m.score), count: 1, max: cat.max_score };
  });
  let totalScore = 0, totalMax = 0;
  Object.values(gradesBySt).forEach(v => {
    if (v.count > 0) { totalScore += (v.sum / v.count); totalMax += v.max; }
  });
  return totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;
}

export function getGradeLevel(avg: number) {
  if (avg >= 90) return { label: "ممتاز", color: "hsl(160,84%,39%)", index: 0 };
  if (avg >= 80) return { label: "جيد جداً", color: "hsl(217,91%,60%)", index: 1 };
  if (avg >= 70) return { label: "جيد", color: "hsl(45,93%,47%)", index: 2 };
  if (avg >= 60) return { label: "مقبول", color: "hsl(24,94%,53%)", index: 3 };
  return { label: "ضعيف", color: "hsl(0,84%,60%)", index: 4 };
}

export const LEVEL_INFO = [
  { label: "ممتاز", color: "hsl(160,84%,39%)", bg: "hsl(160,84%,39%,0.15)" },
  { label: "جيد جداً", color: "hsl(217,91%,60%)", bg: "hsl(217,91%,60%,0.15)" },
  { label: "جيد", color: "hsl(45,93%,47%)", bg: "hsl(45,93%,47%,0.15)" },
  { label: "مقبول", color: "hsl(24,94%,53%)", bg: "hsl(24,94%,53%,0.15)" },
  { label: "ضعيف", color: "hsl(0,84%,60%)", bg: "hsl(0,84%,60%,0.15)" },
];

export const STATUS_COLORS: Record<string, string> = {
  present: "#4caf50",
  absent: "#e53935",
  late: "#fbc02d",
  sick_leave: "#1e88e5",
  early_leave: "#1e88e5",
};

export const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  sick_leave: "مستأذن",
  early_leave: "خروج مبكر",
};

export function getWeekNum(dateStr: string, startDate: string): number {
  const d = new Date(dateStr);
  const s = new Date(startDate);
  const diff = Math.floor((d.getTime() - s.getTime()) / 86400000);
  return Math.floor(diff / 7) + 1;
}

export function getCurrentWeekNum(startDate: string): number {
  return getWeekNum(new Date().toISOString().split("T")[0], startDate);
}

export const TAB_COLORS: Record<string, { active: string; gradient: string }> = {
  overview: { active: "from-[hsl(195,100%,45%)] to-[hsl(210,90%,50%)]", gradient: "shadow-[hsl(195,100%,50%)/0.3]" },
  attendance: { active: "from-[hsl(160,84%,39%)] to-[hsl(145,70%,42%)]", gradient: "shadow-[hsl(160,84%,39%)/0.3]" },
  weekly: { active: "from-[hsl(210,80%,55%)] to-[hsl(230,70%,55%)]", gradient: "shadow-[hsl(210,80%,55%)/0.3]" },
  grades: { active: "from-[hsl(270,75%,55%)] to-[hsl(290,70%,50%)]", gradient: "shadow-[hsl(270,75%,55%)/0.3]" },
  reports: { active: "from-[hsl(38,92%,50%)] to-[hsl(25,90%,52%)]", gradient: "shadow-[hsl(38,92%,50%)/0.3]" },
  lessons: { active: "from-[hsl(340,75%,55%)] to-[hsl(320,70%,50%)]", gradient: "shadow-[hsl(340,75%,55%)/0.3]" },
};
