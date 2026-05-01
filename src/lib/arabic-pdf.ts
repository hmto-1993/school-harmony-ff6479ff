import jsPDF from "jspdf";
import { safeDownload } from "@/lib/download-utils";
import { getPrintOrientation } from "@/lib/print-utils";
import { resolveLogoSrc } from "@/lib/default-logos";
import { imageUrlToDataUrl } from "@/lib/pdf-image-utils";

const FONT_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf";
const FONT_BOLD_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Bold.ttf";

let fontCache: string | null = null;
let fontBoldCache: string | null = null;

interface SectionConfig {
  lines: string[];
  fontSize: number;
  align: "right" | "center" | "left";
  color?: string;
}

interface CenterSectionConfig {
  images: string[];
  imagesSizes: number[];
  imagesWidths?: number[];
}

interface WatermarkConfig {
  enabled: boolean;
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  angle: number;
  repeat: boolean;
}

interface MarginsConfig {
  top: number;
  side: number;
}

interface PrintHeaderConfig {
  rightSection: SectionConfig;
  centerSection: CenterSectionConfig;
  leftSection: SectionConfig;
  watermark?: WatermarkConfig;
  margins?: MarginsConfig;
}

async function fetchFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function registerArabicFont(doc: jsPDF): Promise<void> {
  if (!fontCache) {
    const [regular, bold] = await Promise.all([
      fetchFontAsBase64(FONT_URL),
      fetchFontAsBase64(FONT_BOLD_URL),
    ]);
    fontCache = regular;
    fontBoldCache = bold;
  }

  doc.addFileToVFS("Amiri-Regular.ttf", fontCache);
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");

  if (fontBoldCache) {
    doc.addFileToVFS("Amiri-Bold.ttf", fontBoldCache);
    doc.addFont("Amiri-Bold.ttf", "Amiri", "bold");
  }

  doc.setFont("Amiri");
}

/** Fetch print header config from site_settings (tenant-scoped). */
async function fetchPrintHeaderConfig(
  reportType?: string
): Promise<PrintHeaderConfig | null> {
  const { fetchScopedPrintHeader } = await import("@/lib/print-header-fetch");
  return (await fetchScopedPrintHeader(reportType)) as PrintHeaderConfig | null;
}

/** Rasterize any image (incl. SVG) to a PNG data URL via canvas */
async function rasterizeToPng(
  src: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width || 256;
        const h = img.naturalHeight || img.height || 256;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const dataUrl = canvas.toDataURL("image/png");
          resolve({ dataUrl, width: w, height: h });
        } catch {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Convert an image URL to base64 data URL plus its intrinsic size for PDF embedding */
async function imageUrlToBase64(
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  // Already a data URL — use directly
  if (url.startsWith("data:")) {
    const dims = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({
        width: img.naturalWidth || 1,
        height: img.naturalHeight || 1,
      });
      img.onerror = () => resolve(null);
      img.src = url;
    });
    if (url.includes("image/svg")) {
      const raster = await rasterizeToPng(url);
      if (raster) return raster;
    }
    return { dataUrl: url, width: dims?.width || 1, height: dims?.height || 1 };
  }

  const resolvedDataUrl = await imageUrlToDataUrl(url);
  if (resolvedDataUrl) {
    const isSvg = resolvedDataUrl.includes("image/svg") || url.toLowerCase().includes(".svg");
    if (isSvg) {
      const raster = await rasterizeToPng(resolvedDataUrl);
      if (raster) return raster;
    }
    const dims = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({
        width: img.naturalWidth || 1,
        height: img.naturalHeight || 1,
      });
      img.onerror = () => resolve(null);
      img.src = resolvedDataUrl;
    });
    if (dims) return { dataUrl: resolvedDataUrl, width: dims.width, height: dims.height };
  }

  // Try fetching as blob with CORS
  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (response.ok) {
      const blob = await response.blob();
      const isSvg = blob.type.includes("svg") || url.toLowerCase().endsWith(".svg");
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      if (dataUrl) {
        if (isSvg) {
          const raster = await rasterizeToPng(dataUrl);
          if (raster) return raster;
        }
        const dims = await new Promise<{ width: number; height: number } | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({
            width: img.naturalWidth || 1,
            height: img.naturalHeight || 1,
          });
          img.onerror = () => resolve(null);
          img.src = dataUrl;
        });
        if (dims) {
          return { dataUrl, width: dims.width, height: dims.height };
        }
      }
    }
  } catch {
    // fall through to canvas fallback
  }

  // Fallback: load via <img crossOrigin> + canvas (handles CORS-enabled hosts)
  return rasterizeToPng(url);
}

