/**
 * Async print utility that prevents UI freeze and handles cleanup.
 * - Runs print asynchronously via requestAnimationFrame
 * - Listens for afterprint to clean up overlay state
 * - Clears cached print data on completion
 */

type PrintCleanup = () => void;

let activePrintCleanup: PrintCleanup | null = null;

export function safePrint(onCleanup?: PrintCleanup): void {
  // Store cleanup callback
  activePrintCleanup = onCleanup ?? null;

  // Attach one-time afterprint listener for cleanup
  const handleAfterPrint = () => {
    window.removeEventListener("afterprint", handleAfterPrint);
    performCleanup();
  };
  window.removeEventListener("afterprint", handleAfterPrint);
  window.addEventListener("afterprint", handleAfterPrint);

  // Also set a fallback timeout for browsers that don't fire afterprint reliably (some mobile)
  const fallbackTimeout = setTimeout(() => {
    window.removeEventListener("afterprint", handleAfterPrint);
    performCleanup();
  }, 60_000); // 60s max

  // Override cleanup to also clear timeout
  const originalCleanup = activePrintCleanup;
  activePrintCleanup = () => {
    clearTimeout(fallbackTimeout);
    originalCleanup?.();
  };

  // Use rAF + microtask to yield to the browser before blocking with print()
  requestAnimationFrame(() => {
    setTimeout(() => {
      window.print();
    }, 100);
  });
}

function performCleanup() {
  if (activePrintCleanup) {
    activePrintCleanup();
    activePrintCleanup = null;
  }
  // Free any heavy cached images from memory
  if (typeof globalThis.gc === "function") {
    try { globalThis.gc(); } catch {}
  }
}
