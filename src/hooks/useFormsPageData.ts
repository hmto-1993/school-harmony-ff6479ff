import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { registerArabicFont } from "@/lib/arabic-pdf";
import { format } from "date-fns";

export interface ClassOption { id: string; name: string }

export interface StudentRow {
  id: string;
  full_name: string;
  national_id: string | null;
  class_id: string | null;
  parent_phone: string | null;
  className: string;
}

export interface Stats {
  totalForms: number;
  excellentStudents: number;
  sleepCases: number;
  disciplineRate: number;
}

export function useFormsPageData() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [stats, setStats] = useState<Stats>({ totalForms: 0, excellentStudents: 0, sleepCases: 0, disciplineRate: 0 });
  const [generatingReport, setGeneratingReport] = useState(false);
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("all");

  // Load classes + students
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cls } = await supabase.from("classes").select("id, name").order("name");
      setClasses(cls || []);
      const classMap = new Map((cls || []).map(c => [c.id, c.name]));
      const { data: studs } = await supabase
        .from("students").select("id, full_name, national_id, class_id, parent_phone").order("full_name");
      setAllStudents((studs || []).map(s => ({
        ...s,
        className: s.class_id ? classMap.get(s.class_id) || "" : "",
      })));
    })();
  }, [user]);

  // Load stats — all queries run in parallel
  useEffect(() => {
    if (!user) return;
    (async () => {
      // Pre-compute student IDs for class filter
      let studentIds: string[] | null = null;
      if (selectedClassId !== "all") {
        const filteredStudents = allStudents.filter(s => s.class_id === selectedClassId);
        studentIds = filteredStudents.map(s => s.id);
      }

      // Build all queries upfront
      let logsQuery = supabase.from("form_issued_logs").select("id", { count: "exact" });
      if (studentIds && studentIds.length > 0) logsQuery = logsQuery.in("student_id", studentIds);
      else if (studentIds) logsQuery = logsQuery.eq("student_id", "00000000-0000-0000-0000-000000000000");

      let behaviorQuery = supabase.from("behavior_records").select("type, student_id");
      if (selectedClassId !== "all") behaviorQuery = behaviorQuery.eq("class_id", selectedClassId);

      let gradesQuery = supabase.from("grades").select("student_id, score, grade_categories!inner(max_score)").not("score", "is", null);
      if (studentIds && studentIds.length > 0) gradesQuery = gradesQuery.in("student_id", studentIds);

      // Run all 3 in parallel
      const [{ count: formCount }, { data: behaviors }, { data: grades }] = await Promise.all([
        logsQuery,
        behaviorQuery,
        gradesQuery,
      ]);

      const sleepTypes = ["نوم", "sleep", "نائم"];
      const sleepCases = (behaviors || []).filter(b => sleepTypes.some(t => b.type?.toLowerCase().includes(t))).length;
      const negativeTypes = ["سلبي", "negative", "مخالفة", "إخلال"];
      const negative = (behaviors || []).filter(b => negativeTypes.some(t => b.type?.toLowerCase().includes(t))).length;
      const total = (behaviors || []).length;
      const disciplineRate = total > 0 ? Math.round(((total - negative) / total) * 100) : 100;

      const studentAvgs: Record<string, { sum: number; count: number }> = {};
      (grades || []).forEach((g: any) => {
        const pct = (g.score / (g.grade_categories?.max_score || 100)) * 100;
        if (!studentAvgs[g.student_id]) studentAvgs[g.student_id] = { sum: 0, count: 0 };
        studentAvgs[g.student_id].sum += pct;
        studentAvgs[g.student_id].count++;
      });
      const excellent = Object.values(studentAvgs).filter(v => v.count > 0 && (v.sum / v.count) >= 90).length;

      setStats({ totalForms: formCount || 0, excellentStudents: excellent, sleepCases, disciplineRate });
    })();
  }, [user, selectedClassId, allStudents]);

  const filteredStudents = useMemo(() => {
    let result = allStudents;
    if (studentClassFilter !== "all") result = result.filter(s => s.class_id === studentClassFilter);
    if (studentSearch.trim()) {
      const q = studentSearch.trim().toLowerCase();
      result = result.filter(s =>
        s.full_name.toLowerCase().includes(q) || (s.national_id && s.national_id.includes(q))
      );
    }
    return result;
  }, [allStudents, studentClassFilter, studentSearch]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const ids = filteredStudents.map(s => s.id);
    const allSelected = ids.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedStudentIds(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const handleClassReport = useCallback(async () => {
    if (selectedClassId === "all") { toast.error("يرجى اختيار فصل محدد أولاً"); return; }
    setGeneratingReport(true);
    try {
      const className = classes.find(c => c.id === selectedClassId)?.name || "";
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      await registerArabicFont(doc);
      doc.setFont("Amiri");
      const pageW = doc.internal.pageSize.getWidth();
      let y = 20;
      doc.setFontSize(18); doc.setFont("Amiri", "bold"); doc.setTextColor(0, 102, 153);
      doc.text(`تقرير إنجاز الفصل: ${className}`, pageW / 2, y, { align: "center" });
      y += 10;
      doc.setFontSize(10); doc.setFont("Amiri", "normal"); doc.setTextColor(100, 100, 100);
      doc.text(`تاريخ التقرير: ${format(new Date(), "yyyy/MM/dd")}`, pageW / 2, y, { align: "center" });
      y += 15;
      const items = [
        `إجمالي النماذج الصادرة: ${stats.totalForms}`,
        `عدد الطلاب المتميزين (معدل ≥ 90%): ${stats.excellentStudents}`,
        `حالات النوم المرصودة: ${stats.sleepCases}`,
        `نسبة الانضباط العامة: ${stats.disciplineRate}%`,
      ];
      doc.setFontSize(13); doc.setTextColor(30, 41, 59);
      items.forEach(item => { doc.text(`• ${item}`, pageW - 20, y, { align: "right" }); y += 9; });
      y += 5;
      doc.setFontSize(9); doc.setTextColor(150, 150, 150);
      doc.text("ألفا فيزياء — Alpha Physics", pageW / 2, y, { align: "center" });
      const fileName = `تقرير_إنجاز_${className}.pdf`;
      const blob = doc.output("blob");
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        toast.success("تمت المشاركة بنجاح");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success("تم تنزيل التقرير");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") { console.error(err); toast.error("فشل إنشاء التقرير"); }
    } finally { setGeneratingReport(false); }
  }, [selectedClassId, classes, stats]);

  return {
    classes, selectedClassId, setSelectedClassId, stats, generatingReport,
    allStudents, selectedStudentIds, setSelectedStudentIds,
    studentSearch, setStudentSearch, studentClassFilter, setStudentClassFilter,
    filteredStudents, toggleStudent, toggleAll, handleClassReport,
  };
}
