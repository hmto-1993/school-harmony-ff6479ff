/**
 * Draw helpers for summary PDF — extracted from summary-pdf.ts
 */
import autoTable from "jspdf-autotable";
import type jsPDF from "jspdf";

// ============ Constants ============
export const levelLabels = ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"];
export const levelColors: [number, number, number][] = [
  [16, 185, 129], [59, 130, 246], [251, 191, 36], [249, 115, 22], [239, 68, 68],
];
export const attColors: [number, number, number][] = [
  [16, 185, 129], [239, 68, 68], [251, 191, 36], [156, 163, 175],
];
export const attLabels = ["حاضر", "غائب", "متأخر", "لم يُسجل"];

export const getLevel = (avg: number) => {
  if (avg >= 90) return 0;
  if (avg >= 80) return 1;
  if (avg >= 70) return 2;
  if (avg >= 60) return 3;
  return 4;
};

// ============ Draw Helpers ============
export function drawSectionTitle(doc: jsPDF, title: string, y: number, pw: number) {
  doc.setFontSize(13);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(30, 64, 120);
  doc.text(title, pw / 2, y, { align: "center" });
  const lineW = 60;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(pw / 2 - lineW, y + 3, pw / 2 + lineW, y + 3);
  doc.setTextColor(0, 0, 0);
  return y + 10;
}

export function drawSubTitle(doc: jsPDF, title: string, x: number, y: number, color: [number, number, number]) {
  doc.setFontSize(10);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(...color);
  doc.text(title, x, y, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

export function drawLevelCircles(doc: jsPDF, counts: number[], total: number, centerX: number, y: number) {
  const circleR = 9;
  const gap = 40;
  const startX = centerX + ((levelLabels.length - 1) * gap) / 2;
  levelLabels.forEach((label, i) => {
    const cx = startX - i * gap;
    const cy = y;
    const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
    doc.setFillColor(230, 230, 230);
    doc.circle(cx, cy, circleR + 0.5, "F");
    doc.setFillColor(...levelColors[i]);
    doc.circle(cx, cy, circleR, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, circleR - 2.5, "F");
    doc.setFontSize(9);
    doc.setFont("Amiri", "bold");
    doc.setTextColor(...levelColors[i]);
    doc.text(`${pct}%`, cx, cy + 2, { align: "center" });
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(7);
    doc.setFont("Amiri", "bold");
    doc.text(label, cx, cy + circleR + 5, { align: "center" });
    doc.setFont("Amiri", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`(${counts[i]})`, cx, cy + circleR + 9, { align: "center" });
    doc.setTextColor(0, 0, 0);
  });
}

export function drawAttendanceCircles(doc: jsPDF, stats: { label: string; count: number; color: [number, number, number]; pct: number }[], centerX: number, y: number) {
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

export function drawStackedBars(
  doc: jsPDF, items: { name: string; values: number[]; total: number }[],
  colors: [number, number, number][], labels: string[],
  startY: number, pageWidth: number, maxHeight: number
) {
  const chartX = 25;
  const chartW = pageWidth - 70;
  const barH = Math.min(14, Math.max(8, (maxHeight - 10) / items.length - 3));
  const barGap = 4;

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
    doc.setFont("Amiri", "bold");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(item.name, pageWidth - 18, by + barH / 2 + 1.5, { align: "right" });
    doc.setTextColor(0, 0, 0);

    doc.setFillColor(240, 240, 240);
    doc.roundedRect(chartX, by, chartW, barH, 2, 2, "F");

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

    doc.setFontSize(7);
    doc.setFont("Amiri", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(String(item.total), chartX - 3, by + barH / 2 + 1.5, { align: "right" });
    doc.setTextColor(0, 0, 0);
  });

  return barsStartY + items.length * (barH + barGap);
}

export function drawMiniBar(
  doc: jsPDF, values: number[], total: number,
  colors: [number, number, number][], labels: string[],
  y: number, pageWidth: number
) {
  const barX = 30;
  const barW = pageWidth - 60;
  const barH = 8;

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

export function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number, pw: number, ph: number) {
  doc.setFontSize(7);
  doc.setFont("Amiri", "normal");
  doc.setTextColor(160, 160, 160);
  doc.text(`${pageNum} / ${totalPages}`, pw / 2, ph - 5, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

export function drawSideBySideTables(
  doc: jsPDF, tableStyles: any, pageWidth: number,
  leftTitle: string, leftColor: [number, number, number],
  leftHead: string[][], leftBody: string[][],
  rightTitle: string, rightColor: [number, number, number],
  rightHead: string[][], rightBody: string[][],
  startY: number
) {
  const halfW = pageWidth / 2;
  const gap = 8;

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
