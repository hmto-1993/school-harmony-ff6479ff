/**
 * Unified WYSIWYG print engine for grade pages.
 * Uses isolated iframe printing to guarantee exact on-screen appearance.
 */
import { supabase } from "@/integrations/supabase/client";

interface PrintOptions {
  orientation?: "portrait" | "landscape";
  title: string;
  subtitle?: string;
  reportType?: "attendance" | "grades" | "behavior";
  tableHTML: string;
}

/** Fetch print header config from settings */
async function fetchHeaderConfig(reportType: string = "grades"): Promise<any | null> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", `print_header_config_${reportType}`)
      .single();
    if (data?.value) {
      try { return JSON.parse(data.value); } catch {}
    }
    const { data: def } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", "print_header_config")
      .single();
    if (def?.value) {
      try { return JSON.parse(def.value); } catch {}
    }
  } catch {}
  return null;
}

/** Fetch footer signatures config */
async function fetchFooterConfig(reportType: string = "grades"): Promise<any | null> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", `print_header_config_${reportType}`)
      .single();
    let config: any = null;
    if (data?.value) {
      try { config = JSON.parse(data.value); } catch {}
    }
    if (!config?.footerSignatures) {
      const { data: def } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", "print_header_config")
        .single();
      if (def?.value) {
        try { config = JSON.parse(def.value); } catch {}
      }
    }
    if (config?.footerSignatures?.enabled) {
      return config.footerSignatures;
    }
  } catch {}
  return null;
}

function buildHeaderHTML(config: any): string {
  if (!config) return "";
  const rightLines = (config.rightSection?.lines || [])
    .map((line: string) => `<p style="margin:0;font-weight:600;">${line}</p>`)
    .join("");
  const leftLines = (config.leftSection?.lines || [])
    .map((line: string) => `<p style="margin:0;font-weight:600;">${line}</p>`)
    .join("");
  const images = (config.centerSection?.images || [])
    .map((img: string, i: number) => {
      if (!img) return "";
      const size = config.centerSection?.imagesSizes?.[i] || 60;
      return `<img src="${img}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;" />`;
    })
    .join("");

  return `
    <div style="margin-bottom:10px;padding-bottom:6px;border-bottom:3px solid #3b82f6;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
      <div style="max-width:40%;text-align:center;font-size:${config.rightSection?.fontSize || 12}px;line-height:1.8;color:${config.rightSection?.color || '#1e293b'};">
        ${rightLines}
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
        ${images}
      </div>
      <div style="max-width:40%;text-align:center;font-size:${config.leftSection?.fontSize || 12}px;line-height:1.8;color:${config.leftSection?.color || '#1e293b'};">
        ${leftLines}
      </div>
    </div>
  `;
}

function buildFooterHTML(signatures: any): string {
  if (!signatures?.enabled || !signatures.signatures?.length) return "";
  const sigs = signatures.signatures.map((sig: any) => `
    <div style="text-align:center;min-width:120px;">
      <p style="margin:0;font-size:11px;font-weight:600;color:#1e293b;">${sig.label || ""}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#475569;">${sig.name || "........................"}</p>
      <div style="margin-top:24px;border-bottom:1px solid #94a3b8;width:100px;margin-inline:auto;"></div>
    </div>
  `).join("");
  return `
    <div style="margin-top:24px;padding-top:16px;border-top:1px dashed #cbd5e1;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;direction:rtl;padding-inline:32px;">
        ${sigs}
      </div>
    </div>
  `;
}

