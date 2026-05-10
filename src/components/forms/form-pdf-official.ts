import jsPDF from "jspdf";
import { registerArabicFont } from "@/lib/arabic-pdf";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_CENTER_LOGO_2 } from "@/lib/default-logos";
import type { FormTemplate, TableRow } from "./form-templates";

interface StudentInfo {
  id: string;
  full_name: string;
  national_id: string | null;
}

interface OfficialIdentity {
  rightLines: string[]; // المملكة / وزارة التعليم
  leftLines: string[];  // المنطقة/المحافظة... / المدرسة...
  ministryLogoUrl: string;
}

const DEFAULT_OFFICIAL: OfficialIdentity = {
  rightLines: ["المملكة العربية السعودية", "وزارة التعليم"],
  leftLines: ["المنطقة/المحافظة ..................", "المدرسة .........................."],
  ministryLogoUrl: "",
};

async function loadOfficialIdentity(): Promise<OfficialIdentity> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("id, value")
      .like("id", "form_identity_%");
    if (!data?.length) return DEFAULT_OFFICIAL;
    const map = new Map(data.map((r) => [r.id, r.value]));
    const right = map.has("form_identity_right_lines")
      ? JSON.parse(map.get("form_identity_right_lines")!)
      : DEFAULT_OFFICIAL.rightLines;
    const left = map.has("form_identity_left_lines")
      ? JSON.parse(map.get("form_identity_left_lines")!)
      : DEFAULT_OFFICIAL.leftLines;
    return {
      rightLines: (right as string[]).filter((l) => l && l.trim()),
      leftLines: (left as string[]).filter((l) => l && l.trim()),
      ministryLogoUrl: map.get("form_identity_ministry_logo") || "",
    };
  } catch {
    return DEFAULT_OFFICIAL;
  }
}