/**
 * Render print header from a pre-fetched config.
 */
async function renderPrintHeaderFromConfig(
  doc: jsPDF,
  config: PrintHeaderConfig
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerMargin = config.margins?.side ?? 12;
  const usableWidth = pageWidth - headerMargin * 2;

  const startY = config.margins?.top ?? 10;
  let rightY = startY;
  let leftY = startY;

  const pxToMm = 0.264583;
  const sectionGap = 12 * pxToMm;
  const centerImageGap = 8 * pxToMm;
  const paddingBottom = 6 * pxToMm;

  const centerImages = (config.centerSection.images || []).reduce<Array<{
    src: string;
    widthMm: number;
    heightMm: number;
  }>>((acc, src, index) => {
    const resolved = resolveLogoSrc(index, src);
    if (!resolved) return acc;
    const heightPx = config.centerSection.imagesSizes[index] || 60;
    const widthPx = config.centerSection.imagesWidths?.[index] ?? heightPx;
    acc.push({
      src: resolved,
      widthMm: widthPx * pxToMm,
      heightMm: heightPx * pxToMm,
    });
    return acc;
  }, []);

  const centerTrackWidth = centerImages.reduce((sum, image) => sum + image.widthMm, 0)
    + Math.max(centerImages.length - 1, 0) * centerImageGap;
  const sectionWidth = Math.max((usableWidth - centerTrackWidth - sectionGap * 2) / 2, 18);

  const wrapSectionLines = (lines: string[]) =>
    lines.map((line) => (line.trim() ? (doc.splitTextToSize(line, sectionWidth) as string[]) : []));

  const getMaxWrappedWidth = (wrappedLines: string[][]) =>
    wrappedLines.flat().reduce((max, segment) => Math.max(max, doc.getTextWidth(segment)), 0);

  const getAlignedAnchor = (
    blockStartX: number,
    blockWidth: number,
    align: "right" | "center" | "left"
  ): { anchorX: number; textAlign: "right" | "center" | "left" } => {
    if (align === "center") return { anchorX: blockStartX + blockWidth / 2, textAlign: "center" };
    if (align === "right") return { anchorX: blockStartX + blockWidth, textAlign: "right" };
    return { anchorX: blockStartX, textAlign: "left" };
  };

  // --- Right section text ---
  doc.setFont("Amiri", "bold");
  const rightFontPx = config.rightSection.fontSize || 12;
  const rightFontPt = rightFontPx * 0.75;
  doc.setFontSize(rightFontPt);
  const rightLineMm = rightFontPt * 0.3528;
  const rightSpacing = rightLineMm * 1.8;
  const rightAlign = (config.rightSection.align || "right") as "right" | "center" | "left";
  const rightWrappedLines = wrapSectionLines(config.rightSection.lines);
  const rightMaxW = getMaxWrappedWidth(rightWrappedLines);
  const rightBlockStartX = pageWidth - headerMargin - rightMaxW;
  const { anchorX: rightAnchorX, textAlign: rightJAlign } = getAlignedAnchor(rightBlockStartX, rightMaxW, rightAlign);

  rightWrappedLines.forEach((wrapped) => {
    wrapped.forEach((segment) => {
      doc.text(segment, rightAnchorX, rightY, { align: rightJAlign });
      rightY += rightSpacing;
    });
  });

  // --- Left section text ---
  const leftFontPx = config.leftSection.fontSize || 12;
  const leftFontPt = leftFontPx * 0.75;
  doc.setFontSize(leftFontPt);
  const leftLineMm = leftFontPt * 0.3528;
  const leftSpacing = leftLineMm * 1.8;
  const leftAlign = (config.leftSection.align || "left") as "right" | "center" | "left";
  const leftWrappedLines = wrapSectionLines(config.leftSection.lines);
  const leftMaxW = getMaxWrappedWidth(leftWrappedLines);
  const { anchorX: leftAnchorX, textAlign: leftJAlign } = getAlignedAnchor(headerMargin, leftMaxW, leftAlign);

  leftWrappedLines.forEach((wrapped) => {
    wrapped.forEach((segment) => {
      doc.text(segment, leftAnchorX, leftY, { align: leftJAlign });
      leftY += leftSpacing;
    });
  });

  const textMaxY = Math.max(rightY, leftY);
  const maxImageHeight = centerImages.reduce((max, image) => Math.max(max, image.heightMm), 0);
  const contentBottomY = Math.max(textMaxY, startY + maxImageHeight);

  // --- Center images (mirror the shared flex layout + preview contain sizing) ---
  if (centerImages.length > 0) {
    let imgX = pageWidth / 2 - centerTrackWidth / 2;

    for (const image of centerImages) {
      const slotY = Math.max(startY, 4);
      const loadedImage = await imageUrlToBase64(image.src);

      if (loadedImage) {
        try {
          const imageAspect = loadedImage.width / loadedImage.height;
          const slotAspect = image.widthMm / image.heightMm;

          let drawWidth = image.widthMm;
          let drawHeight = image.heightMm;

          if (imageAspect > slotAspect) {
            drawHeight = drawWidth / imageAspect;
          } else {
            drawWidth = drawHeight * imageAspect;
          }

          const drawX = imgX + (image.widthMm - drawWidth) / 2;
          const drawY = slotY + (image.heightMm - drawHeight) / 2;
          const imageFormat = loadedImage.dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";

          doc.addImage(loadedImage.dataUrl, imageFormat, drawX, drawY, drawWidth, drawHeight);
        } catch {
          // Skip if image fails
        }
      }

      imgX += image.widthMm + centerImageGap;
    }
  }

  // --- Blue bottom border ---
  const borderY = contentBottomY + paddingBottom;
  const borderWidthMm = ((config as any).margins?.borderWidth ?? 3) * pxToMm;
  const borderColorHex: string = (config as any).margins?.borderColor ?? "#3b82f6";
  const bR = parseInt(borderColorHex.slice(1, 3), 16);
  const bG = parseInt(borderColorHex.slice(3, 5), 16);
  const bB = parseInt(borderColorHex.slice(5, 7), 16);
  doc.setDrawColor(bR, bG, bB);
  doc.setLineWidth(borderWidthMm);
  doc.line(headerMargin, borderY, pageWidth - headerMargin, borderY);

  doc.setFont("Amiri", "normal");
  const bottomMargin = (config as any).margins?.borderBottomMargin ?? 8;
  return borderY + bottomMargin;
}

