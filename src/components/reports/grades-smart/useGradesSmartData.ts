import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { CategoryMeta } from "@/hooks/useReportSending";

export function useHomeworkTargets(classId: string, categories: CategoryMeta[]) {
  const { user } = useAuth();
  // homework category candidates: any category whose name contains 'واجب' or group is classwork-like
  const homeworkCategories = categories.filter(
    (c) => c.name.includes("واجب") || c.name.includes("Homework") || c.name.toLowerCase().includes("hw")
  );

  const [targets, setTargets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId || homeworkCategories.length === 0) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("homework_targets")
        .select("category_id, required_count")
        .eq("class_id", classId)
        .in("category_id", homeworkCategories.map((c) => c.id));
      const map: Record<string, number> = {};
      (data || []).forEach((r: any) => { map[r.category_id] = r.required_count; });
      setTargets(map);
      setLoading(false);
    })();
  }, [classId, homeworkCategories.length]);

  const saveTarget = async (categoryId: string, count: number) => {
    if (!user || !classId) return;
    const { error } = await supabase
      .from("homework_targets")
      .upsert(
        { category_id: categoryId, class_id: classId, required_count: count, created_by: user.id },
        { onConflict: "category_id,class_id" }
      );
    if (error) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
      return;
    }
    setTargets((prev) => ({ ...prev, [categoryId]: count }));
    toast({ title: "تم الحفظ", description: "تم تحديث عدد الواجبات المطلوبة" });
  };

  return { homeworkCategories, targets, saveTarget, loading };
}

export interface ExamAbsenceRecord {
  student_id: string;
  category_id: string;
  reason: string;
  notes: string;
}

export function useExamAbsences(classId: string, categories: CategoryMeta[]) {
  const { user } = useAuth();
  const [absences, setAbsences] = useState<Record<string, ExamAbsenceRecord>>({});

  const key = (studentId: string, categoryId: string) => `${studentId}__${categoryId}`;

  useEffect(() => {
    if (!classId || categories.length === 0) return;
    (async () => {
      const catIds = categories.map((c) => c.id);
      const { data: studentsData } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", classId);
      const studentIds = (studentsData || []).map((s) => s.id);
      if (studentIds.length === 0) return;
      const { data } = await supabase
        .from("exam_absences")
        .select("student_id, category_id, reason, notes")
        .in("student_id", studentIds)
        .in("category_id", catIds);
      const map: Record<string, ExamAbsenceRecord> = {};
      (data || []).forEach((r: any) => {
        map[key(r.student_id, r.category_id)] = {
          student_id: r.student_id, category_id: r.category_id,
          reason: r.reason, notes: r.notes || "",
        };
      });
      setAbsences(map);
    })();
  }, [classId, categories.length]);

  const saveAbsence = async (studentId: string, categoryId: string, reason: string, notes: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("exam_absences")
      .upsert(
        { student_id: studentId, category_id: categoryId, reason, notes, recorded_by: user.id },
        { onConflict: "student_id,category_id" }
      );
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    setAbsences((prev) => ({
      ...prev, [key(studentId, categoryId)]: { student_id: studentId, category_id: categoryId, reason, notes },
    }));
  };

  return { absences, saveAbsence, key };
}
