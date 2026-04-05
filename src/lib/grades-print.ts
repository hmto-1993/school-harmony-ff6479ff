/**
 * Unified WYSIWYG print & PDF export engine for grade pages.
 * Uses an isolated iframe — completely independent from index.css @media print.
 * Covers: Daily Entry, Classwork, Final Evaluation, Semester Summary.
 */
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

/* ──────────────────────────── Types ──────────────────────────── */

interface PrintOptions {
  orientation?: "portrait" | "landscape";
  title: string;
  subtitle?: string;
  reportType?: "attendance" | "grades" | "behavior";
  tableHTML: string;
}

/* ──────────────────────────── Config cache ───────────────────── */

const headerCache = new Map<string, { data: any; ts: number }>();
const footerCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(cache: Map<string, { data: any; ts: number }>, key: string): any | undefined {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return undefined;
}

/* ──────────────────────────── Data fetchers ──────────────────── */

async function fetchHeaderConfig(reportType = "grades"): Promise<any | null> {
  const cached = getCached(headerCache, reportType);
  if (cached !== undefined) return cached;
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", `print_header_config_${reportType}`)
      .single();
    if (data?.value) {
      try { const parsed = JSON.parse(data.value); headerCache.set(reportType, { data: parsed, ts: Date.now() }); return parsed; } catch { /* skip */ }
    }
    const { data: def } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", "print_header_config")
      .single();
    if (def?.value) {
      try { const parsed = JSON.parse(def.value); headerCache.set(reportType, { data: parsed, ts: Date.now() }); return parsed; } catch { /* skip */ }
    }
  } catch { /* skip */ }
  headerCache.set(reportType, { data: null, ts: Date.now() });
  return null;
}

async function fetchFooterConfig(reportType = "grades"): Promise<any | null> {
  const cached = getCached(footerCache, reportType);
  if (cached !== undefined) return cached;
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", `print_header_config_${reportType}`)
      .single();
    let config: any = null;
    if (data?.value) {
      try { config = JSON.parse(data.value); } catch { /* skip */ }
    }
    if (!config?.footerSignatures) {
      const { data: def } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", "print_header_config")
        .single();
      if (def?.value) {
        try { config = JSON.parse(def.value); } catch { /* skip */ }
      }
    }
    const result = config?.footerSignatures?.enabled ? config.footerSignatures : null;
    footerCache.set(reportType, { data: result, ts: Date.now() });
    return result;
  } catch { /* skip */ }
  footerCache.set(reportType, { data: null, ts: Date.now() });
  return null;
}

/* ──────────────────────────── HTML builders ──────────────────── */

function buildHeaderHTML(config: any): string {
  if (!config) return "";
  const rightLines = (config.rightSection?.lines || [])
    .map((line: string) => `<p style="margin:0;font-weight:600;">${line}</p>`)
    .join("");
  const leftLines = (config.leftSection?.lines || [])
    .map((line: string) => `<p style="margin:0;font-weight:600;">${line}</p>`)
    .join("");
  const images = (config.centerSection?.images || [])
    .map((img: string, i: number) => {
      if (!img) return "";
      const height = config.centerSection?.imagesSizes?.[i] || 60;
      const width = config.centerSection?.imagesWidths?.[i] ?? height;
      return `<img src="${img}" alt="" style="width:${width}px;height:${height}px;object-fit:contain;" />`;
    })
    .join("");

  return `
    <div style="margin-bottom:10px;padding-bottom:6px;border-bottom:3px solid #3b82f6;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
      <div style="max-width:40%;text-align:center;font-size:${config.rightSection?.fontSize || 12}px;line-height:1.8;color:${config.rightSection?.color || '#1e293b'};">
        ${rightLines}
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
        ${images}
      </div>
      <div style="max-width:40%;text-align:center;font-size:${config.leftSection?.fontSize || 12}px;line-height:1.8;color:${config.leftSection?.color || '#1e293b'};">
        ${leftLines}
      </div>
    </div>
  `;
}

