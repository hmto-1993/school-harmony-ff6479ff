import { supabase } from "@/integrations/supabase/client";

interface BehaviorRow {
  student_name: string;
  date: string;
  type: string;
  note: string;
  severity: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  positive: "إيجابي",
  negative: "سلبي",
  neutral: "محايد",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "مرتفع",
  critical: "حرج",
};

const formatSeverity = (severity: string | null): string => {
  if (!severity || !(severity in SEVERITY_LABELS)) return "—";
  return SEVERITY_LABELS[severity];
};

export async function buildBehaviorPDFBlob(
  filteredData: BehaviorRow[],
  typeFilter: "all" | "positive" | "negative" | "neutral",
  dateFrom: string,
  dateTo: string,
): Promise<{ blob: Blob; fileName: string }> {
  const { registerArabicFont, getArabicTableStyles, finalizePDFAsBlob } = await import("@/lib/arabic-pdf");
  const html2canvas = (await import("html2canvas")).default;
  const autoTableImport = await import("jspdf-autotable");
  const autoTable = autoTableImport.default;
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registerArabicFont(doc);
  const tableStyles = getArabicTableStyles();
  const pageWidth = doc.internal.pageSize.getWidth();
  let margin = 10;

  let startY = 5;
  let watermark: any = undefined;

  const [behaviorHeaderRes, defaultHeaderRes] = await Promise.all([
    supabase.from("site_settings").select("value").eq("id", "print_header_config_behavior").single(),
    supabase.from("site_settings").select("value").eq("id", "print_header_config").single(),
  ]);

  let headerConfig: any = null;
  for (const result of [behaviorHeaderRes, defaultHeaderRes]) {
    if (!result.data?.value) continue;
    try { headerConfig = JSON.parse(result.data.value); break; } catch { /* ignore */ }
  }

  if (headerConfig?.watermark?.enabled) watermark = headerConfig.watermark;

  const configMarginTop = headerConfig?.margins?.top ?? 10;
  const configMarginSide = headerConfig?.margins?.side ?? 12;
  startY = configMarginTop;
  margin = configMarginSide;

  if (headerConfig) {
    const headerHTML = `
      <div style="direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif;padding:4px ${configMarginSide}px 0;background:#fff;">
        ${buildHeaderHTML(headerConfig)}
      </div>
    `;

    const pxPerMm = 3.7795;
    const containerW = Math.round((pageWidth - configMarginSide * 2) * pxPerMm);
    const container = document.createElement("div");
    container.style.cssText = `position:fixed;left:-9999px;top:0;width:${containerW}px;background:#fff;`;
    container.innerHTML = headerHTML;
    document.body.appendChild(container);

    const imgs = container.querySelectorAll("img");
    await Promise.all(Array.from(imgs).map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })));

    try {
      const canvas = await html2canvas(container, { backgroundColor: "#ffffff", scale: 3, useCORS: true, allowTaint: true });
      const dataUrl = canvas.toDataURL("image/png");
      const aspect = canvas.width / canvas.height;
      const usableW = pageWidth - margin * 2;
      const imgH = usableW / aspect;
      doc.addImage(dataUrl, "PNG", margin, startY, usableW, imgH);
      startY = startY + imgH + 4;
    } catch { startY = 15; }

    document.body.removeChild(container);
  }

  doc.setFontSize(14);
  const filterTitle = typeFilter === "all" ? "تقرير السلوك" : `تقرير السلوك - ${TYPE_LABELS[typeFilter]}`;
  doc.text(filterTitle, pageWidth / 2, startY, { align: "center" });
  doc.setFontSize(9);
  doc.text(`من: ${dateFrom}  إلى: ${dateTo}`, pageWidth / 2, startY + 6, { align: "center" });

  const totalFiltered = filteredData.length;
  const summaryTypes = typeFilter === "all" ? (["positive", "neutral", "negative"] as const) : ([typeFilter] as const);
  const summaryData = summaryTypes.map((t) => ({
    type: t, label: TYPE_LABELS[t], count: filteredData.filter((r) => r.type === t).length,
  }));

  const summaryColorMap: Record<string, [number, number, number]> = {
    positive: [46, 125, 50], neutral: [249, 168, 37], negative: [198, 40, 40],
  };

  autoTable(doc, {
    startY: startY + 10,
    head: [summaryData.map((s) => s.label)],
    body: [summaryData.map((s) => `${s.count}`)],
    ...tableStyles,
    headStyles: { ...tableStyles.headStyles, fillColor: [240, 240, 240], textColor: [30, 30, 30], fontSize: 10 },
    bodyStyles: { ...tableStyles.bodyStyles, fontSize: 11, fontStyle: "bold", halign: "center" },
    columnStyles: Object.fromEntries(summaryData.map((s, i) => [i, { textColor: summaryColorMap[s.type] || [0, 0, 0] }])),
    theme: "grid",
    margin: { left: margin, right: margin },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`إجمالي السجلات: ${totalFiltered}`, pageWidth / 2, currentY, { align: "center" });
  doc.setTextColor(0, 0, 0);
  currentY += 8;

  const pdfTypeGroups = typeFilter === "all"
    ? [
        { type: "positive", label: "إيجابي", headerColor: [46, 125, 50] as [number, number, number], rowColor: [232, 245, 233] as [number, number, number] },
        { type: "neutral", label: "محايد", headerColor: [249, 168, 37] as [number, number, number], rowColor: [255, 249, 230] as [number, number, number] },
        { type: "negative", label: "سلبي", headerColor: [198, 40, 40] as [number, number, number], rowColor: [255, 235, 238] as [number, number, number] },
      ]
    : [{
        type: typeFilter,
        label: TYPE_LABELS[typeFilter],
        headerColor: (typeFilter === "positive" ? [46, 125, 50] : typeFilter === "negative" ? [198, 40, 40] : [249, 168, 37]) as [number, number, number],
        rowColor: (typeFilter === "positive" ? [232, 245, 233] : typeFilter === "negative" ? [255, 235, 238] : [255, 249, 230]) as [number, number, number],
      }];

  for (const group of pdfTypeGroups) {
    const rows = filteredData.filter((r) => r.type === group.type);
    if (rows.length === 0) continue;

    doc.setFontSize(12);
    doc.setTextColor(group.headerColor[0], group.headerColor[1], group.headerColor[2]);
    doc.text(`${group.label} (${rows.length})`, pageWidth / 2, currentY, { align: "center" });
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: currentY + 3,
      head: [["ملاحظات", "مستوى الخطورة", "التاريخ", "اسم الطالب", "#"]],
      body: rows.map((r, i) => [r.note, formatSeverity(r.severity), r.date, r.student_name, String(i + 1)]),
      ...tableStyles,
      headStyles: { ...tableStyles.headStyles, fillColor: group.headerColor },
      alternateRowStyles: { fillColor: group.rowColor },
      columnStyles: { 3: { halign: "right" } },
      margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Footer Signatures
  const footerConfig = headerConfig?.footerSignatures;
  if (footerConfig?.enabled && footerConfig.signatures?.length) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const sigCount = footerConfig.signatures.length;
    const sigWidth = (pageWidth - margin * 2) / sigCount;

    if (currentY + 40 > pageHeight - 15) { doc.addPage(); currentY = 20; }

    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    doc.setLineDashPattern([], 0);
    currentY += 10;

    footerConfig.signatures.forEach((sig: any, idx: number) => {
      const x = margin + sigWidth * idx + sigWidth / 2;
      doc.setFontSize(10); doc.setTextColor(30, 41, 59);
      doc.text(sig.label || "", x, currentY, { align: "center" });
      doc.setFontSize(9); doc.setTextColor(71, 85, 105);
      doc.text(sig.name || "........................", x, currentY + 6, { align: "center" });
      doc.setDrawColor(148, 163, 184);
      doc.line(x - 25, currentY + 18, x + 25, currentY + 18);
    });
  }

  const fileName = `تقرير_السلوك_${dateFrom}_${dateTo}.pdf`;
  const blob = finalizePDFAsBlob(doc, watermark, (headerConfig as any)?.advanced);
  return { blob, fileName };
}
