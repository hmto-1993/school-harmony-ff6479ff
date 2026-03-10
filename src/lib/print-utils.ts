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
    showRecoveryButton();
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

/**
 * Shows a floating recovery button after print to help mobile users
 * navigate back if the screen stays blank.
 */
function showRecoveryButton() {
  // Don't duplicate
  const existing = document.getElementById("post-print-back-btn");
  if (existing) return;

  const backBtn = document.createElement("button");
  backBtn.id = "post-print-back-btn";
  backBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="m15 18-6-6 6-6"/></svg> العودة`;
  backBtn.style.cssText = `
    position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;
    display:flex;align-items:center;gap:6px;
    padding:12px 28px;border:none;border-radius:12px;
    background:#f97316;color:white;font-size:16px;font-weight:700;
    font-family:'IBM Plex Sans Arabic',sans-serif;
    box-shadow:0 4px 20px rgba(0,0,0,0.25);cursor:pointer;
    animation:fadeInBtn 0.3s ease;
  `;

  let style = document.getElementById("post-print-back-btn-style") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "post-print-back-btn-style";
    style.textContent = `
      @keyframes fadeInBtn { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      @media print { #post-print-back-btn, #post-print-back-btn-style { display:none !important; } }
    `;
    document.head.appendChild(style);
  }

  const cleanup = () => {
    backBtn.remove();
    const s = document.getElementById("post-print-back-btn-style");
    if (s) s.remove();
    window.scrollTo(0, 0);
  };

  backBtn.onclick = cleanup;
  document.body.appendChild(backBtn);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    const btn = document.getElementById("post-print-back-btn");
    if (btn) {
      btn.remove();
      const s = document.getElementById("post-print-back-btn-style");
      if (s) s.remove();
    }
  }, 10000);
}