function buildFooterHTML(signatures: any): string {
  if (!signatures?.enabled || !signatures.signatures?.length) return "";
  const sigs = signatures.signatures.map((sig: any) => `
    <div style="text-align:center;min-width:120px;">
      <p style="margin:0;font-size:11px;font-weight:600;color:#1e293b;">${sig.label || ""}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#475569;">${sig.name || "........................"}</p>
      <div style="margin-top:24px;border-bottom:1px solid #94a3b8;width:100px;margin-inline:auto;"></div>
    </div>
  `).join("");
  return `
    <div style="margin-top:24px;padding-top:16px;border-top:1px dashed #cbd5e1;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;direction:rtl;padding-inline:32px;">
        ${sigs}
      </div>
    </div>
  `;
}

/* ──────────────────────────── CSS for iframe ─────────────────── */

function buildIframeCSS(orientation: string, contentWidth: string, pageWidth: string, pageHeight: string): string {
  return `
    /* Page: first page flush, subsequent pages get a top margin */
    @page { size: A4 ${orientation}; margin: 5mm 0 0 0 !important; }
    @page :first { margin-top: 0 !important; }

    /* Reset everything */
    html, body {
      margin: 0; padding: 0; background: #fff; color: #1a1a1a;
      direction: rtl; width: 100%; min-height: 100%;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-family: 'IBM Plex Sans Arabic', sans-serif;
    }
    * {
      box-sizing: border-box;
      margin: 0; padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      transition: none !important;
      animation: none !important;
      box-shadow: none !important;
    }

    /* Print root container */
    .print-root {
      width: ${contentWidth};
      max-width: ${contentWidth};
      margin: 0 auto;
      padding: 3mm 5mm;
      overflow: hidden;
    }
    @media print {
      html, body { width: ${pageWidth}; min-height: ${pageHeight}; }
      .print-root { width: ${contentWidth}; max-width: ${contentWidth}; overflow: hidden; }
    }

    /* Table styles */
    table {
      width: 100%; border-collapse: collapse; table-layout: fixed;
      font-size: 10px; line-height: 1.4;
      contain: layout style;
    }
    th, td {
      padding: 4px 3px; border: 1px solid #cbd5e1;
      text-align: center; vertical-align: middle;
      overflow: hidden; word-wrap: break-word;
    }
    th {
      background: #eff6ff !important; font-weight: 700; color: #1e40af;
    }
    thead { display: table-header-group; }
    tr { break-inside: avoid-page; page-break-inside: avoid; }

    /* Index column (1st col) — bold */
    td:nth-child(1) { font-weight: 700; }

    /* Student name column (2nd col) — bold */
    td:nth-child(2) { text-align: right; white-space: normal; word-break: break-word; font-weight: 700; }
    th:nth-child(2) { text-align: right; }

    /* Alternating row colors */
    tbody tr:nth-child(even) { background: #f8fafc !important; }
    tbody tr:nth-child(odd) { background: #fff !important; }

    img { max-width: 100%; }

    /* Title section */
    .title-section { text-align: center; margin-bottom: 6px; }
    .title-section h2 { font-size: 14px; font-weight: bold; margin: 0 0 2px; }
    .title-section p { font-size: 11px; color: #666; margin: 0; }

    /* Subtotal cells */
    .subtotal-cell { background: #dbeafe !important; font-weight: 700; }
    .subtotal-header { background: #e0f2fe !important; }

    /* Grade icons */
    .icon-star { display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;color:#b8860b;font-size:13px;line-height:1; }
    .icon-excellent { display:inline-flex;align-items:center;justify-content:center;width:10px;height:10px;border-radius:9999px;border:1.5px solid #059669;background:transparent;color:#059669;font-size:7px;line-height:1;font-weight:700; }
    .icon-average { display:inline-flex;align-items:center;justify-content:center;width:10px;height:10px;border-radius:9999px;border:1.5px solid #d97706;background:transparent;color:#d97706;font-size:7px;line-height:1;font-weight:700; }
    .icon-zero { display:inline-flex;align-items:center;justify-content:center;width:10px;height:10px;border-radius:9999px;border:1.5px solid #e11d48;background:transparent;color:#e11d48;font-size:7px;line-height:1;font-weight:700; }
    .icons-cell { display:flex;flex-wrap:wrap;justify-content:center;gap:1px;min-height:10px; }

    /* Grade level colors */
    .grade-excellent { color: #059669; font-weight: 700; }
    .grade-very-good { color: #2563eb; font-weight: 700; }
    .grade-good { color: #0284c7; font-weight: 700; }
    .grade-acceptable { color: #d97706; font-weight: 700; }
    .grade-weak { color: #e11d48; font-weight: 700; }
  `;
}