/**
 * Render the school print header into a PDF document.
 * Returns the Y position after the header for content to start.
 */
export async function renderPrintHeader(
  doc: jsPDF,
  reportType?: string
): Promise<number> {
  const config = await fetchPrintHeaderConfig(reportType);
  if (!config) return 15;
  return renderPrintHeaderFromConfig(doc, config);
}

/** Render watermark on all pages of the PDF */
export function renderWatermarkOnAllPages(doc: jsPDF, watermark: WatermarkConfig) {
  if (!watermark?.enabled || !watermark.text) return;
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.saveGraphicsState();
    
    // Parse hex color to RGB
    const hex = watermark.color || "#94a3b8";
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    doc.setTextColor(r, g, b);
    doc.setFontSize(watermark.fontSize || 48);
    doc.setFont("Amiri", "bold");
    // @ts-ignore - jsPDF supports GState
    const gState = new (doc as any).GState({ opacity: watermark.opacity || 0.1 });
    // @ts-ignore
    doc.setGState(gState);

    const angle = watermark.angle || -30;

    if (watermark.repeat) {
      // Tile watermark across the page
      const stepX = pageWidth * 0.45;
      const stepY = pageHeight * 0.25;
      for (let y = -pageHeight * 0.2; y < pageHeight * 1.2; y += stepY) {
        for (let x = -pageWidth * 0.2; x < pageWidth * 1.2; x += stepX) {
          doc.text(watermark.text, x, y, { angle, align: "center" });
        }
      }
    } else {
      // Single centered watermark
      doc.text(watermark.text, pageWidth / 2, pageHeight / 2, { angle, align: "center" });
    }

    doc.restoreGraphicsState();
  }
}

