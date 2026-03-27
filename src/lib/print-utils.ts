/**
 * Clone-based print utility.
 * Clones all .print-area elements into a body-level #print-container,
 * hides #root via CSS, prints, then cleans up.
 */

type PrintCleanup = () => void;

let activePrintCleanup: PrintCleanup | null = null;
const DEFAULT_PRINT_SELECTOR = ".print-area, #absence-print-area";

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
    setTimeout(() => {
      window.print();
    }, 150);
  });
}
