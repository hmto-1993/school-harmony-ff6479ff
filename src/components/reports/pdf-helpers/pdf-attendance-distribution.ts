import autoTable from "jspdf-autotable";
import { attColors, attLabels } from "./pdf-constants";
import { ComprehensiveData } from "./pdf-types";

export function buildAttendanceDistributionPage(doc: any, data: ComprehensiveData, tableStyles: any, pageWidth: number, pageHeight: number, chartX: number, chartW: number, barGap: number) {
  const circleR = 8;

  doc.addPage("a4", "landscape");
  doc.setFontSize(14);
  doc.setFont("Amiri", "bold");
  doc.text("📊 ملخص الحضور والغياب — جميع الفصول", pageWidth / 2, 15, { align: "center" });

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

  // Overall circles
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
    ...tableStyles, headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
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
      startY: 30, head: [["عدد الغيابات", "الطالب", "#"]],
      body: cls.topAbsentees.slice(0, 5).map((s, i) => [String(s.count), s.name, String(i + 1)]),
      ...tableStyles, headStyles: { ...tableStyles.headStyles, fillColor: [239, 68, 68] as [number, number, number] },
    });
  });
}
