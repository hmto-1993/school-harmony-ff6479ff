import { createArabicPDF, getArabicTableStyles, finalizePDF, finalizePDFAsBlob } from "@/lib/arabic-pdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type jsPDF from "jspdf";

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

// ============ Constants ============
const levelLabels = ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"];
const levelColors: [number, number, number][] = [
  [16, 185, 129], [59, 130, 246], [251, 191, 36], [249, 115, 22], [239, 68, 68],
];
const attColors: [number, number, number][] = [
  [16, 185, 129], [239, 68, 68], [251, 191, 36], [156, 163, 175],
];
const attLabels = ["حاضر", "غائب", "متأخر", "لم يُسجل"];

const getLevel = (avg: number) => {
  if (avg >= 90) return 0;
  if (avg >= 80) return 1;
  if (avg >= 70) return 2;
  if (avg >= 60) return 3;
  return 4;
};

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

// ============ Draw Helpers ============
function drawSectionTitle(doc: jsPDF, title: string, y: number, pw: number) {
  doc.setFontSize(13);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(30, 64, 120);
  doc.text(title, pw / 2, y, { align: "center" });
  // Decorative line
  const lineW = 60;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(pw / 2 - lineW, y + 3, pw / 2 + lineW, y + 3);
  doc.setTextColor(0, 0, 0);
  return y + 10;
}

