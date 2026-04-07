import { createArabicPDF, getArabicTableStyles, finalizePDF } from "@/lib/arabic-pdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// Re-export types and helpers for backward compatibility
export type { ComprehensiveData } from "./pdf-helpers/pdf-types";
export { computeStudentAvg } from "./pdf-helpers/pdf-student-avg";

import { getLevel } from "./pdf-helpers/pdf-constants";
import { computeStudentAvg } from "./pdf-helpers/pdf-student-avg";
import { buildGradeDistributionPage } from "./pdf-helpers/pdf-grade-distribution";
import { buildPeriodProgressionPage } from "./pdf-helpers/pdf-period-progression";
import { buildTopBottomPage } from "./pdf-helpers/pdf-top-bottom";
import { buildAttendanceDistributionPage } from "./pdf-helpers/pdf-attendance-distribution";
import type { ComprehensiveData } from "./pdf-helpers/pdf-types";

export async function buildComprehensivePDF(data: ComprehensiveData, summaryResult: string) {
  const pdfSetup = await createArabicPDF({ orientation: "landscape", reportType: "grades", includeHeader: true });
  const { doc, startY, watermark, advanced } = pdfSetup;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableStyles = getArabicTableStyles(advanced);
  const today = format(new Date(), "yyyy/MM/dd");
  const categories = data.categories || [];

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

  // Overview table
  doc.setFont("Amiri", "bold");
  doc.setFontSize(13);
  doc.text("ملخص عام", pageWidth / 2, curY, { align: "center" });

  const overviewRows = data.classes.map(cls => [
    `${cls.lessonPlans.completed}/${cls.lessonPlans.total}`,
    String(cls.behavior.negative), String(cls.behavior.positive),
    String(cls.attendance.late), String(cls.attendance.absent), String(cls.attendance.present),
    String(cls.studentCount), cls.name,
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

  autoTable(doc, { startY: 20, head: [["النسبة", "لم يُسجل", "متأخر", "غائب", "حاضر", "الطلاب", "الفصل"]], body: attRows, ...tableStyles });

  // Grades per class
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
      if (g.score !== null) { gradesByStudent[g.student_id][g.category_id].sum += Number(g.score); gradesByStudent[g.student_id][g.category_id].count++; }
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

    autoTable(doc, { startY: 20, head: [[...headers].reverse()], body: rows, ...tableStyles, styles: { ...tableStyles.styles, fontSize: 8 } });
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
        startY: 20, head: [[...headers].reverse()], body: rows,
        ...tableStyles, styles: { ...tableStyles.styles, fontSize: 7 },
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

  // Compute student averages for chart pages
  const allStudentAvgs: { name: string; className: string; avg: number; classId: string }[] = [];
  data.classes.forEach(cls => {
    cls.students.forEach(s => {
      const avg = computeStudentAvg(cls, s.id, categories);
      if (avg !== null) allStudentAvgs.push({ name: s.full_name, className: cls.name, avg, classId: cls.id });
    });
  });
  allStudentAvgs.sort((a, b) => b.avg - a.avg);

  // Delegated pages
  buildGradeDistributionPage(doc, data, allStudentAvgs, pageWidth, pageHeight);
  buildPeriodProgressionPage(doc, data, categories, pageWidth, pageHeight);
  buildTopBottomPage(doc, data, allStudentAvgs, categories, tableStyles, pageWidth);
  buildAttendanceDistributionPage(doc, data, tableStyles, pageWidth, pageHeight, 20, pageWidth - 60, 3);

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
}
