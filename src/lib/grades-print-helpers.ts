/**
 * Helpers for grades-print.ts — config cache, HTML builders, CSS
 */
import { fetchScopedPrintHeader } from "@/lib/print-header-fetch";
import { resolveLogoSrc } from "@/lib/default-logos";

/* ──────────────────────────── Config cache ───────────────────── */

const headerCache = new Map<string, { data: any; ts: number }>();
const footerCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(cache: Map<string, { data: any; ts: number }>, key: string): any | undefined {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return undefined;
}

export function clearPrintHeaderCache() {
  headerCache.clear();
  footerCache.clear();
}

/* ──────────────────────────── Data fetchers ──────────────────── */

export async function fetchHeaderConfig(reportType = "grades"): Promise<any | null> {
  const cached = getCached(headerCache, reportType);
  if (cached !== undefined) return cached;
  const parsed = await fetchScopedPrintHeader(reportType);
  headerCache.set(reportType, { data: parsed, ts: Date.now() });
  return parsed;
}

export async function fetchFooterConfig(reportType = "grades"): Promise<any | null> {
  const cached = getCached(footerCache, reportType);
  if (cached !== undefined) return cached;
  // Try report-specific first; if it lacks footerSignatures, fall back to default config.
  let config = await fetchScopedPrintHeader(reportType);
  if (!config?.footerSignatures) config = await fetchScopedPrintHeader();
  const result = config?.footerSignatures?.enabled ? config.footerSignatures : null;
  footerCache.set(reportType, { data: result, ts: Date.now() });
  return result;
}

/* ──────────────────────────── HTML builders ──────────────────── */

export function buildHeaderHTML(config: any): string {
  if (!config) return "";
  const rightAlign = config.rightSection?.align || "right";
  const leftAlign = config.leftSection?.align || "left";
  const rightLines = (config.rightSection?.lines || [])
    .map((line: string) => `<p style="margin:0;font-weight:600;">${line}</p>`)
    .join("");
  const leftLines = (config.leftSection?.lines || [])
    .map((line: string) => `<p style="margin:0;font-weight:600;">${line}</p>`)
    .join("");
  const images = (config.centerSection?.images || [])
    .map((img: string, i: number) => {
      const src = resolveLogoSrc(i, img);
      if (!src) return "";
      const height = config.centerSection?.imagesSizes?.[i] || 60;
      const width = config.centerSection?.imagesWidths?.[i] ?? height;
      return `<img src="${src}" alt="" style="width:${width}px;height:${height}px;object-fit:contain;" />`;
    })
    .join("");

  const borderBottomMargin = config.margins?.borderBottomMargin ?? 8;

  return `
    <div style="margin-bottom:${borderBottomMargin}mm;padding-bottom:6px;border-bottom:${config.margins?.borderWidth ?? 3}px solid ${config.margins?.borderColor ?? '#3b82f6'};display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
      <div style="flex:1 1 0%;">
        <div style="width:fit-content;max-width:100%;margin-left:auto;text-align:${rightAlign};font-size:${config.rightSection?.fontSize || 12}px;line-height:1.8;color:${config.rightSection?.color || '#1e293b'};">
          ${rightLines}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        ${images}
      </div>
      <div style="flex:1 1 0%;">
        <div style="width:fit-content;max-width:100%;margin-right:auto;text-align:${leftAlign};font-size:${config.leftSection?.fontSize || 12}px;line-height:1.8;color:${config.leftSection?.color || '#1e293b'};">
          ${leftLines}
        </div>
      </div>
    </div>
  `;
}

export function buildFooterHTML(signatures: any): string {
  if (!signatures?.enabled || !signatures.signatures?.length) return "";
  const sigs = signatures.signatures.map((sig: any) => `
    <div style="text-align:center;min-width:120px;">
      <p style="margin:0;font-size:11px;font-weight:600;color:#1e293b;">${sig.label || ""}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#475569;">${sig.name || "........................"}</p>
      <div style="margin-top:24px;border-bottom:1px solid #94a3b8;width:100px;margin-inline:auto;"></div>
    </div>
  `).join("");
  return `
    <div class="print-footer-signatures" style="margin-top:24px;padding-top:16px;border-top:1px dashed #cbd5e1;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;direction:rtl;padding-inline:32px;">
        ${sigs}
      </div>
    </div>
  `;
}

