import { safeDownload } from "@/lib/download-utils";

/**
 * Convert Arabic/non-ASCII filename to a safe ASCII-friendly name
 * while keeping it human-readable in the share sheet caption.
 */
function sanitizeFileName(name: string): string {
  const hasNonAscii = /[^\x00-\x7F]/.test(name);
  if (!hasNonAscii) return name;
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  return `report_${stamp}${ext}`;
}

function isMobile(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Share a PDF blob via WhatsApp.
 * - Mobile / supported desktop (Edge, Safari): Web Share API with file attachment
 * - Desktop fallback: download PDF + open WhatsApp Web (web.whatsapp.com) so user can attach manually
 *   (WhatsApp does not support pre-attaching files via URL — this is a platform limitation)
 */
export async function sharePDFViaWhatsApp(
  pdfBlob: Blob,
  fileName: string,
  caption?: string
): Promise<"shared" | "fallback"> {
  const safeFileName = sanitizeFileName(fileName);
  const pdfFile = new File([pdfBlob], safeFileName, { type: "application/pdf" });
  const captionText = caption || fileName.replace(".pdf", "");

  // 1) Try Web Share API with files (best UX — works on mobile + Edge/Safari desktop)
  if (
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [pdfFile] })
  ) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: captionText,
        text: captionText,
      });
      return "shared";
    } catch (err: any) {
      // AbortError = user cancelled — don't fall through to download
      if (err?.name === "AbortError") return "shared";
      // Other errors: fall through to download fallback
    }
  }

  // 2) Fallback: download the file first so user has it ready
  await safeDownload(pdfBlob, safeFileName);

  // 3) Open WhatsApp:
  //    - Mobile: wa.me opens the native app (user attaches from gallery/files)
  //    - Desktop: web.whatsapp.com opens WhatsApp Web where the user can drag/drop
  //      the just-downloaded PDF into a chat
  const encodedCaption = encodeURIComponent(`📋 ${captionText}`);
  const target = isMobile()
    ? `https://wa.me/?text=${encodedCaption}`
    : `https://web.whatsapp.com/send?text=${encodedCaption}`;

  // Small delay so the download dialog/notification appears before the new tab steals focus
  setTimeout(() => {
    window.open(target, "_blank", "noopener,noreferrer");
  }, 400);

  return "fallback";
}
