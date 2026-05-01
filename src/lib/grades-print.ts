/**
 * Unified WYSIWYG print & PDF export engine for grade pages.
 * Uses an isolated iframe — completely independent from index.css @media print.
 * Covers: Daily Entry, Classwork, Final Evaluation, Semester Summary.
 */
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { fetchHeaderConfig, fetchFooterConfig, buildHeaderHTML, buildFooterHTML, buildIframeCSS } from "@/lib/grades-print-helpers";

/* ──────────────────────────── Types ──────────────────────────── */

interface PrintOptions {
  orientation?: "portrait" | "landscape";
  title: string;
  subtitle?: string;
  reportType?: "attendance" | "grades" | "behavior" | "violations";
  tableHTML: string;
}

/* ──────────────────────────── Shared HTML builder ────────────── */

function buildFullHTML(
  orientation: string, title: string, subtitle: string | undefined,
  headerHTML: string, footerHTML: string, tableHTML: string,
  css: string, extraStyles?: string
): string {
  return `<!doctype html>
<html dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>${css}${extraStyles || ""}</style>
</head>
<body>
  <div class="print-root">
    <div class="content-area">
      ${headerHTML}
      <div class="title-section">
        <h2>${title}</h2>
        ${subtitle ? `<p>${subtitle}</p>` : ""}
      </div>
      ${tableHTML}
    </div>
    <div class="footer-spacer"></div>
    ${footerHTML}
  </div>
</body>
</html>`;
}

/* ──────────────────────────── Wait helpers ───────────────────── */

async function waitForFontsAndImages(doc: Document) {
  try {
    if ("fonts" in doc) await (doc as any).fonts.ready;
  } catch { /* skip */ }

  const images = Array.from(doc.images);
  if (images.length > 0) {
    await Promise.all(images.map(img =>
      img.complete ? Promise.resolve() : new Promise<void>(r => {
        img.addEventListener("load", () => r(), { once: true });
        img.addEventListener("error", () => r(), { once: true });
      })
    ));
  }
}

function autoScaleTable(doc: Document) {
  try {
    const table = doc.querySelector("table");
    const root = doc.querySelector(".print-root") as HTMLElement;
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
  } catch { /* skip */ }
}

/** Push footer-spacer so signatures start at ≥50% of page height */
function positionFooterAtMidPage(doc: Document, pageHeightPx: number) {
  try {
    const spacer = doc.querySelector(".footer-spacer") as HTMLElement;
    const contentArea = doc.querySelector(".content-area") as HTMLElement;
    if (!spacer || !contentArea) return;
    const contentBottom = contentArea.offsetTop + contentArea.offsetHeight;
    const midPage = pageHeightPx * 0.5;
    if (contentBottom < midPage) {
      spacer.style.height = `${midPage - contentBottom}px`;
    }
  } catch { /* skip */ }
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
  printDocument.write(buildFullHTML(orientation, title, subtitle, headerHTML, footerHTML, tableHTML, css));
  printDocument.close();

  await waitForFontsAndImages(printDocument);
  autoScaleTable(printDocument);
  const pageHpx = orientation === "landscape" ? 210 * 3.78 : 297 * 3.78;
  positionFooterAtMidPage(printDocument, pageHpx);

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

export async function exportGradesTableAsPDF(options: PrintOptions & { fileName?: string; returnBlob?: boolean }): Promise<Blob | void> {
  const { orientation = "landscape", title, subtitle, reportType = "grades", tableHTML, fileName } = options;

  const [headerConfig, footerConfig] = await Promise.all([
    fetchHeaderConfig(reportType),
    fetchFooterConfig(reportType),
  ]);

  const headerHTML = buildHeaderHTML(headerConfig);
  const footerHTML = buildFooterHTML(footerConfig);

  const isLandscape = orientation === "landscape";
  const pageWmm = isLandscape ? 297 : 210;
  const pageHmm = isLandscape ? 210 : 297;
  const contentWmm = pageWmm - 10;

  const pxPerMm = 3.78;
  const renderW = Math.round(contentWmm * pxPerMm);

  const css = buildIframeCSS(orientation, `${renderW}px`, `${renderW + 40}px`, `auto`);
  const extraStyles = `
    html, body { width: ${renderW}px !important; min-height: auto !important; }
    .print-root { width: ${renderW}px !important; max-width: ${renderW}px !important; padding: 8px 12px !important; }
  `;

  // Create offscreen container
  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed", left: "-9999px", top: "0",
    width: `${renderW + 40}px`, background: "#fff", zIndex: "-1",
  });
  document.body.appendChild(container);

  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    width: `${renderW + 40}px`, height: "2000px",
    border: "0", overflow: "visible",
  });
  container.appendChild(iframe);

  const iDoc = iframe.contentDocument;
  const iWin = iframe.contentWindow;
  if (!iDoc || !iWin) { container.remove(); return; }

  iDoc.open();
  iDoc.write(buildFullHTML(orientation, title, subtitle, headerHTML, footerHTML, tableHTML, css, extraStyles));
  iDoc.close();

  await waitForFontsAndImages(iDoc);
  autoScaleTable(iDoc);
  // Skip footer spacer for PDF export — it adds dead vertical space that confuses page slicing
  const spacerEl = iDoc.querySelector(".footer-spacer") as HTMLElement | null;
  if (spacerEl) spacerEl.style.height = "0px";

  // Force any overflow:hidden on print-root to be visible so capture sees full content
  const rootEl = iDoc.querySelector(".print-root") as HTMLElement;
  if (rootEl) rootEl.style.overflow = "visible";

  // Measure full content height after layout settles
  await new Promise(r => setTimeout(r, 100));
  const fullH = Math.max(
    iDoc.body.scrollHeight,
    iDoc.documentElement.scrollHeight,
    rootEl?.scrollHeight || 0,
  );
  iframe.style.height = `${fullH + 40}px`;

  await new Promise(r => setTimeout(r, 300));

  // Capture as PNG — use measured full height
  const captureH = Math.max(
    iDoc.body.scrollHeight,
    iDoc.documentElement.scrollHeight,
    rootEl.scrollHeight,
  );
  const captureW = rootEl.scrollWidth;
  let dataUrl: string;
  try {
    dataUrl = await toPng(rootEl, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      width: captureW,
      height: captureH,
      style: { overflow: "visible", height: `${captureH}px` },
    });
  } catch (err) {
    console.error("[grades-print] toPng failed:", err);
    container.remove();
    throw new Error("فشل في التقاط صورة الجدول");
  }

  container.remove();

  // Create PDF
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

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
    doc.addImage(dataUrl, "PNG", margin, margin, usableW, totalImgH);
  } else {
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

  const safeName = fileName || `${title.replace(/[^\u0600-\u06FFa-zA-Z0-9_\- ]/g, "_")}`;
  if (options.returnBlob) {
    return doc.output("blob");
  }
  // PWA-safe download (doc.save fails silently in installed PWA standalone mode)
  const { safeSavePDF } = await import("@/lib/download-utils");
  safeSavePDF(doc, `${safeName}.pdf`);
}

/** Build icon HTML for classwork/daily-entry print */
export function getPrintIconSpan(icon: { level: string; isFullScore: boolean }): string {
  if (icon.isFullScore) return '<span class="icon-star">☆</span>';
  if (icon.level === "excellent") return '<span class="icon-excellent">✔</span>';
  if (icon.level === "average") return '<span class="icon-average">➖</span>';
  return '<span class="icon-zero">✖</span>';
}
