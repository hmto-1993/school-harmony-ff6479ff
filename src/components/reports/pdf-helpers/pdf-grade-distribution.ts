import { levelLabels, levelColors, getLevel } from "./pdf-constants";
import { ComprehensiveData } from "./pdf-types";
import { computeStudentAvg } from "./pdf-student-avg";

export function buildGradeDistributionPage(
  doc: any,
  data: ComprehensiveData,
  allStudentAvgs: { name: string; className: string; avg: number; classId: string }[],
  pageWidth: number,
  pageHeight: number
) {
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
}
