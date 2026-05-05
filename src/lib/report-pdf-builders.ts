/**
 * Shared PDF builder functions for all report types.
 * Each builder returns a Blob — callers decide to save or share via WhatsApp.
 */
import type jsPDF from "jspdf";

// ─── Attendance Report PDF ───
interface AttendanceRow {
  student_name: string;
  date: string;
  status: string;
  notes: string | null;
  class_name?: string;
}

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  early_leave: "خروج مبكر",
  sick_leave: "إجازة مرضية",
};

export async function buildAttendancePDF(
  data: AttendanceRow[],
  dateFrom: string,
  dateTo: string
): Promise<{ blob: Blob; fileName: string; doc: jsPDF }> {
  const { createArabicPDF, getArabicTableStyles, finalizePDFAsBlob } = await import("@/lib/arabic-pdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { doc, startY, watermark, advanced } = await createArabicPDF({ orientation: "landscape", reportType: "attendance", includeHeader: true });
  const tableStyles = getArabicTableStyles(advanced);
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setFont("Amiri", "bold");
  doc.text("تقرير الحضور", pageWidth / 2, startY, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("Amiri", "normal");
  doc.text(`من: ${dateFrom}  إلى: ${dateTo}`, pageWidth / 2, startY + 6, { align: "center" });

  const includeClass = data.some((r) => !!r.class_name);

  // RTL column order (visual right-to-left): #, اسم الطالب, [الفصل], التاريخ, الحالة, ملاحظات
  // jsPDF-autotable arrays are reversed for RTL rendering, so we list in reverse.
  const head = includeClass
    ? ["ملاحظات", "الحالة", "التاريخ", "الفصل", "اسم الطالب", "#"]
    : ["ملاحظات", "الحالة", "التاريخ", "اسم الطالب", "#"];

  const tableData = data.map((r, i) =>
    includeClass
      ? [r.notes || "", STATUS_LABELS[r.status] || r.status, r.date, r.class_name || "", r.student_name, String(i + 1)]
      : [r.notes || "", STATUS_LABELS[r.status] || r.status, r.date, r.student_name, String(i + 1)]
  );

  const nameIdx = head.length - 2;
  const numIdx = head.length - 1;
  const columnStyles: Record<number, any> = {
    [nameIdx]: { halign: "right" as const, fontStyle: "bold" as const },
    [numIdx]: { halign: "center" as const, fontStyle: "bold" as const, cellWidth: 10 },
  };
  if (includeClass) {
    // class column sits one to the left of name in head array (index nameIdx - 1)
    columnStyles[nameIdx - 1] = { halign: "right" as const };
  }

  autoTable(doc, {
    startY: startY + 12,
    head: [head],
    body: tableData,
    ...tableStyles,
    columnStyles,
  });

  const fileName = `تقرير_الحضور_${dateFrom}_${dateTo}.pdf`;
  const blob = finalizePDFAsBlob(doc, watermark, advanced);
  return { blob, fileName, doc };
}

// ─── Grades Report PDF ───
interface GradeRow {
  student_name: string;
  categories: Record<string, number | null>;
  total: number;
}

export async function buildGradesPDF(
  data: GradeRow[],
  categoryNames: string[]
): Promise<{ blob: Blob; fileName: string; doc: jsPDF }> {
  const { createArabicPDF, getArabicTableStyles, finalizePDFAsBlob } = await import("@/lib/arabic-pdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { doc, startY, watermark, advanced } = await createArabicPDF({ orientation: "landscape", reportType: "grades", includeHeader: true });
  const tableStyles = getArabicTableStyles(advanced);
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setFont("Amiri", "bold");
  doc.text("تقرير الدرجات", pageWidth / 2, startY, { align: "center" });

  const head = ["المجموع", ...categoryNames.slice().reverse(), "اسم الطالب", "#"];
  const body = data.map((r, i) => [
    String(r.total),
    ...categoryNames.slice().reverse().map((n) => (r.categories[n] !== null ? String(r.categories[n]) : "—")),
    r.student_name,
    String(i + 1),
  ]);

  autoTable(doc, {
    startY: startY + 6,
    head: [head],
    body,
    ...tableStyles,
    columnStyles: {
      [head.length - 2]: { halign: "right" as const, fontStyle: "bold" as const },
      [head.length - 1]: { halign: "center" as const, fontStyle: "bold" as const, cellWidth: 10 },
      0: { fillColor: [219, 234, 254] as [number, number, number], fontStyle: "bold" as const },
    },
  });

  const fileName = `تقرير_الدرجات.pdf`;
  const blob = finalizePDFAsBlob(doc, watermark, advanced);
  return { blob, fileName, doc };
}

// ─── Excellence Report PDF ───
interface ExcellenceStudent {
  full_name: string;
  class_name: string;
  perfectAttendance: boolean;
  fullMarks: boolean;
  fullMarkTests: string[];
}

export async function buildExcellencePDF(
  students: ExcellenceStudent[],
  monthLabel: string
): Promise<{ blob: Blob; fileName: string }> {
  const { createArabicPDF, getArabicTableStyles, finalizePDFAsBlob } = await import("@/lib/arabic-pdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { doc, startY, watermark, advanced } = await createArabicPDF({ orientation: "portrait", reportType: "grades", includeHeader: true });
  const tableStyles = getArabicTableStyles(advanced);
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.text("تقرير المتميزين الشهري", pageWidth / 2, startY, { align: "center" });
  doc.setFontSize(11);
  doc.text(monthLabel, pageWidth / 2, startY + 8, { align: "center" });

  const body = students.map((s, i) => [
    s.fullMarkTests.join(", ") || "انتظام كامل",
    s.fullMarks ? "✓" : "—",
    s.perfectAttendance ? "✓" : "—",
    s.class_name,
    s.full_name,
    String(i + 1),
  ]);

  autoTable(doc, {
    startY: startY + 14,
    head: [["التفاصيل", "درجة كاملة", "حضور كامل", "الفصل", "اسم الطالب", "#"]],
    body,
    ...tableStyles,
  });

  const fileName = `تقرير_المتميزون_${monthLabel.replace(/\s/g, "_")}.pdf`;
  const blob = finalizePDFAsBlob(doc, watermark, advanced);
  return { blob, fileName };
}

// ─── Disciplinary Report PDF ───
interface DisciplinaryStudent {
  full_name: string;
  class_name: string;
  absenceDays: number;
  warningStatus: "sent" | "pending";
}

export async function buildDisciplinaryPDF(
  students: DisciplinaryStudent[],
  monthLabel: string
): Promise<{ blob: Blob; fileName: string }> {
  const { createArabicPDF, getArabicTableStyles, finalizePDFAsBlob } = await import("@/lib/arabic-pdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { doc, startY, watermark, advanced } = await createArabicPDF({ orientation: "portrait", reportType: "attendance", includeHeader: true });
  const tableStyles = getArabicTableStyles(advanced);
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.text("تقرير الغياب والانضباط", pageWidth / 2, startY, { align: "center" });
  doc.setFontSize(11);
  doc.text(monthLabel, pageWidth / 2, startY + 8, { align: "center" });

  const body = students.map((s, i) => [
    s.warningStatus === "sent" ? "تم الإرسال" : "معلق",
    String(s.absenceDays),
    s.class_name,
    s.full_name,
    String(i + 1),
  ]);

  autoTable(doc, {
    startY: startY + 14,
    head: [["حالة الإنذار", "أيام الغياب", "الفصل", "اسم الطالب", "#"]],
    body,
    ...tableStyles,
  });

  const fileName = `تقرير_الغياب_${monthLabel.replace(/\s/g, "_")}.pdf`;
  const blob = finalizePDFAsBlob(doc, watermark, advanced);
  return { blob, fileName };
}

// ─── Helper: save or share ───
export async function savePDFBlob(blob: Blob, fileName: string) {
  // Use PWA-safe download (handles standalone mode on iOS/Android/Desktop PWA)
  const { safeDownload } = await import("@/lib/download-utils");
  await safeDownload(blob, fileName);
}

export async function sharePDFBlob(blob: Blob, fileName: string, caption: string) {
  const { sharePDFViaWhatsApp } = await import("@/lib/whatsapp-share");
  return sharePDFViaWhatsApp(blob, fileName, caption);
}
