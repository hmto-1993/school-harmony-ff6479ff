import { safeDownload } from "@/lib/download-utils";

/**
 * Convert Arabic/non-ASCII filename to a safe ASCII-friendly name
 * while keeping it human-readable in the share sheet caption.
 */
function sanitizeFileName(name: string): string {
  // Replace Arabic and other non-ASCII chars with transliterated or generic name
  const hasNonAscii = /[^\x00-\x7F]/.test(name);
  if (!hasNonAscii) return name;

  // Build a date-based safe filename
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  return `report_${stamp}${ext}`;
}

/**
 * Share a PDF blob via WhatsApp.
 * Uses Web Share API on supported devices, falls back to download + WhatsApp link.
 */
export async function sharePDFViaWhatsApp(
  pdfBlob: Blob,
  fileName: string,
  caption?: string
): Promise<"shared" | "fallback"> {
  const safeFileName = sanitizeFileName(fileName);
  const pdfFile = new File([pdfBlob], safeFileName, { type: "application/pdf" });

  // Try Web Share API first (best for mobile)
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: caption || fileName.replace(".pdf", ""),
        text: caption || fileName.replace(".pdf", ""),
      });
      return "shared";
    } catch {
      // User cancelled or share failed
    }
  }

  // Fallback: download PDF + open WhatsApp with caption
  await safeDownload(pdfBlob, safeFileName);
  const encodedCaption = encodeURIComponent(caption || `📋 ${fileName.replace(".pdf", "")}`);
  window.open(`https://wa.me/?text=${encodedCaption}`, "_blank");
  return "fallback";
}
