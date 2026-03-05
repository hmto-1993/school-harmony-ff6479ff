import jsPDF from "jspdf";

const FONT_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf";
const FONT_BOLD_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Bold.ttf";

let fontCache: string | null = null;
let fontBoldCache: string | null = null;

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

/** Reverse Arabic text for jsPDF (which doesn't handle RTL) */
export function reverseArabic(text: string): string {
  // Split by segments: Arabic vs non-Arabic
  // jsPDF renders LTR, so we reverse the character order of the full string
  return text.split("").reverse().join("");
}

/** Create a pre-configured Arabic PDF document */
export async function createArabicPDF(
  options: { orientation?: "portrait" | "landscape"; format?: string } = {}
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: options.orientation || "portrait",
    unit: "mm",
    format: options.format || "a4",
  });

  await registerArabicFont(doc);
  return doc;
}

/** Get autoTable styles pre-configured for Arabic font */
export function getArabicTableStyles() {
  return {
    styles: { font: "Amiri", halign: "center" as const, fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] as [number, number, number], halign: "center" as const, fontStyle: "bold" as const },
  };
}
