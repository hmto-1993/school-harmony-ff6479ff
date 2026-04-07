import { safeWriteXLSX } from "@/lib/download-utils";
import type { StudentRow, WeekData } from "./weekly-report-types";

const STATUS_CONFIG: Record<string, { label: string; printColor: string }> = {
  present:    { label: "حاضر",      printColor: "#66bb6a" },
  absent:     { label: "غائب",      printColor: "#ef5350" },
  sick_leave: { label: "مستأذن",    printColor: "#42a5f5" },
  late:       { label: "متأخر",     printColor: "#ffca28" },
  early_leave:{ label: "خروج مبكر", printColor: "#42a5f5" },
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

interface ExportParams {
  studentRows: StudentRow[];
  filteredWeeks: WeekData[];
  periodsPerWeek: number;
  dateFrom: string;
  dateTo: string;
  classDisplayName?: string;
  alertThreshold: number;
  absenceMode: string;
  allowedSessions: number;
}

export async function exportWeeklyExcel(params: ExportParams) {
  const { studentRows, filteredWeeks, periodsPerWeek, dateFrom, dateTo, alertThreshold, absenceMode, allowedSessions } = params;
  const XLSX = await import("xlsx");
  const headers = [
    "م", "اسم الطالب",
    ...filteredWeeks.flatMap((w) => {
      const colCount = w.dates.length > 0 ? Math.min(w.dates.length, periodsPerWeek) : 1;
      return Array.from({ length: colCount }, (_, i) => `أ${w.weekNum}-${i + 1}`);
    }),
    "حاضر", "غائب", "متأخر", "معذور", "تنبيه",
  ];
  const rows = studentRows.map((s, idx) => {
    const row: Record<string, any> = { "م": idx + 1, "اسم الطالب": s.name };
    filteredWeeks.forEach((w) => {
      const slots = s.weeks[w.weekNum] || [];
      const colCount = w.dates.length > 0 ? Math.min(w.dates.length, periodsPerWeek) : 1;
      for (let i = 0; i < colCount; i++) {
        const st = slots[i];
        row[`أ${w.weekNum}-${i + 1}`] = st ? STATUS_CONFIG[st]?.label || st : "";
      }
    });
    row["حاضر"] = s.totalPresent;
    row["غائب"] = s.totalAbsent;
    row["متأخر"] = s.totalLate;
    row["معذور"] = s.totalExcused;
    row["تنبيه"] = s.isAtRisk ? `⚠ تجاوز ${absenceMode === "sessions" && allowedSessions > 0 ? `${allowedSessions} حصة` : `${Math.round(alertThreshold * 100)}%`}` : "";
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "تقرير الحضور الأسبوعي");
  safeWriteXLSX(wb, `تقرير_الحضور_الأسبوعي_${dateFrom}_${dateTo}.xlsx`);
}

export async function exportWeeklyPDF(params: ExportParams) {
  const { studentRows, filteredWeeks, periodsPerWeek, dateFrom, dateTo, classDisplayName, alertThreshold, absenceMode, allowedSessions } = params;

  const { createArabicPDF, getArabicTableStyles, finalizePDF } = await import("@/lib/arabic-pdf");
  const autoTableImport = await import("jspdf-autotable");
  const autoTable = autoTableImport.default;
  const { doc, startY, watermark, advanced } = await createArabicPDF({ orientation: "landscape", reportType: "attendance", includeHeader: true });
  const tableStyles = getArabicTableStyles(advanced);
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setFont("Amiri", "bold");
  doc.text("تقرير الحضور الأسبوعي", pageWidth / 2, startY, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("Amiri", "normal");
  doc.text(`${classDisplayName || ""} | من: ${dateFrom}  إلى: ${dateTo}`, pageWidth / 2, startY + 6, { align: "center" });

  const legendY = startY + 12;
  doc.setFontSize(7);
  const legendEntries = [
    { label: "حاضر", color: [34, 197, 94] },
    { label: "غائب", color: [239, 68, 68] },
    { label: "مستأذن", color: [59, 130, 246] },
    { label: "متأخر", color: [245, 158, 11] },
  ];
  let lx = pageWidth - 14;
  doc.text("مفتاح الرموز", lx, legendY, { align: "right" });
  lx -= doc.getTextWidth("مفتاح الرموز") + 6;
  legendEntries.forEach((e) => {
    doc.setFillColor(e.color[0], e.color[1], e.color[2]);
    doc.circle(lx, legendY - 1.2, 1.5, "F");
    lx -= 4;
    doc.setTextColor(60, 60, 60);
    doc.text(e.label, lx, legendY, { align: "right" });
    lx -= doc.getTextWidth(e.label) + 6;
  });
  doc.setTextColor(0, 0, 0);

  // Calculate optimal name column width
  doc.setFont("Amiri", "bold");
  doc.setFontSize(9);
  const longestName = studentRows.reduce((max, s) => {
    const thresholdLabel = absenceMode === "sessions" && allowedSessions > 0 ? `${allowedSessions} حصة` : `${Math.round(alertThreshold * 100)}%`;
    const nameText = s.isAtRisk ? `${s.name} ⚠ تجاوز ${thresholdLabel}` : s.name;
    return nameText.length > max.length ? nameText : max;
  }, "");
  const nameColWidth = Math.min(doc.getTextWidth(longestName) + 6, 70);
  doc.setFont("Amiri", "normal");

  const exportWeeks = filteredWeeks;

  const weekGroupHeaders = exportWeeks.map((w) => ({
    content: `الأسبوع ${w.weekNum}`,
    colSpan: w.dates.length > 0 ? Math.min(w.dates.length, periodsPerWeek) : 1,
    styles: { halign: "center" as const, fillColor: [233, 236, 239] as [number, number, number], textColor: [73, 80, 87] as [number, number, number], fontSize: 7 },
  }));

  const summaryHeaders = [
    { content: "", styles: { halign: "center" as const, fillColor: [233, 236, 239] as [number, number, number], fontSize: 8, cellWidth: 8 } },
    { content: "", styles: { halign: "center" as const, fillColor: [233, 236, 239] as [number, number, number], fontSize: 8, cellWidth: 8 } },
    { content: "", styles: { halign: "center" as const, fillColor: [233, 236, 239] as [number, number, number], fontSize: 8, cellWidth: 8 } },
  ];

  const head = [[
    ...summaryHeaders,
    ...weekGroupHeaders.slice().reverse(),
    { content: "اسم الطالب", styles: { halign: "right" as const, cellWidth: nameColWidth } },
    { content: "م", styles: { halign: "center" as const, cellWidth: 8 } },
  ]];

  const dotColorMap = new Map<string, [number, number, number]>();

  const body = studentRows.map((s, idx) => {
    const statusCells = exportWeeks.slice().reverse().flatMap((w) => {
      const slots = s.weeks[w.weekNum] || [];
      const colCount = w.dates.length > 0 ? Math.min(w.dates.length, periodsPerWeek) : 1;
      return Array.from({ length: colCount }, (_, i) => {
        const st = slots[i];
        const cfg = st ? STATUS_CONFIG[st] : null;
        return { content: "", styles: { halign: "center" as const, fontSize: 7 }, _dotColor: cfg ? hexToRgb(cfg.printColor) : [210, 215, 220] as [number, number, number] };
      });
    });

    const thresholdLbl = absenceMode === "sessions" && allowedSessions > 0 ? `${allowedSessions} حصة` : `${Math.round(alertThreshold * 100)}%`;
    const nameContent = s.isAtRisk ? `${s.name}\n⚠ تجاوز ${thresholdLbl}` : s.name;

    const row = [
      { content: String(s.totalLate), styles: { halign: "center" as const, fontSize: 8, textColor: hexToRgb("#d97706") as [number, number, number] } },
      { content: String(s.totalAbsent), styles: { halign: "center" as const, fontSize: 8, textColor: hexToRgb("#e53935") as [number, number, number] } },
      { content: String(s.totalPresent), styles: { halign: "center" as const, fontSize: 8, textColor: hexToRgb("#4caf50") as [number, number, number] } },
      ...statusCells,
      { content: nameContent, styles: { halign: "right" as const, fontStyle: "bold" as const, fontSize: 9, cellWidth: nameColWidth } },
      { content: String(idx + 1), styles: { halign: "center" as const, fontStyle: "bold" as const, cellWidth: 8 } },
    ];

    statusCells.forEach((cell: any, ci: number) => {
      if (cell._dotColor) dotColorMap.set(`${idx}-${ci + 3}`, cell._dotColor);
    });

    return row;
  });

  autoTable(doc, {
    startY: legendY + 5,
    head, body,
    ...tableStyles,
    margin: { left: 10, right: 10 },
    tableWidth: "auto",
    styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 1.5, lineColor: [206, 212, 218], lineWidth: 0.3 },
    headStyles: { ...tableStyles.headStyles, fontSize: 7, fillColor: [233, 236, 239], textColor: [73, 80, 87] },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    didParseCell: (data: any) => {
      if (data.section === "body" && studentRows[data.row.index]?.isAtRisk && data.column.index <= 1) {
        data.cell.styles.fillColor = [254, 242, 242];
      }
    },
    didDrawCell: (data: any) => {
      if (data.section === "body") {
        const key = `${data.row.index}-${data.column.index}`;
        const color = dotColorMap.get(key);
        if (color) {
          const cx = data.cell.x + data.cell.width / 2;
          const cy = data.cell.y + data.cell.height / 2;
          doc.setFillColor(color[0], color[1], color[2]);
          doc.circle(cx, cy, 1.3, "F");
        }
      }
      if (data.section === "head" && data.row.index === 0) {
        const headerDotColors: Record<number, [number, number, number]> = {
          0: hexToRgb("#fbc02d"),
          1: hexToRgb("#e53935"),
          2: hexToRgb("#4caf50"),
        };
        const hColor = headerDotColors[data.column.index];
        if (hColor) {
          const cx = data.cell.x + data.cell.width / 2;
          const cy = data.cell.y + data.cell.height / 2;
          doc.setFillColor(hColor[0], hColor[1], hColor[2]);
          doc.circle(cx, cy, 1.5, "F");
        }
      }
    },
  });

  finalizePDF(doc, `تقرير_الحضور_الأسبوعي_${dateFrom}_${dateTo}.pdf`, watermark, advanced);
}
