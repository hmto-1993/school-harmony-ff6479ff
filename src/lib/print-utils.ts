/**
 * Async print utility that prevents UI freeze and handles cleanup.
 * - Runs print asynchronously via requestAnimationFrame
 * - Listens for afterprint to clean up overlay state
 * - Shows a recovery "back" button on mobile after print completes
 */

type PrintCleanup = () => void;

let activePrintCleanup: PrintCleanup | null = null;

export function safePrint(onCleanup?: PrintCleanup): void {
  activePrintCleanup = onCleanup ?? null;

  const handleAfterPrint = () => {
    window.removeEventListener("afterprint", handleAfterPrint);
    performCleanup();
  };
  window.removeEventListener("afterprint", handleAfterPrint);
  window.addEventListener("afterprint", handleAfterPrint);

  const fallbackTimeout = setTimeout(() => {
    window.removeEventListener("afterprint", handleAfterPrint);
    performCleanup();
  }, 60_000);

  const originalCleanup = activePrintCleanup;
  activePrintCleanup = () => {
    clearTimeout(fallbackTimeout);
    originalCleanup?.();
  };

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
}
