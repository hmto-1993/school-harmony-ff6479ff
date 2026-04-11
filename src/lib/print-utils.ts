/**
 * Clone-based print utility.
 * Clones all .print-area elements into a body-level #print-container,
 * hides #root via CSS, prints, then cleans up.
 */

type PrintCleanup = () => void;
type PrintOrientation = "portrait" | "landscape";

let activePrintCleanup: PrintCleanup | null = null;
const DEFAULT_PRINT_SELECTOR = ".print-area, #absence-print-area";

async function waitForDocumentAssets(doc: Document): Promise<void> {
  if ("fonts" in doc) {
    try {
      await (doc as Document & { fonts: FontFaceSet }).fonts.ready;
    } catch {
      // Ignore font readiness failures
    }
  }

  const images = Array.from(doc.images);
  if (images.length === 0) return;

  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          })
    )
  );
}

/** Get stored print orientation preference */
export function getPrintOrientation(): "portrait" | "landscape" {
  return (localStorage.getItem("print-orientation") as "portrait" | "landscape") || "portrait";
}

/** Set print orientation preference */
export function setPrintOrientation(orientation: "portrait" | "landscape") {
  localStorage.setItem("print-orientation", orientation);
}

export function safePrint(
  targetOrCleanup?: string | PrintCleanup,
  maybeCleanup?: PrintCleanup,
): void {
  const selector = typeof targetOrCleanup === "string" ? targetOrCleanup : DEFAULT_PRINT_SELECTOR;
  const onCleanup = typeof targetOrCleanup === "function" ? targetOrCleanup : maybeCleanup;

  activePrintCleanup = onCleanup ?? null;

  // Remove any leftover container
  document.getElementById("print-container")?.remove();

  // Apply orientation class
  const orientation = getPrintOrientation();
  if (orientation === "landscape") {
    document.body.classList.add("print-landscape");
  } else {
    document.body.classList.remove("print-landscape");
  }

  // Clone all print areas into a body-level container
  const printAreas = document.querySelectorAll(selector);
  if (printAreas.length === 0) {
    activePrintCleanup = null;
    return;
  }
  const container = document.createElement("div");
  container.id = "print-container";

  const appDir =
    document.documentElement.getAttribute("dir") ||
    document.body.getAttribute("dir") ||
    "rtl";
  container.setAttribute("dir", appDir);
  container.style.direction = appDir;

  printAreas.forEach((area) => {
    const clone = area.cloneNode(true) as HTMLElement;
    const areaDir =
      (area as HTMLElement).closest("[dir]")?.getAttribute("dir") || appDir;

    // Keep the same reading direction as the source view
    clone.setAttribute("dir", areaDir);
    clone.style.direction = areaDir;

    // Unhide elements that are hidden but should show in print
    clone.classList.remove("hidden");
    clone.style.display = "block";
    clone.style.visibility = "visible";

    // Also unhide print:block children
    clone.querySelectorAll(".hidden").forEach((el) => {
      if (el.classList.contains("print:block") || el.classList.contains("print-watermark")) {
        (el as HTMLElement).style.display = "block";
        (el as HTMLElement).style.visibility = "visible";
        el.classList.remove("hidden");
      }
    });

    // Remove no-print / print:hidden elements from clone
    clone.querySelectorAll(".no-print, .print\\:hidden, [class*='print:hidden']").forEach((el) => {
      el.remove();
    });

    container.appendChild(clone);
  });

  document.body.appendChild(container);

  // Push footer signatures to at least 50% of page height
  positionPrintFooterAtMidPage(container, orientation);

  const cleanup = () => {
    container.remove();
    document.body.classList.remove("print-landscape");
    if (activePrintCleanup) {
      activePrintCleanup();
      activePrintCleanup = null;
    }
  };

  const handleAfterPrint = () => {
    window.removeEventListener("afterprint", handleAfterPrint);
    clearTimeout(fallbackTimeout);
    cleanup();
  };

  window.addEventListener("afterprint", handleAfterPrint);

  const fallbackTimeout = setTimeout(() => {
    window.removeEventListener("afterprint", handleAfterPrint);
    cleanup();
  }, 60_000);

  requestAnimationFrame(() => {
    window.print();
  });
}

export async function printNodeInIframe(
  node: HTMLElement,
  options?: {
    orientation?: PrintOrientation;
    extraStyles?: string;
    onCleanup?: PrintCleanup;
  },
): Promise<void> {
  const orientation = options?.orientation ?? getPrintOrientation();
  const pageWidth = orientation === "landscape" ? "297mm" : "210mm";
  const pageHeight = orientation === "landscape" ? "210mm" : "297mm";
  const contentWidth = orientation === "landscape" ? "285mm" : "198mm";
  const contentMinHeight = orientation === "landscape" ? "198mm" : "285mm";
  const pageName = orientation === "landscape" ? "print-landscape-sheet" : "print-portrait-sheet";
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "0";
  iframe.style.bottom = "0";
  iframe.style.right = "0";

  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;
  const printDocument = iframe.contentDocument;
  if (!printWindow || !printDocument) {
    iframe.remove();
    options?.onCleanup?.();
    return;
  }

  printDocument.open();
  printDocument.write(`<!doctype html>
<html dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>Print</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
      @page { size: A4 ${orientation}; margin: 0mm 6mm 6mm 6mm; }
      @page ${pageName} { size: A4 ${orientation}; margin: 0mm 6mm 6mm 6mm; }
      html, body {
        margin: 0;
        padding: 0;
        background: #fff;
        color: #1a1a1a;
        direction: rtl;
        width: 100%;
        min-height: 100%;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body {
        font-family: 'IBM Plex Sans Arabic', sans-serif;
        overflow: visible;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .print-root {
        page: ${pageName};
        width: ${contentWidth};
        max-width: ${contentWidth};
        min-height: ${contentMinHeight};
        margin: 0 auto;
        overflow: visible;
      }
      @media print {
        html, body {
          width: ${pageWidth};
          min-height: ${pageHeight};
        }
        .print-root {
          width: ${contentWidth};
          max-width: ${contentWidth};
          min-height: ${contentMinHeight};
        }
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      img {
        max-width: 100%;
      }
      svg {
        overflow: visible;
      }
      ${options?.extraStyles ?? ""}
    </style>
  </head>
  <body></body>
</html>`);
  printDocument.close();

  const clone = node.cloneNode(true) as HTMLElement;
  const root = printDocument.createElement("div");
  root.className = "print-root";
  root.appendChild(clone);
  printDocument.body.appendChild(root);

  await waitForDocumentAssets(printDocument);

  await new Promise<void>((resolve) => {
    let done = false;

    const cleanup = () => {
      if (done) return;
      done = true;
      printWindow.removeEventListener("afterprint", handleAfterPrint);
      clearTimeout(fallbackTimeout);
      iframe.remove();
      options?.onCleanup?.();
      resolve();
    };

    const handleAfterPrint = () => {
      cleanup();
    };

    printWindow.addEventListener("afterprint", handleAfterPrint);

    const fallbackTimeout = setTimeout(() => {
      cleanup();
    }, 60_000);

    requestAnimationFrame(() => {
      printWindow.focus();
      printWindow.print();
    });
  });
}