/* ──────────────────────────── Main print function ────────────── */

export async function printGradesTable(options: PrintOptions): Promise<void> {
  const { orientation = "landscape", title, subtitle, reportType = "grades", tableHTML } = options;

  const [headerConfig, footerConfig] = await Promise.all([
    fetchHeaderConfig(reportType),
    fetchFooterConfig(reportType),
  ]);

  const headerHTML = buildHeaderHTML(headerConfig);
  const footerHTML = buildFooterHTML(footerConfig);

  const contentWidth = orientation === "landscape" ? "287mm" : "200mm";
  const pageWidth = orientation === "landscape" ? "297mm" : "210mm";
  const pageHeight = orientation === "landscape" ? "210mm" : "297mm";

  const css = buildIframeCSS(orientation, contentWidth, pageWidth, pageHeight);

  // Create hidden iframe
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed", width: "0", height: "0", opacity: "0",
    pointerEvents: "none", border: "0", bottom: "0", right: "0",
  });
  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;
  const printDocument = iframe.contentDocument;
  if (!printWindow || !printDocument) {
    iframe.remove();
    return;
  }

  printDocument.open();
  printDocument.write(`<!doctype html>
<html dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <div class="print-root">
    ${headerHTML}
    <div class="title-section">
      <h2>${title}</h2>
      ${subtitle ? `<p>${subtitle}</p>` : ""}
    </div>
    ${tableHTML}
    ${footerHTML}
  </div>
</body>
</html>`);
  printDocument.close();

  // Wait for fonts
  try {
    if ("fonts" in printDocument) {
      await (printDocument as any).fonts.ready;
    }
  } catch { /* skip */ }

  // Wait for images
  const images = Array.from(printDocument.images);
  if (images.length > 0) {
    await Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            })
      )
    );
  }

  // Auto-scale: shrink font if table overflows container
  try {
    const table = printDocument.querySelector("table");
    const root = printDocument.querySelector(".print-root") as HTMLElement;
    if (table && root) {
      const containerW = root.offsetWidth;
      const tableW = table.scrollWidth;
      if (tableW > containerW) {
        const scale = Math.max(0.55, containerW / tableW);
        const baseFontSize = 10 * scale;
        table.style.fontSize = `${baseFontSize}px`;
        const newTableW = table.scrollWidth;
        if (newTableW > containerW) {
          const scale2 = Math.max(0.5, containerW / newTableW);
          table.style.fontSize = `${baseFontSize * scale2}px`;
        }
      }
    }
  } catch { /* skip */ }

  // Print and cleanup
  await new Promise<void>((resolve) => {
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      printWindow.removeEventListener("afterprint", onAfterPrint);
      clearTimeout(fallback);
      iframe.remove();
      resolve();
    };
    const onAfterPrint = () => cleanup();
    printWindow.addEventListener("afterprint", onAfterPrint);
    const fallback = setTimeout(cleanup, 60_000);
    requestAnimationFrame(() => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 200);
    });
  });
}

/* ──────────────────────────── PDF Export ─────────────────────── */