async function loadImage(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onloadend = () => res(fr.result as string);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* ======= Layout constants matching official PDF ======= */
const PAGE_MARGIN_X = 18;
const HEADER_TOP = 14;
const HEADER_FONT = 9;
const HEADER_LINE_H = 5;
const TITLE_FONT = 14;
const BODY_FONT = 10;
const LABEL_FONT = 10;
const TABLE_LINE = 0.25;
const COLOR_BLACK: [number, number, number] = [25, 25, 25];
const COLOR_GRAY: [number, number, number] = [110, 110, 110];

/* ======= Drawing primitives ======= */

function drawHeader(doc: jsPDF, identity: OfficialIdentity, ministryLogo: string | null, pageW: number): number {
  const y = HEADER_TOP;
  doc.setFont("Amiri", "normal");
  doc.setFontSize(HEADER_FONT);
  doc.setTextColor(...COLOR_BLACK);

  // Right column (المملكة / وزارة التعليم)
  identity.rightLines.forEach((line, i) => {
    doc.text(line, pageW - PAGE_MARGIN_X, y + i * HEADER_LINE_H, { align: "right" });
  });

  // Left column (المنطقة / المدرسة)
  identity.leftLines.forEach((line, i) => {
    doc.text(line, PAGE_MARGIN_X, y + i * HEADER_LINE_H, { align: "left" });
  });

  // Center logo (Ministry) — only if available
  if (ministryLogo) {
    try {
      const w = 28, h = 14;
      doc.addImage(ministryLogo, "PNG", pageW / 2 - w / 2, y - 3, w, h);
    } catch {/* ignore */}
  }

  const maxLines = Math.max(identity.rightLines.length, identity.leftLines.length, ministryLogo ? 3 : 0);
  return y + maxLines * HEADER_LINE_H + 6;
}

function drawTitle(doc: jsPDF, title: string, y: number, pageW: number): number {
  doc.setFont("Amiri", "bold");
  doc.setFontSize(TITLE_FONT);
  doc.setTextColor(...COLOR_BLACK);
  doc.text(title, pageW / 2, y + 8, { align: "center" });
  return y + 18;
}

function drawFooter(_doc: jsPDF, _pageNum: number, _pageH: number, _pageW: number) {
  // Footer intentionally removed (no website URL, no page number)
}

/* === Cell with label (above) + value (in middle) — matches official thin-bordered cells === */
function drawLabeledCell(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string) {
  // No per-cell rectangle (internal divisions removed)

  doc.setFont("Amiri", "normal");
  doc.setFontSize(LABEL_FONT);
  doc.setTextColor(...COLOR_BLACK);
  // Label on right (RTL)
  doc.text(`${label}:`, x + w - 2, y + 5.5, { align: "right" });
  // Value or dotted line to right of label
  const labelWidth = doc.getTextWidth(`${label}: `);
  if (value) {
    const wrapped = doc.splitTextToSize(value, w - labelWidth - 4);
    doc.text(wrapped, x + w - labelWidth - 2, y + 5.5, { align: "right" });
  } else {
    // Dotted blank line
    doc.setDrawColor(120, 120, 120);
    doc.setLineDashPattern([0.6, 0.8], 0);
    doc.line(x + 3, y + 5.5, x + w - labelWidth - 4, y + 5.5);
    doc.setLineDashPattern([], 0);
  }
}

/* === Section group: right narrow column has vertical title spanning all rows === */
function drawSectionGroup(
  doc: jsPDF,
  y: number,
  contentW: number,
  title: string,
  rows: TableRow[],
  fieldValues: Record<string, string>,
  pageW: number,
): number {
  const leftMargin = PAGE_MARGIN_X;
  const tableRight = pageW - PAGE_MARGIN_X;
  const sideColW = 40; // wider side column to keep titles like "خاص بالطالب" on one line
  const innerW = contentW - sideColW;
  const innerLeft = leftMargin;
  const innerRight = tableRight - sideColW;

  // إذا لم تكن للمجموعة صفوف، ارسم العنوان كرأس قسم مستقل (لتفادي تداخل العمود الجانبي مع الجدول التالي)
  if (!rows || rows.length === 0) {
    doc.setFont("Amiri", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...COLOR_BLACK);
    doc.text(title, pageW - PAGE_MARGIN_X, y + 6, { align: "right" });
    return y + 10;
  }

  // First pass: compute row heights
  type Computed = { h: number; row: TableRow };
  const computed: Computed[] = rows.map((r) => {
    if (r.type === "row") {
      const h = Math.max(11, ...r.cells.map((c) => c.minHeight || 0));
      return { h, row: r };
    } else if (r.type === "block") {
      const value = (r as any).staticValue ?? (fieldValues[r.fieldId] || "");
      const lines = value ? doc.splitTextToSize(value, innerW - 6) : [];
      const h = Math.max(r.minHeight || 18, lines.length * 5 + 7);
      return { h, row: r };
    } else if (r.type === "text_line" as any) {
      return { h: 8, row: r };
    }
    return { h: 10, row: r };
  });
  const totalH = computed.reduce((s, c) => s + c.h, 0);

  // Outer rectangle
  doc.setDrawColor(...COLOR_BLACK);
  doc.setLineWidth(TABLE_LINE);
  doc.rect(innerLeft, y, contentW, totalH, "S");

  // Vertical separator between side col and inner area
  doc.line(innerRight, y, innerRight, y + totalH);

  // Right side title (centered vertically and horizontally in the side col)
  doc.setFont("Amiri", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_BLACK);
  const titleLines = doc.splitTextToSize(title, sideColW - 4);
  const titleY = y + totalH / 2 - (titleLines.length * 5) / 2 + 4;
  titleLines.forEach((line: string, i: number) => {
    doc.text(line, innerRight + sideColW / 2, titleY + i * 5, { align: "center" });
  });

  // Inner rows
  let cy = y;
  for (const c of computed) {
    const r = c.row;
    if (r.type === "row") {
      const totalFlex = r.cells.reduce((s, cell) => s + (cell.flex || 1), 0);
      let xCursor = innerRight; // RTL: start from right edge of inner
      for (const cell of r.cells) {
        const w = (innerW * (cell.flex || 1)) / totalFlex;
        xCursor -= w;
        const value = cell.staticValue ?? (cell.fieldId ? fieldValues[cell.fieldId] || "" : "");
        drawLabeledCell(doc, xCursor, cy, w, c.h, cell.label, value);
      }
    } else if (r.type === "block") {
      const value = (r as any).staticValue ?? (fieldValues[r.fieldId] || "");
      // No internal cell border
      doc.setFont("Amiri", "normal");
      doc.setFontSize(BODY_FONT);
      doc.setTextColor(...COLOR_BLACK);
      if (value) {
        const lines = doc.splitTextToSize(value, innerW - 6);
        doc.text(lines, innerRight - 3, cy + 6, { align: "right" });
      } else if (r.label) {
        // Show label as a hint at the top + dotted lines beneath
        doc.setTextColor(...COLOR_GRAY);
        doc.text(r.label, innerRight - 3, cy + 5, { align: "right" });
        doc.setTextColor(...COLOR_BLACK);
        // dotted lines
        doc.setDrawColor(160, 160, 160);
        doc.setLineDashPattern([0.6, 0.8], 0);
        for (let ly = cy + 10; ly < cy + c.h - 2; ly += 5) {
          doc.line(innerLeft + 3, ly, innerRight - 3, ly);
        }
        doc.setLineDashPattern([], 0);
      } else {
        // dotted lines only
        doc.setDrawColor(160, 160, 160);
        doc.setLineDashPattern([0.6, 0.8], 0);
        for (let ly = cy + 5; ly < cy + c.h - 2; ly += 5) {
          doc.line(innerLeft + 3, ly, innerRight - 3, ly);
        }
        doc.setLineDashPattern([], 0);
      }
    } else if (r.type === "text_line" as any) {
      const line = r as any as { label: string; fieldId?: string; staticValue?: string };
      const value = line.staticValue ?? (line.fieldId ? fieldValues[line.fieldId] || "" : "");
      doc.setFont("Amiri", "normal");
      doc.setFontSize(BODY_FONT);
      doc.setTextColor(...COLOR_BLACK);
      doc.text(`${line.label}: ${value}`, innerRight - 3, cy + 5.5, { align: "right" });
    }
    cy += c.h;
    // Horizontal separators between rows removed (only first column kept)

  }

  return y + totalH + 4;
}

/* === Plain text line outside any table (label: ......value......) === */
function drawTextLine(doc: jsPDF, y: number, pageW: number, label: string, value: string, fontSize = 10, opts: { noColon?: boolean; rightX?: number; leftX?: number } = {}): number {
  doc.setFont("Amiri", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...COLOR_BLACK);
  const labelText = opts.noColon ? `${label} ` : `${label}: `;
  const x = opts.rightX ?? (pageW - PAGE_MARGIN_X);
  doc.text(labelText, x, y, { align: "right" });
  const labelW = doc.getTextWidth(labelText);
  if (value) {
    doc.text(value, x - labelW, y, { align: "right" });
  } else {
    doc.setDrawColor(120, 120, 120);
    doc.setLineDashPattern([0.6, 0.8], 0);
    const leftBound = opts.leftX ?? (PAGE_MARGIN_X + 5);
    doc.line(leftBound, y + 0.5, x - labelW - 2, y + 0.5);
    doc.setLineDashPattern([], 0);
  }
  return y + 7;
}

/* === Two text lines side by side (left & right halves) === */
function drawTextPair(
  doc: jsPDF,
  y: number,
  pageW: number,
  left: { label: string; value: string; noColon?: boolean },
  right: { label: string; value: string; noColon?: boolean },
): number {
  const mid = pageW / 2;
  drawTextLine(doc, y, pageW, right.label, right.value, 10, {
    noColon: right.noColon,
    rightX: pageW - PAGE_MARGIN_X,
    leftX: mid + 4,
  });
  drawTextLine(doc, y, pageW, left.label, left.value, 10, {
    noColon: left.noColon,
    rightX: mid - 4,
    leftX: PAGE_MARGIN_X + 5,
  });
  return y + 7;
}

/* === N signature columns (each: title + الاسم/التوقيع/التاريخ with dotted lines) === */
function drawSignatureColumns(
  doc: jsPDF,
  y: number,
  pageW: number,
  columns: Array<{ title: string; nameFieldId?: string; sigFieldId?: string; dateFieldId?: string }>,
  fieldValues: Record<string, string>,
): number {
  const contentW = pageW - PAGE_MARGIN_X * 2;
  const colW = contentW / columns.length;
  const startY = y;
  // Titles
  doc.setFont("Amiri", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_BLACK);
  columns.forEach((col, i) => {
    const cx = pageW - PAGE_MARGIN_X - i * colW - colW / 2;
    doc.text(col.title, cx, startY, { align: "center" });
  });
  let cy = startY + 8;
  doc.setFont("Amiri", "normal");
  doc.setFontSize(10);
  const fields = ["الاسم", "التوقيع", "التاريخ"] as const;
  const keys = ["nameFieldId", "sigFieldId", "dateFieldId"] as const;
  fields.forEach((field, idx) => {
    columns.forEach((col, i) => {
      const right = pageW - PAGE_MARGIN_X - i * colW;
      const left = right - colW + 4;
      const t = `:${field}`;
      doc.text(t, right - 2, cy, { align: "right" });
      const tw = doc.getTextWidth(t);
      const fid = (col as any)[keys[idx]];
      const v = fid ? fieldValues[fid] || "" : "";
      if (v) {
        doc.text(v, right - tw - 4, cy, { align: "right" });
      } else {
        doc.setDrawColor(120, 120, 120);
        doc.setLineDashPattern([0.6, 0.8], 0);
        doc.line(left, cy + 0.5, right - tw - 3, cy + 0.5);
        doc.setLineDashPattern([], 0);
      }
    });
    cy += 8;
  });
  return cy + 4;
}

/* === Empty grid (column headers + N empty rows) === */
function drawGrid(
  doc: jsPDF,
  y: number,
  contentW: number,
  columns: string[],
  rowCount: number,
  pageW: number,
  columnFlex?: number[],
  minRowHeight = 14,
): number {
  const totalFlex = (columnFlex && columnFlex.length === columns.length)
    ? columnFlex.reduce((a, b) => a + b, 0)
    : columns.length;
  const colWidths = columns.map((_, i) =>
    (columnFlex ? columnFlex[i] : 1) / totalFlex * contentW,
  );

  doc.setDrawColor(...COLOR_BLACK);
  doc.setLineWidth(TABLE_LINE);

  // Header row
  const headerH = 12;
  doc.setFont("Amiri", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_BLACK);

  // Render header texts (no per-cell rectangles)
  let xc = pageW - PAGE_MARGIN_X; // RTL: right to left
  columns.forEach((col, i) => {
    const w = colWidths[i];
    xc -= w;
    const wrapped = doc.splitTextToSize(col, w - 2);
    const linesCount = wrapped.length;
    const startY = y + headerH / 2 - (linesCount - 1) * 2;
    wrapped.forEach((line: string, j: number) => {
      doc.text(line, xc + w / 2, startY + j * 4, { align: "center" });
    });
  });
  let cy = y + headerH;

  // Empty rows — no internal cell rectangles
  for (let r = 0; r < rowCount; r++) {
    cy += minRowHeight;
  }

  const totalH = cy - y;
  const left = pageW - PAGE_MARGIN_X - contentW;
  const right = pageW - PAGE_MARGIN_X;
  // Outer rectangle
  doc.setDrawColor(...COLOR_BLACK);
  doc.setLineWidth(TABLE_LINE);
  doc.rect(left, y, contentW, totalH, "S");
  // Header bottom line
  doc.line(left, y + headerH, right, y + headerH);
  // Vertical separators between all columns (RTL)
  let xSep = right;
  for (let i = 0; i < columns.length - 1; i++) {
    xSep -= colWidths[i];
    doc.line(xSep, y, xSep, y + totalH);
  }
  // Horizontal separators between data rows
  for (let r = 1; r < rowCount; r++) {
    const ry = y + headerH + r * minRowHeight;
    doc.line(left, ry, right, ry);
  }

  return cy + 4;
}

/* === Escalation table: optional title + header row + data rows with first-col label === */
function drawEscalation(
  doc: jsPDF,
  y: number,
  contentW: number,
  title: string | undefined,
  columns: string[],
  rows: Array<{ label: string; fieldIds: string[] }>,
  fieldValues: Record<string, string>,
  pageW: number,
  columnFlex?: number[],
): number {
  if (title) {
    doc.setFont("Amiri", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR_BLACK);
    doc.text(title, pageW - PAGE_MARGIN_X, y + 5, { align: "right" });
    y += 8;
  }

  const totalFlex = columnFlex && columnFlex.length === columns.length
    ? columnFlex.reduce((a, b) => a + b, 0)
    : columns.length;
  const colWidths = columns.map((_, i) =>
    ((columnFlex ? columnFlex[i] : 1) / totalFlex) * contentW,
  );
  const headerH = 12;
  const rowH = 12;
  const totalH = headerH + rows.length * rowH;
  const left = pageW - PAGE_MARGIN_X - contentW;
  const right = pageW - PAGE_MARGIN_X;

  doc.setDrawColor(...COLOR_BLACK);
  doc.setLineWidth(TABLE_LINE);
  doc.rect(left, y, contentW, totalH, "S");
  // Header bottom line
  doc.line(left, y + headerH, right, y + headerH);
  // Vertical separators between all columns (RTL)
  let xSep = right;
  for (let i = 0; i < columns.length - 1; i++) {
    xSep -= colWidths[i];
    doc.line(xSep, y, xSep, y + totalH);
  }
  // Horizontal separators between data rows
  for (let r = 1; r < rows.length; r++) {
    const ry = y + headerH + r * rowH;
    doc.line(left, ry, right, ry);
  }

  doc.setFont("Amiri", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_BLACK);
  let xc = right;
  columns.forEach((col, i) => {
    const w = colWidths[i];
    xc -= w;
    const wrapped = doc.splitTextToSize(col, w - 2);
    const linesCount = wrapped.length;
    const startY = y + headerH / 2 - (linesCount - 1) * 2;
    wrapped.forEach((line: string, j: number) => {
      doc.text(line, xc + w / 2, startY + j * 4, { align: "center" });
    });
  });

  let cy = y + headerH;
  doc.setFontSize(9.5);
  rows.forEach((row) => {
    doc.text(row.label, right - colWidths[0] / 2, cy + rowH / 2 + 1.5, { align: "center" });
    let xx = right - colWidths[0];
    row.fieldIds.forEach((fid, i) => {
      const w = colWidths[i + 1] || colWidths[colWidths.length - 1];
      xx -= w;
      const v = fieldValues[fid] || "";
      if (v) {
        const wrapped = doc.splitTextToSize(v, w - 2);
        doc.text(wrapped[0] || "", xx + w / 2, cy + rowH / 2 + 1.5, { align: "center" });
      }
    });
    cy += rowH;
  });

  return y + totalH + 4;
}

/* === Note block (numbered list) === */
function drawNote(doc: jsPDF, y: number, pageW: number, lines: string[]): number {
  doc.setFont("Amiri", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_BLACK);
  const x = pageW - PAGE_MARGIN_X;
  doc.text("ملحوظة:", x, y, { align: "right" });
  y += 6;
  lines.forEach((line, i) => {
    doc.text(`${i + 1}.  ${line}`, x - 4, y, { align: "right" });
    y += 6;
  });
  return y + 4;
}

/* === Static paragraph with optional inline {placeholders} replaced from fieldValues. Long blanks render as dotted lines. === */
function drawParagraph(
  doc: jsPDF,
  y: number,
  pageW: number,
  text: string,
  fieldValues: Record<string, string>,
  opts: { bold?: boolean; align?: "right" | "center"; spacing?: number } = {},
): number {
  // Replace {fieldId} with value or dotted blank.
  // jsPDF Arabic shaping doesn't run full bidi, so ASCII parens/brackets
  // appear mirrored inside RTL text. Swap pairs so visual order is correct.
  const fixBidi = (s: string) =>
    s.replace(/[()\[\]{}<>]/g, (c) => ({ "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<" } as any)[c]);
  const filled = text.replace(/\{(\w+)\}/g, (_m, key) => {
    const v = fieldValues[key];
    if (!v || !v.trim()) return "....................";
    return fixBidi(v);
  });
  doc.setFont("Amiri", opts.bold ? "bold" : "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_BLACK);
  const contentW = pageW - PAGE_MARGIN_X * 2;
  const lines = doc.splitTextToSize(filled, contentW - 4);
  const align = opts.align || "right";
  const x = align === "center" ? pageW / 2 : pageW - PAGE_MARGIN_X;
  lines.forEach((ln: string, i: number) => {
    doc.text(ln, x, y + i * 6, { align });
  });
  return y + lines.length * 6 + (opts.spacing ?? 2);
}

/* === Signature block (RTL, label heading + 3 dotted lines) === */
function drawSignatureBlock(doc: jsPDF, y: number, label: string, pageW: number): number {
  doc.setFont("Amiri", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_BLACK);
  const xRight = pageW - PAGE_MARGIN_X - 4;
  doc.text(label, xRight, y, { align: "right" });
  y += 7;
  doc.setFont("Amiri", "normal");
  doc.setFontSize(10);
  ["الاسم", "التوقيع", "التاريخ"].forEach((field) => {
    const t = `:${field}`;
    doc.text(t, xRight, y, { align: "right" });
    const tw = doc.getTextWidth(t);
    doc.setDrawColor(120, 120, 120);
    doc.setLineDashPattern([0.6, 0.8], 0);
    // dotted line extending to the left
    doc.line(PAGE_MARGIN_X + 10, y + 0.5, xRight - tw - 2, y + 0.5);
    doc.setLineDashPattern([], 0);
    y += 7;
  });
  return y + 3;
}

/* === Left-aligned signature block (for letter-style forms with stamp on right) === */
function drawSignatureBlockLeft(doc: jsPDF, y: number, label: string, pageW: number): number {
  doc.setFont("Amiri", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_BLACK);
  // Position signature in left half of page
  const xLabel = pageW / 2 - 10;
  doc.text(label, xLabel, y, { align: "right" });
  y += 7;
  doc.setFont("Amiri", "normal");
  doc.setFontSize(10);
  ["الاسم", "التوقيع", "التاريخ"].forEach((field) => {
    const t = `:${field}`;
    doc.text(t, xLabel, y, { align: "right" });
    const tw = doc.getTextWidth(t);
    doc.setDrawColor(120, 120, 120);
    doc.setLineDashPattern([0.6, 0.8], 0);
    doc.line(PAGE_MARGIN_X + 10, y + 0.5, xLabel - tw - 2, y + 0.5);
    doc.setLineDashPattern([], 0);
    y += 7;
  });
  return y + 3;
}

/* ======= MAIN EXPORT ======= */

export async function exportOfficialFormPdf(
  form: FormTemplate,
  fieldValues: Record<string, string>,
  student: StudentInfo,
  options?: { returnBlob?: boolean },
): Promise<{ blob: Blob | null; fileName: string }> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - PAGE_MARGIN_X * 2;

  await registerArabicFont(doc);
  doc.setFont("Amiri");

  const identity = await loadOfficialIdentity();
  const ministryLogo = (await loadImage(identity.ministryLogoUrl)) || (await loadImage(DEFAULT_CENTER_LOGO_2));

  let y = drawHeader(doc, identity, ministryLogo, pageW);
  if (!(form as any).suppressDefaultTitle) {
    y = drawTitle(doc, form.title, y, pageW);
  }

  // Render layout
  const layout = (form.tableLayout || []) as TableRow[];
  const replyLayout = ((form as any).parentReplyLayout || []) as TableRow[];

  // Group consecutive rows under preceding "section" into a section_group
  // Pattern: section -> [rows/blocks/text_lines...] -> next section or end
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = drawHeader(doc, identity, ministryLogo, pageW);
    }
  };

  const renderLayout = (items: TableRow[]) => {
    let i = 0;
    while (i < items.length) {
      const item = items[i];
      if (item.type === "section") {
        const groupRows: TableRow[] = [];
        i++;
        while (i < items.length && items[i].type !== "section" && items[i].type !== "note" && items[i].type !== "grid" && items[i].type !== "escalation" && items[i].type !== "paragraph") {
          groupRows.push(items[i]);
          i++;
        }
        let estH = 4;
        for (const r of groupRows) {
          if (r.type === "row") {
            estH += Math.max(11, ...((r as any).cells?.map((c: any) => c.minHeight || 0) || [0]));
          } else if (r.type === "block") {
            const value = (r as any).staticValue ?? (fieldValues[(r as any).fieldId] || "");
            const innerW = (pageW - PAGE_MARGIN_X * 2) - 40;
            const lines = value ? doc.splitTextToSize(value, innerW - 6).length : 0;
            estH += Math.max((r as any).minHeight || 18, lines * 5 + 7);
          } else if ((r as any).type === "text_line") {
            estH += 8;
          } else {
            estH += 10;
          }
        }
        ensureSpace(estH + 8);
        y = drawSectionGroup(doc, y, contentW, item.title, groupRows, fieldValues, pageW);
      } else if (item.type === "note") {
        ensureSpace(item.lines.length * 6 + 12);
        y = drawNote(doc, y + 2, pageW, item.lines);
        i++;
      } else if (item.type === "grid") {
        const rowCount = item.rowCount ?? (item.rows?.length ?? 8);
        ensureSpace(rowCount * (item.minRowHeight || 14) + 16);
        y = drawGrid(doc, y, contentW, item.columns, rowCount, pageW, item.columnFlex, item.minRowHeight);
        i++;
      } else if (item.type === "escalation") {
        ensureSpace(item.rows.length * 12 + 22);
        y = drawEscalation(doc, y, contentW, item.title, item.columns, item.rows, fieldValues, pageW, (item as any).columnFlex);
        i++;
      } else if (item.type === "text_line" as any) {
        ensureSpace(10);
        const line = item as any;
        y = drawTextLine(doc, y, pageW, line.label, line.staticValue ?? (line.fieldId ? fieldValues[line.fieldId] || "" : ""), 10, { noColon: line.noColon });
        i++;
      } else if (item.type === "text_pair" as any) {
        const p = item as any;
        ensureSpace(10);
        y = drawTextPair(doc, y, pageW,
          { label: p.left.label, value: p.left.fieldId ? fieldValues[p.left.fieldId] || "" : "", noColon: p.left.noColon },
          { label: p.right.label, value: p.right.fieldId ? fieldValues[p.right.fieldId] || "" : "", noColon: p.right.noColon },
        );
        i++;
      } else if (item.type === "signature_columns" as any) {
        const p = item as any;
        ensureSpace(40);
        y = drawSignatureColumns(doc, y, pageW, p.columns, fieldValues);
        i++;
      } else if (item.type === "paragraph" as any) {
        const p = item as any;
        ensureSpace(20);
        y = drawParagraph(doc, y, pageW, p.text, fieldValues, { bold: p.bold, align: p.align, spacing: p.spacing });
        i++;
      } else {
        i++;
      }
    }
  };

  renderLayout(layout);

  // Signature block(s)
  const sigLabels = form.signatureLabels || [];
  if (sigLabels.length > 0) {
    const blockH = sigLabels.length * 31 + 10;
    // If a parent-reply layout follows, place signature inline (don't push to bottom).
    let sigY = replyLayout.length > 0 ? y + 10 : Math.max(y + 10, pageH - 25 - blockH);
    if ((form as any).stampOnRight) {
      const startY = sigY;
      for (const label of sigLabels) {
        if (sigY + 31 > pageH - 15) break;
        sigY = drawSignatureBlockLeft(doc, sigY, label, pageW) + 4;
      }
      const stampY = startY + (sigY - startY) / 2 - 2;
      doc.setFont("Amiri", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...COLOR_BLACK);
      doc.text("الختم", pageW - PAGE_MARGIN_X - 4, stampY, { align: "right" });
    } else {
      for (const label of sigLabels) {
        if (sigY + 31 > pageH - 15) break;
        sigY = drawSignatureBlock(doc, sigY, label, pageW) + 4;
      }
    }
    y = sigY;
  }

  // Render parent reply layout (if any)
  if (replyLayout.length > 0) {
    renderLayout(replyLayout);
  }

  drawFooter(doc, form.officialPage || 1, pageH, pageW);

  const fileName = `${form.title} - ${fieldValues.student_name || student.full_name || "نموذج"}.pdf`;
  if (options?.returnBlob) {
    return { blob: doc.output("blob"), fileName };
  }
  doc.save(fileName);
  return { blob: null, fileName };
}
