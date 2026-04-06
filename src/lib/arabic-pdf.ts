import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { safeDownload } from "@/lib/download-utils";
import { getPrintOrientation } from "@/lib/print-utils";

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

/** Fetch print header config from site_settings */
async function fetchPrintHeaderConfig(
  reportType?: string
): Promise<PrintHeaderConfig | null> {
  // Try report-specific first
  if (reportType) {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", `print_header_config_${reportType}`)
      .single();
    if (data?.value) {
      try { return JSON.parse(data.value); } catch {}
    }
  }

  // Fallback to default
  const { data: def } = await supabase
    .from("site_settings")
    .select("value")
    .eq("id", "print_header_config")
    .single();
  if (def?.value) {
    try { return JSON.parse(def.value); } catch {}
  }

  return null;
}

/** Convert an image URL to base64 data URL for embedding in PDF */
async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Render print header from a pre-fetched config.
 */
async function renderPrintHeaderFromConfig(
  doc: jsPDF,
  config: PrintHeaderConfig
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const headerMargin = config.margins?.side ?? 8;
  const usableWidth = pageWidth - headerMargin * 2;
  const sectionWidth = usableWidth * 0.32;
  const centerWidth = usableWidth * 0.36;

  const startY = config.margins?.top ?? 10;
  let rightY = startY;
  let leftY = startY;

  // --- Right section text (anchored to the outer right edge) ---
  doc.setFont("Amiri", "bold");
  const rightFontPx = config.rightSection.fontSize || 12;
  const rightFontPt = rightFontPx * 0.75;
  doc.setFontSize(rightFontPt);
  const rightLineMm = rightFontPt * 0.3528;
  const rightSpacing = rightLineMm * 1.8;
  const rightAnchorX = pageWidth - headerMargin;

  config.rightSection.lines.forEach((line) => {
    if (line.trim()) {
      const wrapped = doc.splitTextToSize(line, sectionWidth);
      wrapped.forEach((wl: string) => {
        doc.text(wl, rightAnchorX, rightY, { align: "right" });
        rightY += rightSpacing;
      });
    }
  });

  // --- Left section text (anchored to the outer left edge) ---
  const leftFontPx = config.leftSection.fontSize || 12;
  const leftFontPt = leftFontPx * 0.75;
  doc.setFontSize(leftFontPt);
  const leftLineMm = leftFontPt * 0.3528;
  const leftSpacing = leftLineMm * 1.8;
  const leftAnchorX = headerMargin;

  config.leftSection.lines.forEach((line) => {
    if (line.trim()) {
      const wrapped = doc.splitTextToSize(line, sectionWidth);
      wrapped.forEach((wl: string) => {
        doc.text(wl, leftAnchorX, leftY, { align: "left" });
        leftY += leftSpacing;
      });
    }
  });

  const textMaxY = Math.max(rightY, leftY);
  const textHeight = textMaxY - startY;

  // --- Center images (constrained to center column) ---
  const images = config.centerSection.images.filter(Boolean);
  if (images.length > 0) {
    const centerX = pageWidth / 2;
    const pxToMm = 0.2646;
    const gap = 10 * pxToMm;

    // Limit image sizes to fit within center column
    const maxImgSize = Math.min(centerWidth * 0.8, 18);
    const imgHeights = images.map((_, i) => {
      const origIdx = config.centerSection.images.indexOf(images[i]);
      const sizePx = config.centerSection.imagesSizes[origIdx] || 60;
      return Math.min(sizePx * pxToMm, maxImgSize);
    });
    const imgWidths = images.map((_, i) => {
      const origIdx = config.centerSection.images.indexOf(images[i]);
      const widthPx = config.centerSection.imagesWidths?.[origIdx] ?? config.centerSection.imagesSizes[origIdx] ?? 60;
      return Math.min(widthPx * pxToMm, maxImgSize * 1.5);
    });

    const totalImgWidth = imgWidths.reduce((sum, s) => sum + s, 0) + gap * (images.length - 1);
    let imgX = centerX - totalImgWidth / 2;

    for (let i = 0; i < images.length; i++) {
      const wMm = imgWidths[i];
      const hMm = imgHeights[i];
      const imgY = startY + (textHeight - hMm) / 2;

      const base64 = await imageUrlToBase64(images[i]);
      if (base64) {
        try {
          doc.addImage(base64, "PNG", imgX, Math.max(imgY, 4), wMm, hMm);
        } catch {
          // Skip if image fails
        }
      }
      imgX += wMm + gap;
    }
  }

  // --- Blue bottom border ---
  const borderY = textMaxY + 1.6;
  const borderWidthMm = ((config as any).margins?.borderWidth ?? 3) * 0.264583; // px to mm
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
export function finalizePDF(doc: jsPDF, fileName: string, watermark?: WatermarkConfig) {
  if (watermark?.enabled) {
    renderWatermarkOnAllPages(doc, watermark);
  }
  const blob = doc.output("blob") as Blob;
  safeDownload(blob, fileName);
}

/** Apply watermark and return the blob without downloading */
export function finalizePDFAsBlob(doc: jsPDF, watermark?: WatermarkConfig): Blob {
  if (watermark?.enabled) {
    renderWatermarkOnAllPages(doc, watermark);
  }
  return doc.output("blob") as Blob;
}

/** Get autoTable styles pre-configured for Arabic font — matches grades-print.ts look */
export function getArabicTableStyles() {
  return {
    styles: {
      font: "Amiri",
      halign: "center" as const,
      fontSize: 9,
      cellPadding: 2.5,
      lineColor: [203, 213, 225] as [number, number, number],
      lineWidth: 0.3,
      textColor: [30, 30, 30] as [number, number, number],
    },
    headStyles: {
      fillColor: [239, 246, 255] as [number, number, number],
      textColor: [30, 64, 175] as [number, number, number],
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
