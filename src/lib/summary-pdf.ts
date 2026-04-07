import { createArabicPDF, getArabicTableStyles } from "@/lib/arabic-pdf";
import { format } from "date-fns";
import {
  levelLabels, levelColors, attColors, attLabels, getLevel,
  drawSectionTitle, drawLevelCircles, drawAttendanceCircles,
  drawStackedBars, drawMiniBar, addPageFooter, drawSideBySideTables,
} from "@/lib/summary-pdf-helpers";

// ============ Types ============
interface ClassSummary {
  id: string;
  name: string;
  studentCount: number;
  students: { id: string; full_name: string }[];
  attendance: { present: number; absent: number; late: number; total: number; notRecorded: number };
  grades: any[];
  manualScores: any[];
  topAbsentees: { name: string; count: number }[];
}

interface SummaryPDFData {
  teacherName: string;
  schoolName: string;
  totalStudents: number;
  attendanceRate: number;
  classes: ClassSummary[];
  categories: any[];
}

// ============ Compute ============
function computeStudentAvg(cls: ClassSummary, studentId: string, categories: any[]): number | null {
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

// ============ Main Builder ============
export async function buildSummaryPDF(
  data: SummaryPDFData,
  options: { includeAISummary: boolean; aiSummaryText?: string }
) {
  const { doc, startY, watermark, advanced } = await createArabicPDF({
    orientation: "landscape",
    reportType: "grades",
    includeHeader: true,
  });

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const tableStyles = getArabicTableStyles(advanced);
  const today = format(new Date(), "yyyy/MM/dd");

  // Pre-compute all student averages
  const allStudentAvgs: { name: string; className: string; avg: number; classId: string }[] = [];
  data.classes.forEach(cls => {
    cls.students.forEach(s => {
      const avg = computeStudentAvg(cls, s.id, data.categories);
      if (avg !== null) allStudentAvgs.push({ name: s.full_name, className: cls.name, avg, classId: cls.id });
    });
  });
  allStudentAvgs.sort((a, b) => b.avg - a.avg);

  const classCount = data.classes.length;
  const classesWithGrades = data.classes.filter(cls =>
    cls.students.some(s => computeStudentAvg(cls, s.id, data.categories) !== null)
  ).length;
  const totalPages = 1 + 1 + classesWithGrades + 1 + 1 + classCount;
  let currentPage = 1;

  // ===== PAGE 1: Title + AI Summary + Grade Distribution =====
  doc.setFontSize(16);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(30, 64, 120);
  doc.text("ملخص مستويات الطلاب", pw / 2, startY, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("Amiri", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`${data.teacherName}  |  ${today}  |  ${data.totalStudents} طالب  |  ${classCount} فصل`, pw / 2, startY + 7, { align: "center" });
  doc.setTextColor(0, 0, 0);

  let curY = startY + 14;

  // AI Summary box
  if (options.includeAISummary && options.aiSummaryText) {
    const margin = 18;
    const boxWidth = pw - margin * 2;
    doc.setFillColor(245, 248, 255);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.4);
    doc.setFont("Amiri", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(options.aiSummaryText, boxWidth - 14);
    const boxHeight = lines.length * 4.5 + 14;

    if (curY + boxHeight > ph - 20) {
      doc.addPage("a4", "landscape");
      curY = 15;
    }

    doc.roundedRect(margin, curY, boxWidth, boxHeight, 3, 3, "FD");
    doc.setFontSize(10);
    doc.setFont("Amiri", "bold");
    doc.setTextColor(59, 130, 246);
    doc.text("ملخص ذكي", pw - margin - 6, curY + 6, { align: "right" });
    doc.setTextColor(0, 0, 0);
    doc.setFont("Amiri", "normal");
    doc.setFontSize(8);
    doc.text(lines, pw - margin - 6, curY + 12, { align: "right", maxWidth: boxWidth - 14 });
    curY += boxHeight + 6;
  }

  // Grade Distribution Chart
  const minChartSpace = 80;
  if (curY + minChartSpace > ph - 20) {
    doc.addPage("a4", "landscape");
    curY = 15;
  }
  curY = drawSectionTitle(doc, "توزيع مستويات الدرجات — جميع الفصول", curY, pw);

  const classDistributions = data.classes.map(cls => {
    const counts = [0, 0, 0, 0, 0];
    allStudentAvgs.filter(s => s.classId === cls.id).forEach(s => counts[getLevel(s.avg)]++);
    const total = allStudentAvgs.filter(s => s.classId === cls.id).length;
    return { name: cls.name, values: counts, total };
  });

  const remainingHeight = ph - curY - 40;
  const barsEndY = drawStackedBars(doc, classDistributions, levelColors, levelLabels, curY, pw, remainingHeight);

  const overallCounts = [0, 0, 0, 0, 0];
  allStudentAvgs.forEach(s => overallCounts[getLevel(s.avg)]++);
  const circleY = Math.min(barsEndY + 12, ph - 32);
  doc.setFont("Amiri", "bold");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("الإحصاء العام", pw / 2, circleY - 4, { align: "center" });
  doc.setTextColor(0, 0, 0);
  drawLevelCircles(doc, overallCounts, allStudentAvgs.length, pw / 2, circleY + 6);
  addPageFooter(doc, currentPage, totalPages, pw, ph);

  // ===== PAGE 2: Top 10 / Bottom 10 Grades =====
  currentPage++;
  doc.addPage("a4", "landscape");
  let p2y = drawSectionTitle(doc, "أفضل وأدنى 10 طلاب — الدرجات", 15, pw);

  const top10 = allStudentAvgs.slice(0, 10);
  const bottom10 = allStudentAvgs.slice(-10).reverse();

  drawSideBySideTables(
    doc, tableStyles, pw,
    "⭐ أفضل 10 طلاب", [16, 185, 129],
    [["المعدل %", "الفصل", "الطالب", "#"]],
    top10.map((s, i) => [`${s.avg}%`, s.className, s.name, String(i + 1)]),
    "⚠ أدنى 10 طلاب", [239, 68, 68],
    [["المعدل %", "الفصل", "الطالب", "#"]],
    bottom10.map((s, i) => [`${s.avg}%`, s.className, s.name, String(i + 1)]),
    p2y
  );
  addPageFooter(doc, currentPage, totalPages, pw, ph);

  // ===== PER-CLASS GRADES PAGES =====
  data.classes.forEach(cls => {
    const classAvgs = cls.students
      .map(s => ({ name: s.full_name, avg: computeStudentAvg(cls, s.id, data.categories) }))
      .filter(s => s.avg !== null) as { name: string; avg: number }[];
    classAvgs.sort((a, b) => b.avg - a.avg);
    if (classAvgs.length === 0) return;

    currentPage++;
    doc.addPage("a4", "landscape");
    let cy = drawSectionTitle(doc, `ترتيب الطلاب — ${cls.name}`, 15, pw);

    const classCounts = [0, 0, 0, 0, 0];
    classAvgs.forEach(s => classCounts[getLevel(s.avg)]++);
    cy = drawMiniBar(doc, classCounts, classAvgs.length, levelColors, levelLabels, cy, pw);

    const classTop5 = classAvgs.slice(0, 5);
    const classBottom5 = classAvgs.slice(-5).reverse();

    drawSideBySideTables(
      doc, tableStyles, pw,
      "⭐ أفضل 5", [16, 185, 129],
      [["المعدل %", "الطالب", "#"]],
      classTop5.map((s, i) => [`${s.avg}%`, s.name, String(i + 1)]),
      "⚠ أدنى 5", [239, 68, 68],
      [["المعدل %", "الطالب", "#"]],
      classBottom5.map((s, i) => [`${s.avg}%`, s.name, String(i + 1)]),
      cy
    );
    addPageFooter(doc, currentPage, totalPages, pw, ph);
  });

  // ===== ATTENDANCE CHART PAGE =====
  currentPage++;
  doc.addPage("a4", "landscape");
  let attY = drawSectionTitle(doc, "ملخص الحضور والغياب — جميع الفصول", 15, pw);

  const attItems = data.classes.map(cls => ({
    name: cls.name,
    values: [cls.attendance.present, cls.attendance.absent, cls.attendance.late, cls.attendance.notRecorded],
    total: cls.studentCount,
  }));

  const attRemaining = ph - attY - 40;
  const attEndY = drawStackedBars(doc, attItems, attColors, attLabels, attY, pw, attRemaining);

  const totalPresent = data.classes.reduce((s, c) => s + c.attendance.present, 0);
  const totalAbsent = data.classes.reduce((s, c) => s + c.attendance.absent, 0);
  const totalLate = data.classes.reduce((s, c) => s + c.attendance.late, 0);
  const totalAll = data.totalStudents;

  const attSummY = Math.min(attEndY + 12, ph - 32);
  doc.setFont("Amiri", "bold");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("الإحصاء العام للحضور", pw / 2, attSummY - 4, { align: "center" });
  doc.setTextColor(0, 0, 0);

  const attStats = [
    { label: "حاضر", count: totalPresent, color: attColors[0], pct: totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0 },
    { label: "غائب", count: totalAbsent, color: attColors[1], pct: totalAll > 0 ? Math.round((totalAbsent / totalAll) * 100) : 0 },
    { label: "متأخر", count: totalLate, color: attColors[2], pct: totalAll > 0 ? Math.round((totalLate / totalAll) * 100) : 0 },
  ];
  drawAttendanceCircles(doc, attStats, pw / 2, attSummY + 6);
  addPageFooter(doc, currentPage, totalPages, pw, ph);

  // ===== TOP 10 / BOTTOM 10 ATTENDANCE =====
  currentPage++;
  doc.addPage("a4", "landscape");
  let absY = drawSectionTitle(doc, "أفضل وأكثر الطلاب غياباً", 15, pw);

  const globalAbsentees: { name: string; className: string; count: number }[] = [];
  data.classes.forEach(cls => {
    cls.topAbsentees.forEach(ta => {
      globalAbsentees.push({ name: ta.name, className: cls.name, count: ta.count });
    });
  });
  globalAbsentees.sort((a, b) => b.count - a.count);

  const allStudentAbsences: { name: string; className: string; count: number }[] = [];
  data.classes.forEach(cls => {
    cls.students.forEach(s => {
      const absCount = cls.topAbsentees.find(ta => ta.name === s.full_name)?.count || 0;
      allStudentAbsences.push({ name: s.full_name, className: cls.name, count: absCount });
    });
  });
  allStudentAbsences.sort((a, b) => a.count - b.count);

  drawSideBySideTables(
    doc, tableStyles, pw,
    "⭐ أفضل 10 حضوراً", [16, 185, 129],
    [["الغيابات", "الفصل", "الطالب", "#"]],
    allStudentAbsences.slice(0, 10).map((s, i) => [String(s.count), s.className, s.name, String(i + 1)]),
    "⚠ أكثر 10 غياباً", [239, 68, 68],
    [["الغيابات", "الفصل", "الطالب", "#"]],
    globalAbsentees.slice(0, 10).map((s, i) => [String(s.count), s.className, s.name, String(i + 1)]),
    absY
  );
  addPageFooter(doc, currentPage, totalPages, pw, ph);

  // ===== PER-CLASS ATTENDANCE PAGES =====
  data.classes.forEach(cls => {
    currentPage++;
    doc.addPage("a4", "landscape");
    let cy = drawSectionTitle(doc, `الحضور والغياب — ${cls.name}`, 15, pw);

    const attVals = [cls.attendance.present, cls.attendance.absent, cls.attendance.late];
    cy = drawMiniBar(doc, attVals, cls.studentCount, attColors.slice(0, 3), attLabels.slice(0, 3), cy, pw);

    const studentAbsences = cls.students.map(s => ({
      name: s.full_name,
      count: cls.topAbsentees.find(ta => ta.name === s.full_name)?.count || 0,
    }));
    studentAbsences.sort((a, b) => b.count - a.count);

    const worst5 = studentAbsences.slice(0, 5);
    const best5 = [...studentAbsences].sort((a, b) => a.count - b.count).slice(0, 5);

    drawSideBySideTables(
      doc, tableStyles, pw,
      "⭐ أفضل 5 حضوراً", [16, 185, 129],
      [["الغيابات", "الطالب", "#"]],
      best5.map((s, i) => [String(s.count), s.name, String(i + 1)]),
      "⚠ أكثر 5 غياباً", [239, 68, 68],
      [["الغيابات", "الطالب", "#"]],
      worst5.map((s, i) => [String(s.count), s.name, String(i + 1)]),
      cy
    );
    addPageFooter(doc, currentPage, totalPages, pw, ph);
  });

  return { doc, watermark, advanced };
}