/** Main WYSIWYG print function for grade pages */
export async function printGradesTable(options: PrintOptions): Promise<void> {
  const { orientation = "landscape", title, subtitle, reportType = "grades", tableHTML } = options;

  const [headerConfig, footerConfig] = await Promise.all([
    fetchHeaderConfig(reportType),
    fetchFooterConfig(reportType),
  ]);

  const headerHTML = buildHeaderHTML(headerConfig);
  const footerHTML = buildFooterHTML(footerConfig);

  const pageWidth = orientation === "landscape" ? "297mm" : "210mm";
  const pageHeight = orientation === "landscape" ? "210mm" : "297mm";
  const contentWidth = orientation === "landscape" ? "283mm" : "196mm";
  const sideMargin = orientation === "landscape" ? "7mm" : "7mm";

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed", width: "0", height: "0", opacity: "0",
    pointerEvents: "none", border: "0", bottom: "0", right: "0",
  });
  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;
  const printDocument = iframe.contentDocument;
  if (!printWindow || !printDocument) {
    iframe.remove();
    return;
  }

  printDocument.open();
  printDocument.write(`<!doctype html>
<html dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 ${orientation}; margin: 4mm ${sideMargin} 6mm ${sideMargin}; }
    html, body {
      margin: 0; padding: 0; background: #fff; color: #1a1a1a;
      direction: rtl; width: 100%; min-height: 100%;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-family: 'IBM Plex Sans Arabic', sans-serif;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-root {
      width: ${contentWidth};
      max-width: ${contentWidth};
      margin: 0 auto;
      padding: 2mm 0;
      overflow: hidden;
    }
    @media print {
      html, body { width: ${pageWidth}; min-height: ${pageHeight}; }
      .print-root { width: ${contentWidth}; max-width: ${contentWidth}; overflow: hidden; }
    }
    table {
      width: 100%; border-collapse: collapse; table-layout: fixed;
      line-height: 1.4;
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
    td:nth-child(2) { text-align: right; white-space: normal; word-break: break-word; }
    th:nth-child(2) { text-align: right; }
    tbody tr:nth-child(even) { background: #f8fafc !important; }
    tbody tr:nth-child(odd) { background: #fff !important; }
    img { max-width: 100%; }
    .title-section { text-align: center; margin-bottom: 6px; }
    .title-section h2 { font-size: 14px; font-weight: bold; margin: 0 0 2px; }
    .title-section p { font-size: 11px; color: #666; margin: 0; }
    .subtotal-cell { background: #dbeafe !important; font-weight: 700; }
    .subtotal-header { background: #e0f2fe !important; }
    .icon-star { display:inline-flex;align-items:center;justify-content:center;width:9px;height:9px;color:#d97706;font-size:9px;line-height:1; }
    .icon-excellent { display:inline-block;width:6px;height:6px;border-radius:9999px;background:#059669; }
    .icon-average { display:inline-block;width:6px;height:6px;border-radius:9999px;background:#d97706; }
    .icon-zero { display:inline-flex;align-items:center;justify-content:center;width:7px;height:7px;border-radius:9999px;background:#e11d48;color:#fff;font-size:6px;line-height:1; }
    .icons-cell { display:flex;flex-wrap:wrap;justify-content:center;gap:1px;min-height:10px; }
    .grade-excellent { color: #059669; font-weight: 700; }
    .grade-very-good { color: #2563eb; font-weight: 700; }
    .grade-good { color: #0284c7; font-weight: 700; }
    .grade-acceptable { color: #d97706; font-weight: 700; }
    .grade-weak { color: #e11d48; font-weight: 700; }
  </style>
</head>
<body>
  <div class="print-root">
    ${headerHTML}
    <div class="title-section">
      <h2>${title}</h2>
      ${subtitle ? `<p>${subtitle}</p>` : ""}
    </div>
    ${tableHTML}
    ${footerHTML}
  </div>
</body>
</html>`);
  printDocument.close();

  // Wait for fonts and images
  try {
    if ("fonts" in printDocument) {
      await (printDocument as any).fonts.ready;
    }
  } catch {}

  const images = Array.from(printDocument.images);
  if (images.length > 0) {
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

  // Print
  await new Promise<void>((resolve) => {
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      printWindow.removeEventListener("afterprint", onAfterPrint);
      clearTimeout(fallback);
      iframe.remove();
      resolve();
    };
    const onAfterPrint = () => cleanup();
    printWindow.addEventListener("afterprint", onAfterPrint);
    const fallback = setTimeout(cleanup, 60_000);
    requestAnimationFrame(() => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 200);
    });
  });
}

/** Helper: build icon HTML for classwork print */
export function getPrintIconSpan(icon: { level: string; isFullScore: boolean }): string {
  if (icon.isFullScore) return '<span class="icon-star">★</span>';
  if (icon.level === "excellent") return '<span class="icon-excellent"></span>';
  if (icon.level === "average") return '<span class="icon-average"></span>';
  return '<span class="icon-zero">×</span>';
}
