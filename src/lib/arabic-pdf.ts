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

interface PrintHeaderConfig {
  rightSection: SectionConfig;
  centerSection: CenterSectionConfig;
  leftSection: SectionConfig;
  watermark?: WatermarkConfig;
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
  const margin = 14;

  let currentY = 12;

  // --- Right section text ---
  doc.setFont("Amiri", "bold");
  const rightFontSize = Math.min(config.rightSection.fontSize || 12, 14);
  doc.setFontSize(rightFontSize);

  const rightX = pageWidth - margin;
  config.rightSection.lines.forEach((line) => {
    if (line.trim()) {
      doc.text(line, rightX, currentY, { align: "right" });
      currentY += rightFontSize * 0.45;
    }
  });

  // --- Left section text ---
  let leftY = 12;
  const leftFontSize = Math.min(config.leftSection.fontSize || 12, 14);
  doc.setFontSize(leftFontSize);

  config.leftSection.lines.forEach((line) => {
    if (line.trim()) {
      doc.text(line, margin, leftY, { align: "left" });
      leftY += leftFontSize * 0.45;
    }
  });

  // --- Center images ---
  const images = config.centerSection.images.filter(Boolean);
  if (images.length > 0) {
    const centerX = pageWidth / 2;
    const totalImgWidth = images.reduce((sum, _, i) => {
      const size = (config.centerSection.imagesSizes[i] || 60) * 0.3;
      return sum + size + 2;
    }, -2);

    let imgX = centerX - totalImgWidth / 2;

    for (let i = 0; i < images.length; i++) {
      const imgUrl = images[i];
      const sizePx = config.centerSection.imagesSizes[
        config.centerSection.images.indexOf(imgUrl)
      ] || 60;
      const sizeMm = sizePx * 0.3;

      const base64 = await imageUrlToBase64(imgUrl);
      if (base64) {
        try {
          doc.addImage(base64, "PNG", imgX, 6, sizeMm, sizeMm);
        } catch {
          // Skip if image fails
        }
      }
      imgX += sizeMm + 2;
    }
  }

  const maxY = Math.max(currentY, leftY);

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, maxY + 2, pageWidth - margin, maxY + 2);

  doc.setFont("Amiri", "normal");

  return maxY + 8;
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
    
    // Parse hex color to RGB and blend with white using opacity to simulate transparency
    const hex = watermark.color || "#94a3b8";
    const opacity = watermark.opacity || 0.1;
    const r = Math.round(255 * (1 - opacity) + parseInt(hex.slice(1, 3), 16) * opacity);
    const g = Math.round(255 * (1 - opacity) + parseInt(hex.slice(3, 5), 16) * opacity);
    const b = Math.round(255 * (1 - opacity) + parseInt(hex.slice(5, 7), 16) * opacity);
    
    doc.setTextColor(r, g, b);
    doc.setFontSize(watermark.fontSize || 48);
    doc.setFont("Amiri", "bold");

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

    doc.setTextColor(0, 0, 0);
    doc.setFont("Amiri", "normal");
}

/** Create a pre-configured Arabic PDF document with optional print header */
export async function createArabicPDF(
  options: {
    orientation?: "portrait" | "landscape";
    format?: string;
    reportType?: string;
    includeHeader?: boolean;
  } = {}
): Promise<{ doc: jsPDF; startY: number; watermark?: WatermarkConfig }> {
  const orientation = options.orientation || getPrintOrientation();
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: options.format || "a4",
  });

  await registerArabicFont(doc);

  let startY = 15;
  let watermark: WatermarkConfig | undefined;

  // Fetch config once for both header and watermark
  const config = await fetchPrintHeaderConfig(options.reportType);

  if (options.includeHeader !== false && config) {
    startY = await renderPrintHeaderFromConfig(doc, config);
  }

  if (config?.watermark?.enabled) {
    watermark = config.watermark;
  }

  return { doc, startY, watermark };
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

/** Get autoTable styles pre-configured for Arabic font */
export function getArabicTableStyles() {
  return {
    styles: { font: "Amiri", halign: "center" as const, fontSize: 9 },
    headStyles: {
      fillColor: [59, 130, 246] as [number, number, number],
      halign: "center" as const,
      fontStyle: "bold" as const,
    },
  };
}
