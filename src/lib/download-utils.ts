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
 * Safe file download that works in PWA standalone mode on iOS/Android.
 * Falls back to navigator.share on mobile, then window.open, then anchor download.
 */
export async function safeDownload(blob: Blob, fileName: string) {
  // Try Web Share API (best for mobile PWA)
  if (isStandalone() && navigator.share && navigator.canShare) {
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

  // Try opening blob URL (works on iOS standalone)
  const url = URL.createObjectURL(blob);

  if (isStandalone()) {
    // On iOS standalone, <a download> doesn't work; use window.open
    const w = window.open(url, "_blank");
    if (w) {
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }
  }

  // Standard anchor download (works in normal browsers)
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
