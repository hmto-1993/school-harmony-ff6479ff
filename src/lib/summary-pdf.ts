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

// ============ Helpers ============
const levelLabels = ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"];
const levelColors: [number, number, number][] = [
  [16, 185, 129], [59, 130, 246], [251, 191, 36], [249, 115, 22], [239, 68, 68],
];
const getLevel = (avg: number) => {
  if (avg >= 90) return 0;
  if (avg >= 80) return 1;
  if (avg >= 70) return 2;
  if (avg >= 60) return 3;
  return 4;
};

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
function drawLevelCircles(doc: jsPDF, counts: number[], total: number, centerX: number, y: number) {
  const circleR = 8;
  const gap = 38;
  const startX = centerX + ((levelLabels.length - 1) * gap) / 2;
  levelLabels.forEach((label, i) => {
    const cx = startX - i * gap;
    const cy = y;
    const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
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
    doc.text(`${counts[i]}`, cx, cy + circleR + 9, { align: "center" });
  });
}

function drawStackedBars(
  doc: jsPDF, items: { name: string; values: number[]; total: number }[],
  colors: [number, number, number][], labels: string[],
  startY: number, pageWidth: number, pageHeight: number
) {
  const chartX = 20;
  const chartW = pageWidth - 60;
  const barH = Math.min(12, (pageHeight - startY - 30) / items.length - 2);
  const barGap = 3;

  // Legend
  const legY = startY - 6;
  const legX = pageWidth / 2 + (labels.length * 15);
  labels.forEach((label, i) => {
    const lx = legX - i * 30;
    doc.setFillColor(...colors[i]);
    doc.rect(lx, legY - 3, 5, 5, "F");
    doc.setFont("Amiri", "normal");
    doc.setFontSize(8);
    doc.text(label, lx - 1, legY + 1, { align: "right" });
  });

  items.forEach((item, idx) => {
    const by = startY + idx * (barH + barGap);
    doc.setFont("Amiri", "bold");
    doc.setFontSize(9);
    doc.text(item.name, pageWidth - 15, by + barH / 2 + 1.5, { align: "right" });

    let cx = chartX;
    item.values.forEach((count, li) => {
      if (count === 0) return;
      const bw = item.total > 0 ? (count / item.total) * chartW : 0;
      doc.setFillColor(...colors[li]);
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
  });

  return startY + items.length * (barH + barGap);
}

// ============ Main Builder ============
export async function buildSummaryPDF(
  data: SummaryPDFData,
  options: { includeAISummary: boolean; aiSummaryText?: string }
) {
  const { doc, startY, watermark } = await createArabicPDF({
    orientation: "landscape",
    reportType: "grades",
    includeHeader: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableStyles = getArabicTableStyles();
  const today = format(new Date(), "yyyy/MM/dd");

  // Title
  doc.setFontSize(16);
  doc.setFont("Amiri", "bold");
  doc.text("📋 ملخص مستويات الطلاب", pageWidth / 2, startY, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("Amiri", "normal");
  doc.text(`${data.teacherName} — ${today}`, pageWidth / 2, startY + 7, { align: "center" });

  let curY = startY + 14;

  // AI Summary
  if (options.includeAISummary && options.aiSummaryText) {
    doc.setFontSize(12);
    doc.setFont("Amiri", "bold");
    doc.text("✦ ملخص ذكي", pageWidth / 2, curY, { align: "center" });
    curY += 6;
    const margin = 14;
    const boxWidth = pageWidth - margin * 2;
    doc.setFillColor(240, 245, 255);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.3);
    doc.setFont("Amiri", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(options.aiSummaryText, boxWidth - 10);
    const boxHeight = lines.length * 5 + 8;
    doc.roundedRect(margin, curY - 2, boxWidth, boxHeight, 2, 2, "FD");
    doc.text(lines, pageWidth - margin - 5, curY + 4, { align: "right", maxWidth: boxWidth - 10 });
    curY += boxHeight + 6;
  }

  // ============================================================
  // SECTION 1: Grade Distribution Chart — All Classes
  // ============================================================
  const allStudentAvgs: { name: string; className: string; avg: number; classId: string }[] = [];
  data.classes.forEach(cls => {
    cls.students.forEach(s => {
      const avg = computeStudentAvg(cls, s.id, data.categories);
      if (avg !== null) allStudentAvgs.push({ name: s.full_name, className: cls.name, avg, classId: cls.id });
    });
  });
  allStudentAvgs.sort((a, b) => b.avg - a.avg);

  doc.setFontSize(13);
  doc.setFont("Amiri", "bold");
  doc.text("📊 توزيع مستويات الدرجات — جميع الفصول", pageWidth / 2, curY, { align: "center" });
  curY += 10;

  const classDistributions = data.classes.map(cls => {
    const counts = [0, 0, 0, 0, 0];
    allStudentAvgs.filter(s => s.classId === cls.id).forEach(s => counts[getLevel(s.avg)]++);
    const total = allStudentAvgs.filter(s => s.classId === cls.id).length;
    return { name: cls.name, values: counts, total };
  });

  const barsEndY = drawStackedBars(doc, classDistributions, levelColors, levelLabels, curY, pageWidth, pageHeight);

  // Overall level circles
  const overallCounts = [0, 0, 0, 0, 0];
  allStudentAvgs.forEach(s => overallCounts[getLevel(s.avg)]++);
  const circleY = Math.min(barsEndY + 15, pageHeight - 30);
  doc.setFont("Amiri", "bold");
  doc.setFontSize(11);
  doc.text("الإحصاء العام", pageWidth / 2, circleY - 5, { align: "center" });
  drawLevelCircles(doc, overallCounts, allStudentAvgs.length, pageWidth / 2, circleY + 5);

  // ============================================================
  // PAGE 2: Top 10 / Bottom 10 — Grades
  // ============================================================
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
  doc.setFont("Amiri", "bold");
  doc.text("⚠ أدنى 10 طلاب", pageWidth / 2 - 10, 22, { align: "right" });
  autoTable(doc, {
    startY: 26,
    head: [["المعدل %", "الفصل", "الطالب", "#"]],
    body: bottom10.map((s, i) => [`${s.avg}%`, s.className, s.name, String(i + 1)]),
    ...tableStyles,
    headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
    margin: { right: pageWidth / 2 + 5 },
  });

  // ============================================================
  // PAGES: Per-class Top 5 / Bottom 5 (Grades)
  // ============================================================
  data.classes.forEach(cls => {
    const classAvgs = cls.students
      .map(s => ({ name: s.full_name, avg: computeStudentAvg(cls, s.id, data.categories) }))
      .filter(s => s.avg !== null) as { name: string; avg: number }[];
    classAvgs.sort((a, b) => b.avg - a.avg);
    if (classAvgs.length === 0) return;

    doc.addPage("a4", "landscape");
    doc.setFontSize(13);
    doc.setFont("Amiri", "bold");
    doc.text(`ترتيب الطلاب: ${cls.name}`, pageWidth / 2, 15, { align: "center" });

    // Mini distribution bar
    const classCounts = [0, 0, 0, 0, 0];
    classAvgs.forEach(s => classCounts[getLevel(s.avg)]++);
    const miniBarY = 20;
    let mbx = 30;
    const mbw = pageWidth - 60;
    classCounts.forEach((count, li) => {
      if (count === 0) return;
      const bw = (count / classAvgs.length) * mbw;
      doc.setFillColor(...levelColors[li]);
      doc.roundedRect(mbx, miniBarY, bw, 6, 1, 1, "F");
      if (bw > 12) {
        doc.setFontSize(6);
        doc.setFont("Amiri", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(`${levelLabels[li]} (${count})`, mbx + bw / 2, miniBarY + 4, { align: "center" });
        doc.setTextColor(0, 0, 0);
      }
      mbx += bw;
    });

    const classTop5 = classAvgs.slice(0, 5);
    const classBottom5 = classAvgs.slice(-5).reverse();

    doc.setFontSize(11);
    doc.setFont("Amiri", "bold");
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
    doc.setFont("Amiri", "bold");
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

  // ============================================================
  // PAGE: Attendance Distribution Chart
  // ============================================================
  doc.addPage("a4", "landscape");
  doc.setFontSize(14);
  doc.setFont("Amiri", "bold");
  doc.text("📊 ملخص الحضور والغياب — جميع الفصول", pageWidth / 2, 15, { align: "center" });

  const attColors: [number, number, number][] = [
    [16, 185, 129], [239, 68, 68], [251, 191, 36], [156, 163, 175],
  ];
  const attLabels = ["حاضر", "غائب", "متأخر", "لم يُسجل"];

  const attItems = data.classes.map(cls => ({
    name: cls.name,
    values: [cls.attendance.present, cls.attendance.absent, cls.attendance.late, cls.attendance.notRecorded],
    total: cls.studentCount,
  }));

  const attEndY = drawStackedBars(doc, attItems, attColors, attLabels, 28, pageWidth, pageHeight);

  // Overall attendance circles
  const totalPresent = data.classes.reduce((s, c) => s + c.attendance.present, 0);
  const totalAbsent = data.classes.reduce((s, c) => s + c.attendance.absent, 0);
  const totalLate = data.classes.reduce((s, c) => s + c.attendance.late, 0);
  const totalAll = data.totalStudents;

  const attSummY = Math.min(attEndY + 15, pageHeight - 30);
  doc.setFont("Amiri", "bold");
  doc.setFontSize(11);
  doc.text("الإحصاء العام للحضور", pageWidth / 2, attSummY - 5, { align: "center" });

  const attStats = [
    { label: "حاضر", count: totalPresent, color: attColors[0], pct: totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0 },
    { label: "غائب", count: totalAbsent, color: attColors[1], pct: totalAll > 0 ? Math.round((totalAbsent / totalAll) * 100) : 0 },
    { label: "متأخر", count: totalLate, color: attColors[2], pct: totalAll > 0 ? Math.round((totalLate / totalAll) * 100) : 0 },
  ];

  const circleR = 8;
  const circleGap = 38;
  const attCirclesX = pageWidth / 2 + ((attStats.length - 1) * circleGap) / 2;
  attStats.forEach((st, i) => {
    const cx = attCirclesX - i * circleGap;
    const cy = attSummY + 5;
    doc.setFillColor(245, 245, 245);
    doc.circle(cx, cy, circleR, "F");
    doc.setFillColor(...st.color);
    doc.circle(cx, cy, circleR - 1.5, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, circleR - 3.5, "F");
    doc.setFontSize(8);
    doc.setFont("Amiri", "bold");
    doc.setTextColor(...st.color);
    doc.text(`${st.pct}%`, cx, cy + 1.5, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    doc.setFont("Amiri", "normal");
    doc.text(st.label, cx, cy + circleR + 5, { align: "center" });
    doc.text(`${st.count}`, cx, cy + circleR + 9, { align: "center" });
  });

  // ============================================================
  // PAGE: Top Absentees — Global + Per Class
  // ============================================================
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

  // Top 10 absentees
  doc.setFontSize(11);
  doc.setFont("Amiri", "bold");
  doc.text("أكثر 10 طلاب غياباً — جميع الفصول", pageWidth - 14, 22, { align: "right" });
  autoTable(doc, {
    startY: 26,
    head: [["عدد الغيابات", "الفصل", "الطالب", "#"]],
    body: globalAbsentees.slice(0, 10).map((s, i) => [String(s.count), s.className, s.name, String(i + 1)]),
    ...tableStyles,
    headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
    margin: { left: pageWidth / 2 + 5 },
  });

  // Best attendance (least absences) — top 10 with 0 or lowest
  const allStudentAbsences: { name: string; className: string; count: number }[] = [];
  data.classes.forEach(cls => {
    cls.students.forEach(s => {
      const absCount = cls.topAbsentees.find(ta => ta.name === s.full_name)?.count || 0;
      allStudentAbsences.push({ name: s.full_name, className: cls.name, count: absCount });
    });
  });
  allStudentAbsences.sort((a, b) => a.count - b.count);
  const bestAttendance10 = allStudentAbsences.slice(0, 10);

  doc.setFontSize(11);
  doc.setFont("Amiri", "bold");
  doc.text("⭐ أفضل 10 طلاب حضوراً", pageWidth / 2 - 10, 22, { align: "right" });
  autoTable(doc, {
    startY: 26,
    head: [["عدد الغيابات", "الفصل", "الطالب", "#"]],
    body: bestAttendance10.map((s, i) => [String(s.count), s.className, s.name, String(i + 1)]),
    ...tableStyles,
    headStyles: { ...tableStyles.headStyles, fillColor: [16, 185, 129] as [number, number, number] },
    margin: { right: pageWidth / 2 + 5 },
  });

  // Per-class top 5 absentees + best 5 attendance
  data.classes.forEach(cls => {
    const studentAbsences = cls.students.map(s => ({
      name: s.full_name,
      count: cls.topAbsentees.find(ta => ta.name === s.full_name)?.count || 0,
    }));
    studentAbsences.sort((a, b) => b.count - a.count);

    doc.addPage("a4", "landscape");
    doc.setFontSize(13);
    doc.setFont("Amiri", "bold");
    doc.text(`الحضور والغياب: ${cls.name}`, pageWidth / 2, 15, { align: "center" });

    // Mini attendance bar
    const attMiniY = 20;
    const attMiniW = pageWidth - 60;
    let amx = 30;
    const attVals = [cls.attendance.present, cls.attendance.absent, cls.attendance.late];
    const miniAttColors = attColors.slice(0, 3);
    attVals.forEach((count, li) => {
      if (count === 0) return;
      const bw = cls.studentCount > 0 ? (count / cls.studentCount) * attMiniW : 0;
      doc.setFillColor(...miniAttColors[li]);
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

    // Top 5 absentees
    const worst5 = studentAbsences.slice(0, 5);
    doc.setFontSize(11);
    doc.setFont("Amiri", "bold");
    doc.text("⚠ أكثر 5 غياباً", pageWidth - 14, 32, { align: "right" });
    autoTable(doc, {
      startY: 36,
      head: [["عدد الغيابات", "الطالب", "#"]],
      body: worst5.map((s, i) => [String(s.count), s.name, String(i + 1)]),
      ...tableStyles,
      headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
      margin: { left: pageWidth / 2 + 5 },
    });

    // Best 5 attendance
    const best5 = [...studentAbsences].sort((a, b) => a.count - b.count).slice(0, 5);
    doc.setFontSize(11);
    doc.setFont("Amiri", "bold");
    doc.text("⭐ أفضل 5 حضوراً", pageWidth / 2 - 10, 32, { align: "right" });
    autoTable(doc, {
      startY: 36,
      head: [["عدد الغيابات", "الطالب", "#"]],
      body: best5.map((s, i) => [String(s.count), s.name, String(i + 1)]),
      ...tableStyles,
      headStyles: { ...tableStyles.headStyles, fillColor: [16, 185, 129] as [number, number, number] },
      margin: { right: pageWidth / 2 + 5 },
    });
  });

  return { doc, watermark };
}