export async function exportGradesTableAsPDF(options: PrintOptions & { fileName?: string }): Promise<void> {
  const { orientation = "landscape", title, subtitle, reportType = "grades", tableHTML, fileName } = options;

  const [headerConfig, footerConfig] = await Promise.all([
    fetchHeaderConfig(reportType),
    fetchFooterConfig(reportType),
  ]);

  const headerHTML = buildHeaderHTML(headerConfig);
  const footerHTML = buildFooterHTML(footerConfig);

  // Use mm-based widths for A4
  const isLandscape = orientation === "landscape";
  const pageWmm = isLandscape ? 297 : 210;
  const pageHmm = isLandscape ? 210 : 297;
  const contentWmm = pageWmm - 10; // 5mm margins each side

  // Render width in pixels (96dpi → ~3.78 px/mm)
  const pxPerMm = 3.78;
  const renderW = Math.round(contentWmm * pxPerMm);

  const css = buildIframeCSS(orientation, `${renderW}px`, `${renderW + 40}px`, `auto`);

  // Create offscreen container
  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed", left: "-9999px", top: "0",
    width: `${renderW + 40}px`, background: "#fff", zIndex: "-1",
  });
  document.body.appendChild(container);

  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    width: `${renderW + 40}px`, height: "auto",
    border: "0", overflow: "hidden",
  });
  container.appendChild(iframe);

  const iDoc = iframe.contentDocument;
  const iWin = iframe.contentWindow;
  if (!iDoc || !iWin) { container.remove(); return; }

  iDoc.open();
  iDoc.write(`<!doctype html>
<html dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${css}
    /* Override page-based rules for capture */
    html, body { width: ${renderW}px !important; min-height: auto !important; }
    .print-root { width: ${renderW}px !important; max-width: ${renderW}px !important; padding: 8px 12px !important; }
  </style>
</head>
<body>
  <div class="print-root">
    ${headerHTML}
    <div class="title-section">
      <h2>${title}</h2>
      ${subtitle ? `<p>${subtitle}</p>` : ""}
    </div>
    ${tableHTML}
    ${footerHTML}
  </div>
</body>
</html>`);
  iDoc.close();

  // Wait for fonts
  try { if ("fonts" in iDoc) await (iDoc as any).fonts.ready; } catch {}

  // Wait for images
  const images = Array.from(iDoc.images);
  if (images.length > 0) {
    await Promise.all(images.map(img =>
      img.complete ? Promise.resolve() : new Promise<void>(r => {
        img.addEventListener("load", () => r(), { once: true });
        img.addEventListener("error", () => r(), { once: true });
      })
    ));
  }

  // Auto-scale table font if needed
  try {
    const table = iDoc.querySelector("table");
    const root = iDoc.querySelector(".print-root") as HTMLElement;
    if (table && root) {
      const cW = root.offsetWidth;
      const tW = table.scrollWidth;
      if (tW > cW) {
        const s = Math.max(0.55, cW / tW);
        table.style.fontSize = `${10 * s}px`;
        const tW2 = table.scrollWidth;
        if (tW2 > cW) table.style.fontSize = `${10 * s * Math.max(0.5, cW / tW2)}px`;
      }
    }
  } catch {}

  // Resize iframe to content height
  const body = iDoc.body;
  const contentH = body.scrollHeight;
  iframe.style.height = `${contentH + 20}px`;

  // Small delay to ensure rendering
  await new Promise(r => setTimeout(r, 300));

  // Capture as PNG
  const root = iDoc.querySelector(".print-root") as HTMLElement;
  let dataUrl: string;
  try {
    dataUrl = await toPng(root, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      width: root.scrollWidth,
      height: root.scrollHeight,
    });
  } catch {
    container.remove();
    throw new Error("فشل في التقاط صورة الجدول");
  }

  container.remove();

  // Create PDF
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  // Load image dimensions
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("فشل تحميل الصورة"));
    img.src = dataUrl;
  });

  const imgAspect = img.width / img.height;
  const margin = 5;
  const usableW = pageWmm - margin * 2;
  const totalImgH = usableW / imgAspect;
  const usableH = pageHmm - margin * 2;

  if (totalImgH <= usableH) {
    // Fits on one page
    doc.addImage(dataUrl, "PNG", margin, margin, usableW, totalImgH);
  } else {
    // Multi-page: slice the image
    const pxPerMmImg = img.width / usableW;
    let srcY = 0;
    let pageIdx = 0;

    while (srcY < img.height - 1) {
      const sliceHpx = Math.min(usableH * pxPerMmImg, img.height - srcY);
      if (sliceHpx <= 1) break;

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = img.width;
      sliceCanvas.height = Math.ceil(sliceHpx);
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(img, 0, srcY, img.width, sliceHpx, 0, 0, img.width, sliceHpx);

      if (pageIdx > 0) doc.addPage("a4", orientation);
      const sliceHmm = sliceHpx / pxPerMmImg;
      doc.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, usableW, sliceHmm);

      srcY += sliceHpx;
      pageIdx++;
    }
  }

  // Download
  const safeName = fileName || `${title.replace(/[^\u0600-\u06FFa-zA-Z0-9_\- ]/g, "_")}`;
  doc.save(`${safeName}.pdf`);
}



/** Build icon HTML for classwork/daily-entry print */
export function getPrintIconSpan(icon: { level: string; isFullScore: boolean }): string {
  if (icon.isFullScore) return '<span class="icon-star">☆</span>';
  if (icon.level === "excellent") return '<span class="icon-excellent">✔</span>';
  if (icon.level === "average") return '<span class="icon-average">➖</span>';
  return '<span class="icon-zero">✖</span>';
}
