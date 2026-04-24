import type { CategoryMeta, GradeRow } from "@/hooks/useReportSending";

export type ViewMode = "raw" | "percent";
export type SortKey = "name" | "raw" | "percent";
export type SortDir = "asc" | "desc";

export const ABSENCE_REASONS = [
  { value: "official", label: "غياب بعذر رسمي" },
  { value: "unexcused", label: "غياب بدون عذر" },
  { value: "medical", label: "ظروف صحية" },
  { value: "late", label: "تأخر عن موعد الاختبار" },
] as const;

export const PERFORMANCE_LEVELS = [
  { key: "excellent", label: "امتياز", min: 90, color: "hsl(142, 70%, 45%)" },
  { key: "very_good", label: "جيد جداً", min: 80, color: "hsl(160, 60%, 45%)" },
  { key: "good", label: "جيد", min: 70, color: "hsl(200, 70%, 50%)" },
  { key: "acceptable", label: "مقبول", min: 60, color: "hsl(40, 80%, 55%)" },
  { key: "struggling", label: "متعثر", min: 0, color: "hsl(0, 70%, 55%)" },
] as const;

export function getReasonLabel(value: string): string {
  return ABSENCE_REASONS.find((r) => r.value === value)?.label || value;
}

export function classifyLevel(percent: number) {
  for (const lvl of PERFORMANCE_LEVELS) {
    if (percent >= lvl.min) return lvl;
  }
  return PERFORMANCE_LEVELS[PERFORMANCE_LEVELS.length - 1];
}

export function studentPercent(row: GradeRow, categories: CategoryMeta[]): number {
  // Final percent = sum(score/max * weight) / sum(weight)
  const totalWeight = categories.reduce((s, c) => s + (c.weight || 0), 0) || 100;
  let acc = 0;
  categories.forEach((c) => {
    const score = row.categories[c.name];
    if (score !== null && score !== undefined) {
      acc += (score / (c.max_score || 100)) * (c.weight || 0);
    }
  });
  return Math.round((acc / totalWeight) * 10000) / 100; // already weighted; total scaled to 100
}

export function homeworkStatus(submitted: number, required: number): {
  key: "complete" | "partial" | "missing";
  label: string;
  color: string;
} {
  if (required <= 0) {
    return { key: "complete", label: "—", color: "hsl(var(--muted-foreground))" };
  }
  if (submitted <= 0) return { key: "missing", label: "لم يسلم", color: "hsl(0, 70%, 55%)" };
  if (submitted >= required) return { key: "complete", label: "كاملة", color: "hsl(142, 70%, 45%)" };
  return { key: "partial", label: "ناقصة", color: "hsl(40, 80%, 55%)" };
}

export function distributionByLevel(rows: GradeRow[], categories: CategoryMeta[]) {
  const buckets = PERFORMANCE_LEVELS.map((l) => ({ ...l, count: 0, students: [] as string[] }));
  rows.forEach((r) => {
    const p = studentPercent(r, categories);
    const lvl = classifyLevel(p);
    const bucket = buckets.find((b) => b.key === lvl.key);
    if (bucket) {
      bucket.count++;
      bucket.students.push(r.student_name);
    }
  });
  return buckets;
}
