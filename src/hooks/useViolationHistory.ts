import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface ViolationRecord {
  date: string;
  note: string;
  score: number;
}

export interface StudentViolationSummary {
  /** Map: violationType → array of past records */
  byType: Record<string, ViolationRecord[]>;
  /** Total violation count across all types */
  totalCount: number;
}

/**
 * Fetches the full violation history for students in a class
 * by looking at grades where the category is_deduction = true.
 */
export function useViolationHistory(
  classId: string,
  deductionCategoryIds: string[],
  enabled: boolean,
) {
  const [history, setHistory] = useState<Record<string, StudentViolationSummary>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId || !enabled || deductionCategoryIds.length === 0) {
      setHistory({});
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      // Get all students in the class
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", classId);

      if (cancelled || !students?.length) { setLoading(false); return; }

      const studentIds = students.map(s => s.id);

      // Fetch all deduction grades for these students (any date)
      const { data: grades } = await supabase
        .from("grades")
        .select("student_id, category_id, score, date, note")
        .in("student_id", studentIds)
        .in("category_id", deductionCategoryIds)
        .not("score", "is", null)
        .gt("score", 0)
        .order("date", { ascending: true });

      if (cancelled) return;

      const result: Record<string, StudentViolationSummary> = {};

      (grades || []).forEach((g) => {
        if (!result[g.student_id]) {
          result[g.student_id] = { byType: {}, totalCount: 0 };
        }
        const summary = result[g.student_id];
        const noteKey = (g.note || "").trim() || "غير محدد";
        if (!summary.byType[noteKey]) summary.byType[noteKey] = [];
        summary.byType[noteKey].push({
          date: g.date,
          note: noteKey,
          score: Number(g.score),
        });
        summary.totalCount += 1;
      });

      setHistory(result);
      setLoading(false);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, JSON.stringify(deductionCategoryIds), enabled]);

  return { history, loading };
}

/**
 * For a given student, find violation types repeated 3+ times
 * and build an auto-fill referral reason text.
 */
export function buildReferralReason(
  summary: StudentViolationSummary | undefined,
  studentName: string,
): { hasReferral: boolean; repeatedTypes: { type: string; count: number; dates: string[] }[]; reasonText: string } {
  if (!summary) return { hasReferral: false, repeatedTypes: [], reasonText: "" };

  const repeatedTypes: { type: string; count: number; dates: string[] }[] = [];

  Object.entries(summary.byType).forEach(([type, records]) => {
    if (records.length >= 3) {
      repeatedTypes.push({
        type,
        count: records.length,
        dates: records.map(r => r.date),
      });
    }
  });

  if (repeatedTypes.length === 0) {
    return { hasReferral: false, repeatedTypes: [], reasonText: "" };
  }

  const parts = repeatedTypes.map(rt => {
    const datesStr = rt.dates.slice(0, -1).map(d => format(new Date(d), "yyyy/MM/dd")).join(" و ");
    return `نظرا لتكرار الطالب لمخالفة (${rt.type}) للمرة (${rt.count})، حيث تم رصدها سابقا بتاريخ ${datesStr}، ولم يستجب للتنبيهات السابقة، جرى إحالته إليكم لاتخاذ اللازم.`;
  });

  return {
    hasReferral: true,
    repeatedTypes,
    reasonText: parts.join("\n"),
  };
}
