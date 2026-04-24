import type { CategoryMeta, GradeRow } from "@/hooks/useReportSending";
import { distributionByLevel, studentPercent, classifyLevel } from "./grades-helpers";

export async function buildLevelsReportPDF(
  rows: GradeRow[],
  categories: CategoryMeta[],
  homeworkStats?: { name: string; complete: number; partial: number; missing: number }[]
): Promise<{ blob: Blob; fileName: string }> {
  const { createArabicPDF, getArabicTableStyles, finalizePDFAsBlob } = await import("@/lib/arabic-pdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { doc, startY, watermark, advanced } = await createArabicPDF({
    orientation: "portrait", reportType: "grades", includeHeader: true,
  });
  const tableStyles = getArabicTableStyles(advanced);
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont("Amiri", "bold");
  doc.text("تقرير تصنيف المستويات", pageWidth / 2, startY, { align: "center" });

  const dist = distributionByLevel(rows, categories);
  const total = rows.length || 1;

  // Levels distribution table
  autoTable(doc, {
    startY: startY + 8,
    head: [["النسبة", "عدد الطلاب", "الحد الأدنى", "المستوى"]],
    body: dist.map((b) => [
      `${((b.count / total) * 100).toFixed(0)}%`,
      String(b.count),
      `${b.min}%+`,
      b.label,
    ]),
    ...tableStyles,
  });

  let cursorY = (doc as any).lastAutoTable.finalY + 8;

  // Homework stats
  if (homeworkStats && homeworkStats.length > 0) {
    doc.setFontSize(13);
    doc.text("إحصائيات الواجبات", pageWidth / 2, cursorY, { align: "center" });
    autoTable(doc, {
      startY: cursorY + 4,
      head: [["لم يسلم", "ناقصة", "كاملة", "الفئة"]],
      body: homeworkStats.map((h) => [String(h.missing), String(h.partial), String(h.complete), h.name]),
      ...tableStyles,
    });
    cursorY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Students per level
  doc.setFontSize(13);
  doc.text("ترتيب الطلاب حسب الأداء", pageWidth / 2, cursorY, { align: "center" });
  const sorted = [...rows].sort(
    (a, b) => studentPercent(b, categories) - studentPercent(a, categories)
  );
  autoTable(doc, {
    startY: cursorY + 4,
    head: [["المستوى", "النسبة %", "اسم الطالب", "#"]],
    body: sorted.map((r, i) => {
      const p = studentPercent(r, categories);
      return [classifyLevel(p).label, `${p.toFixed(1)}%`, r.student_name, String(i + 1)];
    }),
    ...tableStyles,
  });

  const fileName = `تقرير_المستويات_${new Date().toISOString().slice(0, 10)}.pdf`;
  const blob = finalizePDFAsBlob(doc, watermark, advanced);
  return { blob, fileName };
}