function drawSubTitle(doc: jsPDF, title: string, x: number, y: number, color: [number, number, number]) {
  doc.setFontSize(10);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(...color);
  doc.text(title, x, y, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

function drawLevelCircles(doc: jsPDF, counts: number[], total: number, centerX: number, y: number) {
  const circleR = 9;
  const gap = 40;
  const startX = centerX + ((levelLabels.length - 1) * gap) / 2;
  levelLabels.forEach((label, i) => {
    const cx = startX - i * gap;
    const cy = y;
    const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
    // Outer shadow
    doc.setFillColor(230, 230, 230);
    doc.circle(cx, cy, circleR + 0.5, "F");
    // Color ring
    doc.setFillColor(...levelColors[i]);
    doc.circle(cx, cy, circleR, "F");
    // Inner white
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, circleR - 2.5, "F");
    // Percentage
    doc.setFontSize(9);
    doc.setFont("Amiri", "bold");
    doc.setTextColor(...levelColors[i]);
    doc.text(`${pct}%`, cx, cy + 2, { align: "center" });
    doc.setTextColor(80, 80, 80);
    // Label + count
    doc.setFontSize(7);
    doc.setFont("Amiri", "bold");
    doc.text(label, cx, cy + circleR + 5, { align: "center" });
    doc.setFont("Amiri", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`(${counts[i]})`, cx, cy + circleR + 9, { align: "center" });
    doc.setTextColor(0, 0, 0);
  });
}

function drawAttendanceCircles(doc: jsPDF, stats: { label: string; count: number; color: [number, number, number]; pct: number }[], centerX: number, y: number) {
  const circleR = 9;
  const gap = 40;
  const startX = centerX + ((stats.length - 1) * gap) / 2;
  stats.forEach((st, i) => {
    const cx = startX - i * gap;
    const cy = y;
    doc.setFillColor(230, 230, 230);
    doc.circle(cx, cy, circleR + 0.5, "F");
    doc.setFillColor(...st.color);
    doc.circle(cx, cy, circleR, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, circleR - 2.5, "F");
    doc.setFontSize(9);
    doc.setFont("Amiri", "bold");
    doc.setTextColor(...st.color);
    doc.text(`${st.pct}%`, cx, cy + 2, { align: "center" });
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(7);
    doc.setFont("Amiri", "bold");
    doc.text(st.label, cx, cy + circleR + 5, { align: "center" });
    doc.setFont("Amiri", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`(${st.count})`, cx, cy + circleR + 9, { align: "center" });
    doc.setTextColor(0, 0, 0);
  });
}

function drawStackedBars(
  doc: jsPDF, items: { name: string; values: number[]; total: number }[],
  colors: [number, number, number][], labels: string[],
  startY: number, pageWidth: number, maxHeight: number
) {
  const chartX = 25;
  const chartW = pageWidth - 70;
  const barH = Math.min(14, Math.max(8, (maxHeight - 10) / items.length - 3));
  const barGap = 4;

  // Legend - centered
  const legY = startY;
  const totalLegW = labels.length * 35;
  const legStartX = pageWidth / 2 + totalLegW / 2;
  labels.forEach((label, i) => {
    const lx = legStartX - i * 35;
    doc.setFillColor(...colors[i]);
    doc.roundedRect(lx, legY - 3, 6, 6, 1, 1, "F");
    doc.setFont("Amiri", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(label, lx - 2, legY + 1.5, { align: "right" });
  });
  doc.setTextColor(0, 0, 0);

  const barsStartY = startY + 10;
  items.forEach((item, idx) => {
    const by = barsStartY + idx * (barH + barGap);
    // Class name
    doc.setFont("Amiri", "bold");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(item.name, pageWidth - 18, by + barH / 2 + 1.5, { align: "right" });
    doc.setTextColor(0, 0, 0);

    // Background track
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(chartX, by, chartW, barH, 2, 2, "F");

    // Stacked segments
    let cx = chartX;
    item.values.forEach((count, li) => {
      if (count === 0) return;
      const bw = item.total > 0 ? (count / item.total) * chartW : 0;
      doc.setFillColor(...colors[li]);
      doc.roundedRect(cx, by, bw, barH, 1.5, 1.5, "F");
      if (bw > 14) {
        doc.setFontSize(7);
        doc.setFont("Amiri", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(String(count), cx + bw / 2, by + barH / 2 + 1.5, { align: "center" });
        doc.setTextColor(0, 0, 0);
      }
      cx += bw;
    });

    // Total on the left
    doc.setFontSize(7);
    doc.setFont("Amiri", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(String(item.total), chartX - 3, by + barH / 2 + 1.5, { align: "right" });
    doc.setTextColor(0, 0, 0);
  });

  return barsStartY + items.length * (barH + barGap);
}

function drawMiniBar(
  doc: jsPDF, values: number[], total: number,
  colors: [number, number, number][], labels: string[],
  y: number, pageWidth: number
) {
  const barX = 30;
  const barW = pageWidth - 60;
  const barH = 8;

  // Background
  doc.setFillColor(235, 235, 235);
  doc.roundedRect(barX, y, barW, barH, 2, 2, "F");

  let cx = barX;
  values.forEach((count, li) => {
    if (count === 0) return;
    const bw = total > 0 ? (count / total) * barW : 0;
    doc.setFillColor(...colors[li]);
    doc.roundedRect(cx, y, bw, barH, 1.5, 1.5, "F");
    if (bw > 18) {
      doc.setFontSize(6);
      doc.setFont("Amiri", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`${labels[li]} (${count})`, cx + bw / 2, y + barH / 2 + 1.5, { align: "center" });
      doc.setTextColor(0, 0, 0);
    }
    cx += bw;
  });

  return y + barH + 6;
}

function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number, pw: number, ph: number) {
  doc.setFontSize(7);
  doc.setFont("Amiri", "normal");
  doc.setTextColor(160, 160, 160);
  doc.text(`${pageNum} / ${totalPages}`, pw / 2, ph - 5, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

function drawSideBySideTables(
  doc: jsPDF, tableStyles: any, pageWidth: number,
  leftTitle: string, leftColor: [number, number, number],
  leftHead: string[][], leftBody: string[][],
  rightTitle: string, rightColor: [number, number, number],
  rightHead: string[][], rightBody: string[][],
  startY: number
) {
  const halfW = pageWidth / 2;
  const gap = 8;

  // Right table (appears first in RTL)
  drawSubTitle(doc, leftTitle, pageWidth - 18, startY, leftColor);
  autoTable(doc, {
    startY: startY + 4,
    head: leftHead,
    body: leftBody,
    ...tableStyles,
    headStyles: { ...tableStyles.headStyles, fillColor: leftColor },
    margin: { left: halfW + gap / 2, right: 14 },
    tableWidth: halfW - gap / 2 - 14,
  });

  // Left table
  drawSubTitle(doc, rightTitle, halfW - gap / 2 - 4, startY, rightColor);
  autoTable(doc, {
    startY: startY + 4,
    head: rightHead,
    body: rightBody,
    ...tableStyles,
    headStyles: { ...tableStyles.headStyles, fillColor: rightColor },
    margin: { left: 14, right: halfW + gap / 2 },
    tableWidth: halfW - gap / 2 - 14,
  });
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

  // Count total pages for footer
  const classCount = data.classes.length;
  const classesWithGrades = data.classes.filter(cls =>
    cls.students.some(s => computeStudentAvg(cls, s.id, data.categories) !== null)
  ).length;
  // Page 1: Cover + Chart, Page 2: Top/Bottom 10 grades, Per-class grades pages, Attendance chart, Top/Bottom 10 attendance, Per-class attendance pages
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
    
    // Check if AI summary fits on current page, if not start a new page
    if (curY + boxHeight > ph - 20) {
      doc.addPage("a4", "landscape");
      curY = 15;
    }
    
    doc.roundedRect(margin, curY, boxWidth, boxHeight, 3, 3, "FD");
    // Icon
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

  // Grade Distribution Chart - check if enough space, otherwise new page
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

  // Overall circles
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

    // Mini distribution bar
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

  // Attendance summary circles
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

    // Mini attendance bar
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

  return { doc, watermark };
}
