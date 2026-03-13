import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

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
 * Render the school print header into a PDF document.
 * Returns the Y position after the header for content to start.
 */
export async function renderPrintHeader(
  doc: jsPDF,
  reportType?: string
): Promise<number> {
  const config = await fetchPrintHeaderConfig(reportType);
  if (!config) return 15;

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;

  let currentY = 12;

  // === Layout: [Right Text] [Center Images] [Left Text] ===
  const sectionWidth = usableWidth / 3;

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

  // Use the max Y from both text sections
  const maxY = Math.max(currentY, leftY);

  // Draw separator line
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, maxY + 2, pageWidth - margin, maxY + 2);

  doc.setFont("Amiri", "normal");

  return maxY + 8;
}

/** Create a pre-configured Arabic PDF document with optional print header */
export async function createArabicPDF(
  options: {
    orientation?: "portrait" | "landscape";
    format?: string;
    reportType?: string;
    includeHeader?: boolean;
  } = {}
): Promise<{ doc: jsPDF; startY: number }> {
  const doc = new jsPDF({
    orientation: options.orientation || "portrait",
    unit: "mm",
    format: options.format || "a4",
  });

  await registerArabicFont(doc);

  let startY = 15;
  if (options.includeHeader !== false) {
    startY = await renderPrintHeader(doc, options.reportType);
  }

  return { doc, startY };
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
