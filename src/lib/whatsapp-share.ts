import { safeDownload } from "@/lib/download-utils";

/**
 * Share a PDF blob via WhatsApp.
 * Uses Web Share API on supported devices, falls back to download + WhatsApp link.
 */
export async function sharePDFViaWhatsApp(
  pdfBlob: Blob,
  fileName: string,
  caption?: string
): Promise<"shared" | "fallback"> {
  const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

  // Try Web Share API first (best for mobile)
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: fileName.replace(".pdf", ""),
        text: caption || fileName.replace(".pdf", ""),
      });
      return "shared";
    } catch {
      // User cancelled or share failed
    }
  }

  // Fallback: download PDF + open WhatsApp with caption
  await safeDownload(pdfBlob, fileName);
  const encodedCaption = encodeURIComponent(caption || `📋 ${fileName.replace(".pdf", "")}`);
  window.open(`https://wa.me/?text=${encodedCaption}`, "_blank");
  return "fallback";
}
