import * as XLSX from "xlsx";

/**
 * Detect if running as installed PWA (standalone mode)
 */
function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

/**
 * Detect mobile vs desktop
 */
function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Safe file download that works in PWA standalone mode on iOS/Android/Desktop.
 * Strategy:
 * - Desktop PWA: open blob in new browser tab so user can view/save
 * - Mobile PWA: try Web Share API first, then window.open
 * - Normal browser: standard anchor download
 */
export async function safeDownload(blob: Blob, fileName: string) {
  const standalone = isStandalone();
  const mobile = isMobileDevice();

  // Mobile PWA: try Web Share API first (best UX on mobile)
  if (standalone && mobile && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        return;
      }
    } catch {
      // User cancelled or share failed, fall through
    }
  }

  const url = URL.createObjectURL(blob);

  // Desktop PWA: anchor download often silently fails in standalone window.
  // Open in a real browser tab so the user can view/save the file.
  if (standalone && !mobile) {
    // Try window.open first – this opens in the default browser outside the PWA shell
    const w = window.open(url, "_blank");
    if (w) {
      setTimeout(() => URL.revokeObjectURL(url), 120000);
      return;
    }
    // If window.open was blocked, fall through to anchor
  }

  // Normal browser: standard anchor download
  if (!standalone) {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }

  // Mobile standalone fallback: window.open for iOS
  const w = window.open(url, "_blank");
  if (w) {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }

  // Final fallback: anchor
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Safe XLSX export - replaces XLSX.writeFile for PWA compatibility
 */
export function safeWriteXLSX(wb: XLSX.WorkBook, fileName: string) {
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  safeDownload(blob, fileName);
}

/**
 * Safe jsPDF save - replaces doc.save for PWA compatibility
 */
export function safeSavePDF(doc: any, fileName: string) {
  const blob = doc.output("blob") as Blob;
  safeDownload(blob, fileName);
}
