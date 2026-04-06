import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { FileText, ChevronDown, Loader2, Sparkles, FileBarChart } from "lucide-react";
import { createArabicPDF, getArabicTableStyles, finalizePDF } from "@/lib/arabic-pdf";
import { buildSummaryPDF } from "@/lib/summary-pdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { toast } from "sonner";

// Same types as SharedViewPage
interface ClassSummary {
  id: string;
  name: string;
  grade: string;
  section: string;
  studentCount: number;
  students: { id: string; full_name: string }[];
  attendance: { present: number; absent: number; late: number; total: number; notRecorded: number };
  grades: any[];
  manualScores: any[];
  lessonPlans: { total: number; completed: number };
  behavior: { positive: number; negative: number };
  totalAbsences: number;
  topAbsentees: { name: string; count: number }[];
}

interface ComprehensiveData {
  teacherName: string;
  schoolName: string;
  totalStudents: number;
  attendanceRate: number;
  classes: ClassSummary[];
  categories: any[];
  weeklyAttendance: { student_id: string; status: string; class_id: string; date: string }[];
  academicCalendar: { start_date: string; total_weeks: number; semester: string } | null;
}

interface ComprehensiveExportProps {
  classes: { id: string; name: string }[];
}

export default function ComprehensiveExport({ classes }: ComprehensiveExportProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const fetchData = useCallback(async (): Promise<ComprehensiveData | null> => {
    if (!user || classes.length === 0) return null;

    const classIds = classes.map(c => c.id);
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const [
      { data: profile },
      { data: students },
      { data: todayAttendance },
      { data: categories },
      { data: behavior },
      { data: lessonPlans },
      { data: schoolSetting },
      { data: attendanceHistory },
      { data: academicCalendar },
    ] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("user_id", user.id).single(),
      supabase.from("students").select("id, full_name, class_id").in("class_id", classIds).order("full_name"),
      supabase.from("attendance_records").select("student_id, status, class_id").in("class_id", classIds).eq("date", today),
      supabase.from("grade_categories").select("id, name, max_score, category_group, sort_order, class_id"),
      supabase.from("behavior_records").select("student_id, type, class_id, date, note").in("class_id", classIds).gte("date", thirtyDaysAgo),
      supabase.from("lesson_plans").select("class_id, week_number, is_completed, lesson_title, day_index, slot_index").in("class_id", classIds).eq("created_by", user.id),
      supabase.from("site_settings").select("value").eq("id", "school_name").single(),
      supabase.from("attendance_records").select("student_id, status, class_id, date").in("class_id", classIds).order("date", { ascending: false }).limit(5000),
      supabase.from("academic_calendar").select("start_date, total_weeks, semester, academic_year").order("created_at", { ascending: false }).limit(1).single(),
    ]);

    const studentIds = (students || []).map((s: any) => s.id);

    let grades: any[] = [];
    let manualScores: any[] = [];
    if (studentIds.length > 0) {
      const [g, m] = await Promise.all([
        supabase.from("grades").select("student_id, category_id, score, period, date").in("student_id", studentIds).limit(5000),
        supabase.from("manual_category_scores").select("student_id, category_id, score, period").in("student_id", studentIds).limit(5000),
      ]);
      grades = g.data || [];
      manualScores = m.data || [];
    }

    const classSummaries: ClassSummary[] = classes.map((c) => {
      const classStudents = (students || []).filter((s: any) => s.class_id === c.id);
      const classStudentIds = classStudents.map((s: any) => s.id);
      const att = (todayAttendance || []).filter((a: any) => a.class_id === c.id);
      const present = att.filter((a: any) => a.status === "present").length;
      const absent = att.filter((a: any) => a.status === "absent").length;
      const late = att.filter((a: any) => a.status === "late").length;

      const classGrades = grades.filter((g: any) => classStudentIds.includes(g.student_id));
      const classManual = manualScores.filter((m: any) => classStudentIds.includes(m.student_id));

      const classLessons = (lessonPlans || []).filter((l: any) => l.class_id === c.id);
      const classBehavior = (behavior || []).filter((b: any) => b.class_id === c.id);

      const classAttHistory = (attendanceHistory || []).filter((a: any) => a.class_id === c.id);
      const totalAbsences = classAttHistory.filter((a: any) => a.status === "absent").length;

      const absencesByStudent: Record<string, number> = {};
      classAttHistory.filter((a: any) => a.status === "absent").forEach((a: any) => {
        absencesByStudent[a.student_id] = (absencesByStudent[a.student_id] || 0) + 1;
      });
      const topAbsentees = Object.entries(absencesByStudent)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([studentId, count]) => ({
          name: classStudents.find((s: any) => s.id === studentId)?.full_name || "",
          count,
        }));

      return {
        id: c.id,
        name: c.name,
        grade: "",
        section: "",
        studentCount: classStudents.length,
        students: classStudents.map((s: any) => ({ id: s.id, full_name: s.full_name })),
        attendance: { present, absent, late, total: classStudents.length, notRecorded: classStudents.length - att.length },
        grades: classGrades,
        manualScores: classManual,
        lessonPlans: { total: classLessons.length, completed: classLessons.filter((l: any) => l.is_completed).length },
        behavior: { positive: classBehavior.filter((b: any) => b.type === "positive").length, negative: classBehavior.filter((b: any) => b.type === "negative").length },
        totalAbsences,
        topAbsentees,
      };
    });

    const totalStudents = (students || []).length;
    const totalPresent = (todayAttendance || []).filter((a: any) => a.status === "present").length;

    return {
      teacherName: profile?.full_name || "معلم",
      schoolName: schoolSetting?.value || "",
      totalStudents,
      attendanceRate: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0,
      classes: classSummaries,
      categories: categories || [],
      weeklyAttendance: (attendanceHistory || []).map((r: any) => ({
        student_id: r.student_id,
        status: r.status,
        class_id: r.class_id,
        date: r.date,
      })),
      academicCalendar: academicCalendar ? {
        start_date: academicCalendar.start_date,
        total_weeks: academicCalendar.total_weeks,
        semester: academicCalendar.semester,
      } : null,
    };
  }, [user, classes]);

  // ============ Helper functions (same as SharedViewPage) ============
  const computeStudentAvg = (cls: ClassSummary, studentId: string, categories: any[]) => {
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

  const getLevel = (avg: number) => {
    if (avg >= 90) return 0;
    if (avg >= 80) return 1;
    if (avg >= 70) return 2;
    if (avg >= 60) return 3;
    return 4;
  };
  const levelLabels = ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"];
  const levelColors: [number, number, number][] = [
    [16, 185, 129], [59, 130, 246], [251, 191, 36], [249, 115, 22], [239, 68, 68],
  ];

  // ============ Build comprehensive PDF ============
  const buildComprehensivePDF = useCallback(async (data: ComprehensiveData, focus: "comprehensive" | "attendance" | "grades" | "none") => {
    const summaryPromise = focus !== "none"
      ? supabase.functions.invoke("summarize-teacher", {
          body: {
            teacherName: data.teacherName,
            schoolName: data.schoolName,
            classes: data.classes,
            attendanceRate: data.attendanceRate,
            totalStudents: data.totalStudents,
            focus,
          },
        }).then(r => r.data?.summary || "").catch(() => "")
      : Promise.resolve("");

    const [pdfSetup, summaryResult] = await Promise.all([
      createArabicPDF({ orientation: "landscape", reportType: "grades", includeHeader: true }),
      summaryPromise,
    ]);

    const { doc, startY, watermark } = pdfSetup;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const tableStyles = getArabicTableStyles();
    const today = format(new Date(), "yyyy/MM/dd");

    doc.setFontSize(16);
    doc.text(`تقرير شامل: ${data.teacherName}`, pageWidth / 2, startY, { align: "center" });
    doc.setFontSize(10);
    doc.text(today, pageWidth / 2, startY + 7, { align: "center" });

    let curY = startY + 15;

    // AI Summary
    if (summaryResult) {
      doc.setFontSize(12);
      doc.setFont("Amiri", "bold");
      doc.text("✦ ملخص ذكي لأداء المعلم", pageWidth / 2, curY, { align: "center" });
      curY += 6;
      const margin = 14;
      const boxWidth = pageWidth - margin * 2;
      doc.setFillColor(240, 245, 255);
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.3);
      doc.setFont("Amiri", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(summaryResult, boxWidth - 10);
      const boxHeight = lines.length * 5 + 12;
      
      // Check if AI summary fits on current page, if not start a new page
      if (curY + boxHeight > pageHeight - 20) {
        doc.addPage("a4", "landscape");
        curY = 15;
        doc.setFontSize(12);
        doc.setFont("Amiri", "bold");
        doc.text("✦ ملخص ذكي لأداء المعلم (تابع)", pageWidth / 2, curY, { align: "center" });
        curY += 6;
      }
      
      doc.roundedRect(margin, curY - 2, boxWidth, boxHeight, 2, 2, "FD");
      doc.text(lines, pageWidth - margin - 5, curY + 4, { align: "right", maxWidth: boxWidth - 10 });
      curY += boxHeight + 6;
    }

    // Overview
    doc.setFont("Amiri", "bold");
    doc.setFontSize(13);
    doc.text("ملخص عام", pageWidth / 2, curY, { align: "center" });

    const overviewRows = data.classes.map(cls => [
      `${cls.lessonPlans.completed}/${cls.lessonPlans.total}`,
      String(cls.behavior.negative),
      String(cls.behavior.positive),
      String(cls.attendance.late),
      String(cls.attendance.absent),
      String(cls.attendance.present),
      String(cls.studentCount),
      cls.name,
    ]);

    autoTable(doc, {
      startY: curY + 4,
      head: [["خطط الدروس", "سلوك سلبي", "سلوك إيجابي", "متأخر", "غائب", "حاضر", "الطلاب", "الفصل"]],
      body: overviewRows,
      ...tableStyles,
    });

    // Attendance details
    doc.addPage("a4", "landscape");
    doc.setFontSize(13);
    doc.text("تفاصيل الحضور اليوم", pageWidth / 2, 15, { align: "center" });

    const attRows = data.classes.map(cls => {
      const rate = cls.attendance.total > 0 ? Math.round((cls.attendance.present / cls.attendance.total) * 100) : 0;
      return [`${rate}%`, String(cls.attendance.notRecorded), String(cls.attendance.late), String(cls.attendance.absent), String(cls.attendance.present), String(cls.studentCount), cls.name];
    });

    autoTable(doc, {
      startY: 20,
      head: [["النسبة", "لم يُسجل", "متأخر", "غائب", "حاضر", "الطلاب", "الفصل"]],
      body: attRows,
      ...tableStyles,
    });

    // Grades per class
    const categories = data.categories || [];
    data.classes.forEach(cls => {
      doc.addPage("a4", "landscape");
      doc.setFontSize(13);
      doc.text(`درجات: ${cls.name}`, pageWidth / 2, 15, { align: "center" });

      const classCategories = categories.filter((c: any) => c.class_id === cls.id || c.class_id === null)
        .sort((a: any, b: any) => a.sort_order - b.sort_order).slice(0, 8);

      const gradesByStudent: Record<string, Record<string, { sum: number; count: number }>> = {};
      cls.students.forEach(s => { gradesByStudent[s.id] = {}; });
      cls.grades.forEach((g: any) => {
        if (!gradesByStudent[g.student_id]) return;
        if (!gradesByStudent[g.student_id][g.category_id]) gradesByStudent[g.student_id][g.category_id] = { sum: 0, count: 0 };
        if (g.score !== null) {
          gradesByStudent[g.student_id][g.category_id].sum += Number(g.score);
          gradesByStudent[g.student_id][g.category_id].count++;
        }
      });
      cls.manualScores.forEach((m: any) => {
        if (!gradesByStudent[m.student_id]) return;
        gradesByStudent[m.student_id][m.category_id] = { sum: Number(m.score), count: 1 };
      });

      const headers = ["الطالب", ...classCategories.map((c: any) => c.name)];
      const rows = cls.students.map(s => {
        const row = [s.full_name];
        classCategories.forEach((cat: any) => {
          const entry = gradesByStudent[s.id]?.[cat.id];
          row.push(entry && entry.count > 0 ? String(Math.round(entry.sum / entry.count)) : "—");
        });
        return row.reverse();
      });

      autoTable(doc, {
        startY: 20,
        head: [[...headers].reverse()],
        body: rows,
        ...tableStyles,
        styles: { ...tableStyles.styles, fontSize: 8 },
      });
    });

    // Weekly attendance per class
    const cal = data.academicCalendar;
    if (cal) {
      data.classes.forEach(cls => {
        doc.addPage("a4", "landscape");
        doc.setFontSize(13);
        doc.text(`الحضور الأسبوعي: ${cls.name}`, pageWidth / 2, 15, { align: "center" });

        const classRecords = data.weeklyAttendance.filter(r => r.class_id === cls.id);
        const weekAbsences: Record<number, Record<string, number>> = {};
        const weekLates: Record<number, Record<string, number>> = {};
        const studentTotals: Record<string, { absent: number; late: number }> = {};
        cls.students.forEach(s => { studentTotals[s.id] = { absent: 0, late: 0 }; });

        classRecords.forEach(r => {
          const diff = Math.floor((new Date(r.date).getTime() - new Date(cal.start_date).getTime()) / 86400000);
          const wk = Math.floor(diff / 7) + 1;
          if (wk < 1 || wk > cal.total_weeks) return;
          if (r.status === "absent") {
            if (!weekAbsences[wk]) weekAbsences[wk] = {};
            weekAbsences[wk][r.student_id] = (weekAbsences[wk][r.student_id] || 0) + 1;
            if (studentTotals[r.student_id]) studentTotals[r.student_id].absent++;
          }
          if (r.status === "late") {
            if (!weekLates[wk]) weekLates[wk] = {};
            weekLates[wk][r.student_id] = (weekLates[wk][r.student_id] || 0) + 1;
            if (studentTotals[r.student_id]) studentTotals[r.student_id].late++;
          }
        });

        const currentWk = Math.floor((Date.now() - new Date(cal.start_date).getTime()) / 86400000 / 7) + 1;
        const maxWeek = Math.min(cal.total_weeks, Math.max(currentWk, ...Object.keys(weekAbsences).map(Number), ...Object.keys(weekLates).map(Number)));
        const weekNums: number[] = [];
        for (let w = 1; w <= maxWeek; w++) weekNums.push(w);

        const headers = ["الطالب", ...weekNums.map(w => `ع${w}`), "غ", "تأخر"];
        const rows = cls.students.map(s => {
          const row = [s.full_name];
          weekNums.forEach(w => {
            const ab = weekAbsences[w]?.[s.id] || 0;
            const lt = weekLates[w]?.[s.id] || 0;
            if (ab > 0 && lt > 0) row.push(`${ab}غ ${lt}ت`);
            else if (ab > 0) row.push(`${ab}غ`);
            else if (lt > 0) row.push(`${lt}ت`);
            else row.push("✓");
          });
          row.push(String(studentTotals[s.id]?.absent || 0));
          row.push(String(studentTotals[s.id]?.late || 0));
          return row.reverse();
        });

        autoTable(doc, {
          startY: 20,
          head: [[...headers].reverse()],
          body: rows,
          ...tableStyles,
          styles: { ...tableStyles.styles, fontSize: 7 },
          didParseCell: (hookData: any) => {
            if (hookData.section === "body") {
              const text = hookData.cell.text?.[0] || "";
              if (text.includes("غ")) hookData.cell.styles.textColor = [229, 57, 53];
              else if (text.includes("ت")) hookData.cell.styles.textColor = [251, 192, 45];
              else if (text === "✓") hookData.cell.styles.textColor = [76, 175, 80];
            }
          },
        });
      });
    }

    // Grade distribution chart
    const allStudentAvgs: { name: string; className: string; avg: number; classId: string }[] = [];
    data.classes.forEach(cls => {
      cls.students.forEach(s => {
        const avg = computeStudentAvg(cls, s.id, categories);
        if (avg !== null) allStudentAvgs.push({ name: s.full_name, className: cls.name, avg, classId: cls.id });
      });
    });
    allStudentAvgs.sort((a, b) => b.avg - a.avg);

    // Grade distribution page
    doc.addPage("a4", "landscape");
    doc.setFontSize(14);
    doc.setFont("Amiri", "bold");
    doc.text("📊 توزيع مستويات الدرجات — جميع الفصول", pageWidth / 2, 15, { align: "center" });

    const legendY = 22;
    const legendStartX = pageWidth / 2 + (levelLabels.length * 25) / 2;
    levelLabels.forEach((label, i) => {
      const lx = legendStartX - i * 32;
      doc.setFillColor(...levelColors[i]);
      doc.rect(lx, legendY - 3, 5, 5, "F");
      doc.setFont("Amiri", "normal");
      doc.setFontSize(8);
      doc.text(label, lx - 1, legendY + 1, { align: "right" });
    });

    const classDistributions = data.classes.map(cls => {
      const counts = [0, 0, 0, 0, 0];
      allStudentAvgs.filter(s => s.classId === cls.id).forEach(s => counts[getLevel(s.avg)]++);
      return { name: cls.name, counts, total: allStudentAvgs.filter(s => s.classId === cls.id).length };
    });

    const chartX = 20;
    const chartY = 30;
    const chartW = pageWidth - 60;
    const barH = Math.min(12, (pageHeight - chartY - 30) / data.classes.length - 2);
    const barGap = 3;

    classDistributions.forEach((cd, idx) => {
      const by = chartY + idx * (barH + barGap);
      doc.setFont("Amiri", "bold");
      doc.setFontSize(9);
      doc.text(cd.name, pageWidth - 15, by + barH / 2 + 1.5, { align: "right" });

      let cx = chartX;
      cd.counts.forEach((count, li) => {
        if (count === 0) return;
        const bw = cd.total > 0 ? (count / cd.total) * chartW : 0;
        doc.setFillColor(...levelColors[li]);
        doc.roundedRect(cx, by, bw, barH, 1, 1, "F");
        if (bw > 10) {
          doc.setFontSize(7);
          doc.setFont("Amiri", "bold");
          doc.setTextColor(255, 255, 255);
          doc.text(String(count), cx + bw / 2, by + barH / 2 + 1.5, { align: "center" });
          doc.setTextColor(0, 0, 0);
        }
        cx += bw;
      });

      doc.setFont("Amiri", "normal");
      doc.setFontSize(7);
      doc.text(cd.total > 0 ? `(${cd.total} طالب)` : "", chartX - 2, by + barH / 2 + 1.5, { align: "right" });
    });

    // Overall circles
    const overallCounts = [0, 0, 0, 0, 0];
    allStudentAvgs.forEach(s => overallCounts[getLevel(s.avg)]++);

    const summaryY = chartY + classDistributions.length * (barH + barGap) + 10;
    doc.setFont("Amiri", "bold");
    doc.setFontSize(11);
    doc.text("الإحصاء العام", pageWidth / 2, summaryY, { align: "center" });

    const circleR = 8;
    const circleGap = 38;
    const circlesStartX = pageWidth / 2 + ((levelLabels.length - 1) * circleGap) / 2;
    levelLabels.forEach((label, i) => {
      const cx = circlesStartX - i * circleGap;
      const cy = summaryY + 15;
      const pct = allStudentAvgs.length > 0 ? Math.round((overallCounts[i] / allStudentAvgs.length) * 100) : 0;
      doc.setFillColor(245, 245, 245);
      doc.circle(cx, cy, circleR, "F");
      doc.setFillColor(...levelColors[i]);
      doc.circle(cx, cy, circleR - 1.5, "F");
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, cy, circleR - 3.5, "F");
      doc.setFontSize(8);
      doc.setFont("Amiri", "bold");
      doc.setTextColor(...levelColors[i]);
      doc.text(`${pct}%`, cx, cy + 1.5, { align: "center" });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.setFont("Amiri", "normal");
      doc.text(label, cx, cy + circleR + 5, { align: "center" });
      doc.text(`${overallCounts[i]}`, cx, cy + circleR + 9, { align: "center" });
    });

    // Period progression line chart
    {
      doc.addPage("a4", "landscape");
      doc.setFontSize(14);
      doc.setFont("Amiri", "bold");
      doc.text("📈 تطور مستوى الفصول خلال الفترات الدراسية", pageWidth / 2, 15, { align: "center" });

      const periods = [1, 2];
      const periodLabels = ["الفترة الأولى", "الفترة الثانية"];
      const classLineColors: [number, number, number][] = [
        [59, 130, 246], [16, 185, 129], [239, 68, 68], [251, 191, 36],
        [139, 92, 246], [249, 115, 22], [6, 182, 212], [236, 72, 153],
      ];

      const classPerPeriod: { name: string; color: [number, number, number]; avgs: (number | null)[] }[] = [];

      data.classes.forEach((cls, ci) => {
        const color = classLineColors[ci % classLineColors.length];
        const avgs: (number | null)[] = [];
        const classCategories = categories.filter((c: any) => c.class_id === cls.id || c.class_id === null);

        periods.forEach(period => {
          let totalPct = 0, studentCount = 0;
          cls.students.forEach(s => {
            const catScores: Record<string, { sum: number; count: number; max: number }> = {};
            cls.grades.filter((g: any) => g.student_id === s.id && g.period === period).forEach((g: any) => {
              const cat = classCategories.find((c: any) => c.id === g.category_id);
              if (!cat || g.score === null) return;
              if (!catScores[g.category_id]) catScores[g.category_id] = { sum: 0, count: 0, max: cat.max_score };
              catScores[g.category_id].sum += Number(g.score);
              catScores[g.category_id].count++;
            });
            cls.manualScores.filter((m: any) => m.student_id === s.id && m.period === period).forEach((m: any) => {
              const cat = classCategories.find((c: any) => c.id === m.category_id);
              if (!cat) return;
              catScores[m.category_id] = { sum: Number(m.score), count: 1, max: cat.max_score };
            });
            let sTotal = 0, sMax = 0;
            Object.values(catScores).forEach(v => {
              if (v.count > 0) { sTotal += (v.sum / v.count); sMax += v.max; }
            });
            if (sMax > 0) {
              totalPct += Math.round((sTotal / sMax) * 100);
              studentCount++;
            }
          });
          avgs.push(studentCount > 0 ? Math.round(totalPct / studentCount) : null);
        });
        classPerPeriod.push({ name: cls.name, color, avgs });
      });

      const lcMarginL = 30;
      const lcMarginR = 50;
      const lcTop = 30;
      const lcBottom = pageHeight - 35;
      const lcWidth = pageWidth - lcMarginL - lcMarginR;
      const lcHeight = lcBottom - lcTop;

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      for (let pct = 0; pct <= 100; pct += 20) {
        const y = lcBottom - (pct / 100) * lcHeight;
        doc.line(lcMarginL, y, lcMarginL + lcWidth, y);
        doc.setFont("Amiri", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`${pct}%`, lcMarginL - 3, y + 1.5, { align: "right" });
      }
      doc.setTextColor(0, 0, 0);

      const xPoints = periods.map((_, i) => lcMarginL + (i / (periods.length - 1 || 1)) * lcWidth);
      periodLabels.forEach((label, i) => {
        doc.setFont("Amiri", "bold");
        doc.setFontSize(9);
        doc.text(label, xPoints[i], lcBottom + 8, { align: "center" });
      });

      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.5);
      doc.line(lcMarginL, lcTop, lcMarginL, lcBottom);
      doc.line(lcMarginL, lcBottom, lcMarginL + lcWidth, lcBottom);

      classPerPeriod.forEach((cls) => {
        doc.setDrawColor(...cls.color);
        doc.setLineWidth(1.2);
        const points: { x: number; y: number }[] = [];
        cls.avgs.forEach((avg, i) => {
          if (avg === null) return;
          points.push({ x: xPoints[i], y: lcBottom - (avg / 100) * lcHeight });
        });
        for (let i = 1; i < points.length; i++) {
          doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
        }
        points.forEach((pt, i) => {
          doc.setFillColor(255, 255, 255);
          doc.circle(pt.x, pt.y, 2.5, "FD");
          doc.setFillColor(...cls.color);
          doc.circle(pt.x, pt.y, 1.8, "F");
          doc.setFontSize(7);
          doc.setFont("Amiri", "bold");
          doc.setTextColor(...cls.color);
          doc.text(`${cls.avgs[i] ?? ""}%`, pt.x, pt.y - 4, { align: "center" });
        });
      });
      doc.setTextColor(0, 0, 0);

      const legX = lcMarginL + lcWidth + 8;
      let legY = lcTop + 5;
      doc.setFont("Amiri", "bold");
      doc.setFontSize(8);
      doc.text("الفصول:", legX, legY, { align: "right" });
      legY += 6;
      classPerPeriod.forEach((cls) => {
        doc.setFillColor(...cls.color);
        doc.circle(legX - 2, legY - 1.5, 2, "F");
        doc.setFont("Amiri", "normal");
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        doc.text(cls.name, legX - 6, legY, { align: "right" });
        legY += 6;
      });

      // Level zone backgrounds - use light colors directly instead of GState opacity
      const zones = [
        { min: 90, max: 100, color: [230, 247, 240] as [number, number, number], label: "ممتاز", labelColor: [16, 185, 129] as [number, number, number] },
        { min: 80, max: 90, color: [235, 242, 254] as [number, number, number], label: "جيد جداً", labelColor: [59, 130, 246] as [number, number, number] },
        { min: 70, max: 80, color: [254, 249, 232] as [number, number, number], label: "جيد", labelColor: [251, 191, 36] as [number, number, number] },
        { min: 60, max: 70, color: [254, 243, 232] as [number, number, number], label: "مقبول", labelColor: [249, 115, 22] as [number, number, number] },
        { min: 0, max: 60, color: [254, 236, 236] as [number, number, number], label: "ضعيف", labelColor: [239, 68, 68] as [number, number, number] },
      ];
      zones.forEach(zone => {
        const y1 = lcBottom - (zone.max / 100) * lcHeight;
        const y2 = lcBottom - (zone.min / 100) * lcHeight;
        doc.setFillColor(...zone.color);
        doc.rect(lcMarginL, y1, lcWidth, y2 - y1, "F");
      });
      zones.forEach(zone => {
        const midY = lcBottom - ((zone.min + zone.max) / 2 / 100) * lcHeight;
        doc.setFont("Amiri", "normal");
        doc.setFontSize(6);
        doc.setTextColor(...zone.labelColor);
        doc.text(zone.label, lcMarginL + lcWidth + 2, midY + 1, { align: "left" });
      });
      doc.setTextColor(0, 0, 0);
    }

    // Top 10 / Bottom 10
    doc.addPage("a4", "landscape");
    doc.setFontSize(14);
    doc.setFont("Amiri", "bold");
    doc.text("⭐ أفضل وأدنى 10 طلاب — الدرجات", pageWidth / 2, 15, { align: "center" });

    const top10 = allStudentAvgs.slice(0, 10);
    const bottom10 = allStudentAvgs.slice(-10).reverse();

    doc.setFontSize(11);
    doc.text("⭐ أفضل 10 طلاب", pageWidth - 14, 22, { align: "right" });
    autoTable(doc, {
      startY: 26,
      head: [["المعدل %", "الفصل", "الطالب", "#"]],
      body: top10.map((s, i) => [`${s.avg}%`, s.className, s.name, String(i + 1)]),
      ...tableStyles,
      headStyles: { ...tableStyles.headStyles, fillColor: [16, 185, 129] as [number, number, number] },
      margin: { left: pageWidth / 2 + 5 },
    });

    doc.setFontSize(11);
    doc.text("⚠ أدنى 10 طلاب", pageWidth / 2 - 10, 22, { align: "right" });
    autoTable(doc, {
      startY: 26,
      head: [["المعدل %", "الفصل", "الطالب", "#"]],
      body: bottom10.map((s, i) => [`${s.avg}%`, s.className, s.name, String(i + 1)]),
      ...tableStyles,
      headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
      margin: { right: pageWidth / 2 + 5 },
    });

    // Per-class top/bottom 5
    data.classes.forEach(cls => {
      const classAvgs = cls.students
        .map(s => ({ name: s.full_name, avg: computeStudentAvg(cls, s.id, categories) }))
        .filter(s => s.avg !== null) as { name: string; avg: number }[];
      classAvgs.sort((a, b) => b.avg - a.avg);
      if (classAvgs.length === 0) return;

      doc.addPage("a4", "landscape");
      doc.setFontSize(13);
      doc.setFont("Amiri", "bold");
      doc.text(`ترتيب الطلاب: ${cls.name}`, pageWidth / 2, 15, { align: "center" });

      const classCounts = [0, 0, 0, 0, 0];
      classAvgs.forEach(s => classCounts[getLevel(s.avg)]++);
      let mbx = 30;
      const mbw = pageWidth - 60;
      classCounts.forEach((count, li) => {
        if (count === 0) return;
        const bw = (count / classAvgs.length) * mbw;
        doc.setFillColor(...levelColors[li]);
        doc.roundedRect(mbx, 20, bw, 6, 1, 1, "F");
        if (bw > 12) {
          doc.setFontSize(6);
          doc.setFont("Amiri", "bold");
          doc.setTextColor(255, 255, 255);
          doc.text(`${levelLabels[li]} (${count})`, mbx + bw / 2, 24, { align: "center" });
          doc.setTextColor(0, 0, 0);
        }
        mbx += bw;
      });

      const classTop5 = classAvgs.slice(0, 5);
      const classBottom5 = classAvgs.slice(-5).reverse();

      doc.setFontSize(11);
      doc.text("⭐ أفضل 5", pageWidth - 14, 32, { align: "right" });
      autoTable(doc, {
        startY: 36,
        head: [["المعدل %", "الطالب", "#"]],
        body: classTop5.map((s, i) => [`${s.avg}%`, s.name, String(i + 1)]),
        ...tableStyles,
        headStyles: { ...tableStyles.headStyles, fillColor: [16, 185, 129] as [number, number, number] },
        margin: { left: pageWidth / 2 + 5 },
      });

      doc.setFontSize(11);
      doc.text("⚠ أدنى 5", pageWidth / 2 - 10, 32, { align: "right" });
      autoTable(doc, {
        startY: 36,
        head: [["المعدل %", "الطالب", "#"]],
        body: classBottom5.map((s, i) => [`${s.avg}%`, s.name, String(i + 1)]),
        ...tableStyles,
        headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
        margin: { right: pageWidth / 2 + 5 },
      });
    });

    // Attendance distribution
    doc.addPage("a4", "landscape");
    doc.setFontSize(14);
    doc.setFont("Amiri", "bold");
    doc.text("📊 ملخص الحضور والغياب — جميع الفصول", pageWidth / 2, 15, { align: "center" });

    const attColors: [number, number, number][] = [
      [16, 185, 129], [239, 68, 68], [251, 191, 36], [156, 163, 175],
    ];
    const attLabels = ["حاضر", "غائب", "متأخر", "لم يُسجل"];

    const attLegY = 22;
    const attLegX = pageWidth / 2 + 50;
    attLabels.forEach((label, i) => {
      const lx = attLegX - i * 30;
      doc.setFillColor(...attColors[i]);
      doc.rect(lx, attLegY - 3, 5, 5, "F");
      doc.setFont("Amiri", "normal");
      doc.setFontSize(8);
      doc.text(label, lx - 1, attLegY + 1, { align: "right" });
    });

    const attChartY = 30;
    const attBarH = Math.min(12, (pageHeight - attChartY - 40) / data.classes.length - 2);

    data.classes.forEach((cls, idx) => {
      const by = attChartY + idx * (attBarH + barGap);
      doc.setFont("Amiri", "bold");
      doc.setFontSize(9);
      doc.text(cls.name, pageWidth - 15, by + attBarH / 2 + 1.5, { align: "right" });

      const vals = [cls.attendance.present, cls.attendance.absent, cls.attendance.late, cls.attendance.notRecorded];
      const total = cls.studentCount;
      let cx = chartX;
      vals.forEach((count, li) => {
        if (count === 0) return;
        const bw = total > 0 ? (count / total) * chartW : 0;
        doc.setFillColor(...attColors[li]);
        doc.roundedRect(cx, by, bw, attBarH, 1, 1, "F");
        if (bw > 10) {
          doc.setFontSize(7);
          doc.setFont("Amiri", "bold");
          doc.setTextColor(255, 255, 255);
          doc.text(String(count), cx + bw / 2, by + attBarH / 2 + 1.5, { align: "center" });
          doc.setTextColor(0, 0, 0);
        }
        cx += bw;
      });

      const rate = total > 0 ? Math.round((cls.attendance.present / total) * 100) : 0;
      doc.setFont("Amiri", "normal");
      doc.setFontSize(7);
      doc.text(`${rate}%`, chartX - 2, by + attBarH / 2 + 1.5, { align: "right" });
    });

    // Overall attendance stats circles
    const totalPresent = data.classes.reduce((s, c) => s + c.attendance.present, 0);
    const totalAbsent = data.classes.reduce((s, c) => s + c.attendance.absent, 0);
    const totalLate = data.classes.reduce((s, c) => s + c.attendance.late, 0);
    const totalAll = data.totalStudents;

    const attSummY = attChartY + data.classes.length * (attBarH + barGap) + 10;
    doc.setFont("Amiri", "bold");
    doc.setFontSize(11);
    doc.text("الإحصاء العام للحضور", pageWidth / 2, attSummY, { align: "center" });

    const attStats = [
      { label: "حاضر", count: totalPresent, color: attColors[0], pct: totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0 },
      { label: "غائب", count: totalAbsent, color: attColors[1], pct: totalAll > 0 ? Math.round((totalAbsent / totalAll) * 100) : 0 },
      { label: "متأخر", count: totalLate, color: attColors[2], pct: totalAll > 0 ? Math.round((totalLate / totalAll) * 100) : 0 },
    ];

    const attCircleGap = 38;
    const attCirclesX = pageWidth / 2 + ((attStats.length - 1) * attCircleGap) / 2;
    attStats.forEach((st, i) => {
      const acx = attCirclesX - i * attCircleGap;
      const acy = attSummY + 15;
      doc.setFillColor(245, 245, 245);
      doc.circle(acx, acy, circleR, "F");
      doc.setFillColor(...st.color);
      doc.circle(acx, acy, circleR - 1.5, "F");
      doc.setFillColor(255, 255, 255);
      doc.circle(acx, acy, circleR - 3.5, "F");
      doc.setFontSize(8);
      doc.setFont("Amiri", "bold");
      doc.setTextColor(...st.color);
      doc.text(`${st.pct}%`, acx, acy + 1.5, { align: "center" });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.setFont("Amiri", "normal");
      doc.text(st.label, acx, acy + circleR + 5, { align: "center" });
      doc.text(`${st.count}`, acx, acy + circleR + 9, { align: "center" });
    });

    // Top absentees - global
    doc.addPage("a4", "landscape");
    doc.setFontSize(14);
    doc.setFont("Amiri", "bold");
    doc.text("⚠ أكثر الطلاب غياباً", pageWidth / 2, 15, { align: "center" });

    const globalAbsentees: { name: string; className: string; count: number }[] = [];
    data.classes.forEach(cls => {
      cls.topAbsentees.forEach(ta => {
        globalAbsentees.push({ name: ta.name, className: cls.name, count: ta.count });
      });
    });
    globalAbsentees.sort((a, b) => b.count - a.count);

    doc.setFontSize(11);
    doc.setFont("Amiri", "bold");
    doc.text("أكثر 10 طلاب غياباً — جميع الفصول", pageWidth / 2, 22, { align: "center" });
    autoTable(doc, {
      startY: 26,
      head: [["عدد الغيابات", "الفصل", "الطالب", "#"]],
      body: globalAbsentees.slice(0, 10).map((s, i) => [String(s.count), s.className, s.name, String(i + 1)]),
      ...tableStyles,
      headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
    });

    // Per-class top absentees
    data.classes.forEach(cls => {
      if (cls.topAbsentees.length === 0) return;
      doc.addPage("a4", "landscape");
      doc.setFontSize(13);
      doc.setFont("Amiri", "bold");
      doc.text(`أكثر الطلاب غياباً: ${cls.name}`, pageWidth / 2, 15, { align: "center" });

      const attMiniY = 20;
      const attMiniW = pageWidth - 60;
      let amx = 30;
      const attVals = [cls.attendance.present, cls.attendance.absent, cls.attendance.late];
      const attTotal = cls.studentCount;
      attVals.forEach((count, li) => {
        if (count === 0) return;
        const bw = attTotal > 0 ? (count / attTotal) * attMiniW : 0;
        doc.setFillColor(...attColors[li]);
        doc.roundedRect(amx, attMiniY, bw, 6, 1, 1, "F");
        if (bw > 12) {
          doc.setFontSize(6);
          doc.setFont("Amiri", "bold");
          doc.setTextColor(255, 255, 255);
          doc.text(`${attLabels[li]} (${count})`, amx + bw / 2, attMiniY + 4, { align: "center" });
          doc.setTextColor(0, 0, 0);
        }
        amx += bw;
      });

      autoTable(doc, {
        startY: 30,
        head: [["عدد الغيابات", "الطالب", "#"]],
        body: cls.topAbsentees.slice(0, 5).map((s, i) => [String(s.count), s.name, String(i + 1)]),
        ...tableStyles,
        headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
      });
    });

    // Lessons
    doc.addPage("a4", "landscape");
    doc.setFontSize(13);
    doc.setFont("Amiri", "bold");
    doc.text("خطط الدروس", pageWidth / 2, 15, { align: "center" });

    autoTable(doc, {
      startY: 20,
      head: [["نسبة الإنجاز", "المنجز", "الإجمالي", "الفصل"]],
      body: data.classes.map(cls => {
        const pct = cls.lessonPlans.total > 0 ? Math.round((cls.lessonPlans.completed / cls.lessonPlans.total) * 100) : 0;
        return [`${pct}%`, String(cls.lessonPlans.completed), String(cls.lessonPlans.total), cls.name];
      }),
      ...tableStyles,
    });

    return { doc, watermark };
  }, [computeStudentAvg, getLevel, levelColors, levelLabels]);

  // ============ Export handlers ============
  const handleExportComprehensive = useCallback(async (focus: "comprehensive" | "attendance" | "grades" | "none") => {
    setLoading(true);
    setShowMenu(false);
    try {
      const data = await fetchData();
      if (!data) { toast.error("لا توجد بيانات للتصدير"); setLoading(false); return; }
      const { doc, watermark } = await buildComprehensivePDF(data, focus);
      finalizePDF(doc, `تقرير-شامل_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark);
      toast.success("تم تصدير التقرير الشامل بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء التصدير");
    }
    setLoading(false);
  }, [fetchData, buildComprehensivePDF]);

  const handleExportSummary = useCallback(async (withAI: boolean) => {
    setLoading(true);
    setShowMenu(false);
    try {
      const data = await fetchData();
      if (!data) { toast.error("لا توجد بيانات للتصدير"); setLoading(false); return; }

      let aiText = "";
      if (withAI) {
        const { data: aiRes } = await supabase.functions.invoke("summarize-teacher", {
          body: {
            teacherName: data.teacherName,
            schoolName: data.schoolName,
            classes: data.classes,
            attendanceRate: data.attendanceRate,
            totalStudents: data.totalStudents,
            focus: "comprehensive",
          },
        });
        aiText = aiRes?.summary || "";
      }

      const { doc, watermark } = await buildSummaryPDF(data, { includeAISummary: withAI, aiSummaryText: aiText });
      finalizePDF(doc, `ملخص-مستويات_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark);
      toast.success("تم تصدير الملخص بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء التصدير");
    }
    setLoading(false);
  }, [fetchData]);

  if (classes.length === 0) return null;

  return (
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
      <CardContent className="py-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <FileBarChart className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">التقارير الشاملة</h3>
            <p className="text-sm text-muted-foreground mt-1">تصدير تقارير شاملة تتضمن جميع الفصول والدرجات والحضور والسلوك وخطط الدروس</p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            {/* Comprehensive PDF */}
            <div className="relative">
              <div className="flex">
                <Button
                  onClick={() => handleExportComprehensive("comprehensive")}
                  disabled={loading}
                  className="gap-2 rounded-l-none"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {loading ? "جارٍ التصدير..." : "تقرير شامل PDF"}
                </Button>
                <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
                  <DropdownMenuTrigger asChild>
                    <Button disabled={loading} className="rounded-r-none border-r border-primary-foreground/20 px-2">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">التقرير الشامل + ملخص ذكي</DropdownMenuLabel>
                    {([
                      { key: "comprehensive" as const, label: "📊 شامل", desc: "ملخص ذكي شامل" },
                      { key: "attendance" as const, label: "📋 التركيز على الحضور", desc: "" },
                      { key: "grades" as const, label: "📝 التركيز على الدرجات", desc: "" },
                      { key: "none" as const, label: "⏭️ بدون ملخص ذكي", desc: "" },
                    ]).map(opt => (
                      <DropdownMenuItem key={opt.key} onClick={() => handleExportComprehensive(opt.key)}>
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">ملخص مختصر</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleExportSummary(true)}>
                      <Sparkles className="h-4 w-4 ml-2 text-primary" />
                      ملخص مختصر + ذكي
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportSummary(false)}>
                      📋 ملخص مختصر بدون ذكي
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