/* ──────────────────────────── CSS for iframe ─────────────────── */

export function buildIframeCSS(orientation: string, contentWidth: string, pageWidth: string, pageHeight: string): string {
  return `
    @page { size: A4 ${orientation}; margin: 5mm 0 0 0 !important; }
    @page :first { margin-top: 0 !important; }

    html, body {
      margin: 0; padding: 0; background: #fff; color: #1a1a1a;
      direction: rtl; width: 100%; min-height: 100%;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-family: 'IBM Plex Sans Arabic', sans-serif;
    }
    * {
      box-sizing: border-box;
      margin: 0; padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      transition: none !important;
      animation: none !important;
      box-shadow: none !important;
    }

    .print-root {
      width: ${contentWidth};
      max-width: ${contentWidth};
      margin: 0 auto;
      padding: 3mm 5mm;
      overflow: visible;
    }
    .content-area { }
    .footer-spacer { }
    @media print {
      html, body { width: ${pageWidth}; min-height: ${pageHeight}; }
      .print-root { width: ${contentWidth}; max-width: ${contentWidth}; overflow: visible; }
    }

    table {
      width: 100%; border-collapse: collapse; table-layout: fixed;
      font-size: 10px; line-height: 1.4;
      contain: layout style;
    }
    th, td {
      padding: 4px 3px; border: 1px solid #cbd5e1;
      text-align: center; vertical-align: middle;
      overflow: hidden; word-wrap: break-word;
    }
    th {
      background: #eff6ff !important; font-weight: 700; color: #1e40af;
    }
    thead { display: table-header-group; }
    tr { break-inside: avoid-page; page-break-inside: avoid; }

    td:nth-child(1) { font-weight: 700; }
    td:nth-child(2) { text-align: right; white-space: normal; word-break: break-word; font-weight: 700; }
    th:nth-child(2) { text-align: right; }

    tbody tr:nth-child(even) { background: #f8fafc !important; }
    tbody tr:nth-child(odd) { background: #fff !important; }

    img { max-width: 100%; }

    .title-section { text-align: center; margin-bottom: 6px; }
    .title-section h2 { font-size: 14px; font-weight: bold; margin: 0 0 2px; }
    .title-section p { font-size: 11px; color: #666; margin: 0; }

    .subtotal-cell { background: #dbeafe !important; font-weight: 700; }
    .subtotal-header { background: #e0f2fe !important; }

    .icon-star { display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;color:#b8860b;font-size:13px;line-height:1; }
    .icon-excellent { display:inline-flex;align-items:center;justify-content:center;width:10px;height:10px;border-radius:9999px;border:1.5px solid #059669;background:transparent;color:#059669;font-size:7px;line-height:1;font-weight:700; }
    .icon-average { display:inline-flex;align-items:center;justify-content:center;width:10px;height:10px;border-radius:9999px;border:1.5px solid #d97706;background:transparent;color:#d97706;font-size:7px;line-height:1;font-weight:700; }
    .icon-zero { display:inline-flex;align-items:center;justify-content:center;width:10px;height:10px;border-radius:9999px;border:1.5px solid #e11d48;background:transparent;color:#e11d48;font-size:7px;line-height:1;font-weight:700; }
    .icons-cell { display:flex;flex-wrap:wrap;justify-content:center;gap:1px;min-height:10px; }

    .grade-excellent { color: #059669; font-weight: 700; }
    .grade-very-good { color: #2563eb; font-weight: 700; }
    .grade-good { color: #0284c7; font-weight: 700; }
    .grade-acceptable { color: #d97706; font-weight: 700; }
    .grade-weak { color: #e11d48; font-weight: 700; }
  `;
}
