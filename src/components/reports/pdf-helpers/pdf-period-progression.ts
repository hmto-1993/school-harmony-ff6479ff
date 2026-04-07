import { classLineColors } from "./pdf-constants";
import { ComprehensiveData } from "./pdf-types";

export function buildPeriodProgressionPage(doc: any, data: ComprehensiveData, categories: any[], pageWidth: number, pageHeight: number) {
  doc.addPage("a4", "landscape");
  doc.setFontSize(14);
  doc.setFont("Amiri", "bold");
  doc.text("📈 تطور مستوى الفصول خلال الفترات الدراسية", pageWidth / 2, 15, { align: "center" });

  const periods = [1, 2];
  const periodLabels = ["الفترة الأولى", "الفترة الثانية"];

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
        if (sMax > 0) { totalPct += Math.round((sTotal / sMax) * 100); studentCount++; }
      });
      avgs.push(studentCount > 0 ? Math.round(totalPct / studentCount) : null);
    });
    classPerPeriod.push({ name: cls.name, color, avgs });
  });

  const lcMarginL = 30, lcMarginR = 50, lcTop = 30;
  const lcBottom = pageHeight - 35;
  const lcWidth = pageWidth - lcMarginL - lcMarginR;
  const lcHeight = lcBottom - lcTop;

  // Grid lines
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

  // Axes
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.5);
  doc.line(lcMarginL, lcTop, lcMarginL, lcBottom);
  doc.line(lcMarginL, lcBottom, lcMarginL + lcWidth, lcBottom);

  // Lines
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

  // Legend
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

  // Zone backgrounds
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
