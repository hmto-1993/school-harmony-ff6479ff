import { ClassSummary } from "./pdf-types";

export const computeStudentAvg = (cls: ClassSummary, studentId: string, categories: any[]) => {
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
};