/** Advanced PDF config interface */
export interface AdvancedPDFConfig {
  paperSize?: "A4" | "A5" | "Letter" | "Legal";
  exportQuality?: "standard" | "high" | "max";
  pdfFontSize?: number;
  tableRowHeight?: number;
  showPageNumbers?: boolean;
  showDate?: boolean;
  showReportTitle?: boolean;
  headerOnEveryPage?: boolean;
  tableHeaderBg?: string;
  tableHeaderText?: string;
}

const PAPER_FORMATS: Record<string, string> = {
  A4: "a4",
  A5: "a5",
  Letter: "letter",
  Legal: "legal",
};

/** Create a pre-configured Arabic PDF document with optional print header */
export async function createArabicPDF(
  options: {
    orientation?: "portrait" | "landscape";
    format?: string;
    reportType?: string;
    includeHeader?: boolean;
  } = {}
): Promise<{ doc: jsPDF; startY: number; watermark?: WatermarkConfig; advanced?: AdvancedPDFConfig }> {
  // Fetch config once for header, watermark, and advanced
  const config = await fetchPrintHeaderConfig(options.reportType);
  const advanced: AdvancedPDFConfig = (config as any)?.advanced ?? {};

  const orientation = options.orientation || getPrintOrientation();
  const paperFormat = options.format || PAPER_FORMATS[advanced.paperSize || "A4"] || "a4";

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: paperFormat,
  });

  await registerArabicFont(doc);

  let startY = 15;
  let watermark: WatermarkConfig | undefined;

  if (options.includeHeader !== false && config) {
    startY = await renderPrintHeaderFromConfig(doc, config);
  }

  if (config?.watermark?.enabled) {
    watermark = config.watermark;
  }

  return { doc, startY, watermark, advanced };
}

/** Apply watermark to all pages and save the PDF */
/** Render page numbers and date on all pages */
function renderPageExtras(doc: jsPDF, advanced?: AdvancedPDFConfig) {
  if (!advanced) return;
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("Amiri", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);

    if (advanced.showPageNumbers) {
      doc.text(`${p} / ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: "center" });
    }

    if (advanced.showDate && p === 1) {
      const now = new Date();
      const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
      doc.text(dateStr, 10, pageHeight - 6, { align: "left" });
    }
  }
}

/** Apply watermark to all pages and save the PDF */
export function finalizePDF(doc: jsPDF, fileName: string, watermark?: WatermarkConfig, advanced?: AdvancedPDFConfig) {
  renderPageExtras(doc, advanced);
  if (watermark?.enabled) {
    renderWatermarkOnAllPages(doc, watermark);
  }
  const blob = doc.output("blob") as Blob;
  safeDownload(blob, fileName);
}

/** Apply watermark and return the blob without downloading */
export function finalizePDFAsBlob(doc: jsPDF, watermark?: WatermarkConfig, advanced?: AdvancedPDFConfig): Blob {
  renderPageExtras(doc, advanced);
  if (watermark?.enabled) {
    renderWatermarkOnAllPages(doc, watermark);
  }
  return doc.output("blob") as Blob;
}

/** Get autoTable styles pre-configured for Arabic font — accepts optional advanced config */
export function getArabicTableStyles(advanced?: AdvancedPDFConfig) {
  const fontSize = advanced?.pdfFontSize ? Math.round(advanced.pdfFontSize * 0.75) : 9;
  const cellPadding = advanced?.tableRowHeight ? Math.max(1.5, (advanced.tableRowHeight - 10) * 0.15) : 2.5;

  const hexToRgbTuple = (hex: string): [number, number, number] => {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };

  const headFill = advanced?.tableHeaderBg ? hexToRgbTuple(advanced.tableHeaderBg) : [239, 246, 255] as [number, number, number];
  const headText = advanced?.tableHeaderText ? hexToRgbTuple(advanced.tableHeaderText) : [30, 64, 175] as [number, number, number];

  return {
    styles: {
      font: "Amiri",
      halign: "center" as const,
      fontSize,
      cellPadding,
      lineColor: [203, 213, 225] as [number, number, number],
      lineWidth: 0.3,
      textColor: [30, 30, 30] as [number, number, number],
    },
    headStyles: {
      fillColor: headFill,
      textColor: headText,
      halign: "center" as const,
      fontStyle: "bold" as const,
      lineColor: [203, 213, 225] as [number, number, number],
      lineWidth: 0.3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] as [number, number, number],
    },
    bodyStyles: {
      fillColor: [255, 255, 255] as [number, number, number],
    },
  };
}
