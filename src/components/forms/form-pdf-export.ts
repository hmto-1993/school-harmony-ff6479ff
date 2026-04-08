import jsPDF from "jspdf";
import { registerArabicFont } from "@/lib/arabic-pdf";
import type { FormTemplate } from "./form-templates";

interface StudentInfo {
  id: string;
  full_name: string;
  national_id: string | null;
}

/** Generate a unique reference number for QR / documentation */
function generateRefNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AF-${y}${m}${d}-${rand}`;
}

/** Replace {placeholders} in a template string */
function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || "............");
}

/** Draw a simple QR-style pattern (visual representation) */
function drawQrPattern(doc: jsPDF, x: number, y: number, size: number, refNumber: string) {
  const cellSize = size / 9;
  doc.setFillColor(30, 41, 59);

  const drawCorner = (cx: number, cy: number) => {
    doc.rect(cx, cy, cellSize * 3, cellSize * 3, "S");
    doc.rect(cx + cellSize * 0.5, cy + cellSize * 0.5, cellSize * 2, cellSize * 2, "F");
  };

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  drawCorner(x, y);
  drawCorner(x + cellSize * 6, y);
  drawCorner(x, y + cellSize * 6);

  const hash = refNumber.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  for (let r = 3; r < 6; r++) {
    for (let c = 3; c < 6; c++) {
      if ((hash + r * 7 + c) % 3 === 0) {
        doc.rect(x + c * cellSize, y + r * cellSize, cellSize, cellSize, "F");
      }
    }
  }

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(refNumber, x + size / 2, y + size + 4, { align: "center" });
}

/** Load school logo as base64 data URL */
async function loadLogoBase64(): Promise<string | null> {
  try {
    const response = await fetch("/assets/school-logo.jpg");
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Draw confidential watermark across the page */
function drawConfidentialWatermark(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.saveGraphicsState();
  // Simulate transparency by blending red with white
  const r = Math.round(220 * 0.92 + 255 * 0.08);
  const g = Math.round(38 * 0.92 + 255 * 0.08);
  const b = Math.round(38 * 0.92 + 255 * 0.08);

  doc.setTextColor(r, g, b);
  doc.setFontSize(52);
  doc.setFont("Amiri", "bold");

  // Tiled watermark
  for (let row = 40; row < pageH; row += 70) {
    for (let col = 20; col < pageW; col += 90) {
      // Manual rotation simulation with positioned text
      doc.text("سري للغاية", col, row, { align: "center", angle: -30 });
    }
  }
  doc.restoreGraphicsState();
}

/** Draw a protocol-style table section */
function drawProtocolSection(
  doc: jsPDF,
  title: string,
  content: string,
  y: number,
  marginX: number,
  contentW: number,
  pageH: number,
): number {
  if (y > pageH - 50) {
    doc.addPage();
    y = 20;
  }

  const pageW = doc.internal.pageSize.getWidth();

  // Section header bar
  doc.setFillColor(0, 102, 153);
  doc.rect(marginX, y, contentW, 8, "F");
  doc.setFontSize(11);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageW / 2, y + 6, { align: "center" });
  y += 12;

  // Section content
  doc.setFont("Amiri", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);

  if (content.trim()) {
    const lines = doc.splitTextToSize(content, contentW - 12);
    const boxH = Math.max(lines.length * 6 + 10, 25);

    if (y + boxH > pageH - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(200, 215, 235);
    doc.setLineWidth(0.4);
    doc.rect(marginX, y, contentW, boxH, "S");

    doc.text(lines, pageW - marginX - 6, y + 6, { align: "right" });
    y += boxH + 4;
  } else {
    // Empty box with dotted lines
    const emptyH = 30;
    doc.setDrawColor(200, 215, 235);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, contentW, emptyH, "S");

    // Dotted guide lines
    doc.setDrawColor(220, 225, 230);
    for (let lineY = y + 8; lineY < y + emptyH - 2; lineY += 8) {
      doc.setLineDashPattern([1, 2], 0);
      doc.line(marginX + 5, lineY, marginX + contentW - 5, lineY);
    }
    doc.setLineDashPattern([], 0);
    y += emptyH + 4;
  }

  return y;
}

/**
 * Generates an official Saudi‐style A4 PDF for a given form template.
 */
export async function exportFormPdf(
  form: FormTemplate,
  fieldValues: Record<string, string>,
  student: StudentInfo,
  options?: { returnBlob?: boolean; signatureDataUrl?: string | null },
): Promise<{ blob: Blob | null; fileName: string }> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const contentW = pageW - marginX * 2;
  const refNumber = generateRefNumber();

  // Register Arabic font
  await registerArabicFont(doc);
  doc.setFont("Amiri");

  // Try to load logo
  const logoData = await loadLogoBase64();

  // ========== CONFIDENTIAL WATERMARK ==========
  if (form.confidentialWatermark) {
    drawConfidentialWatermark(doc);
  }

  let y = 12;

  // ========== HEADER ==========
  // Top decorative border
  const headerColor = form.confidentialWatermark ? [153, 27, 27] : [0, 102, 153];
  doc.setDrawColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, pageW - marginX, y);
  doc.setLineWidth(0.3);
  doc.line(marginX, y + 2, pageW - marginX, y + 2);
  y += 7;

  // Right side: Ministry info
  doc.setFontSize(9);
  doc.setFont("Amiri", "normal");
  doc.setTextColor(30, 41, 59);
  const rightLines = ["المملكة العربية السعودية", "وزارة التعليم", "الإدارة العامة للتعليم", "ثانوية الفيصلية"];
  rightLines.forEach((line, i) => {
    doc.text(line, pageW - marginX, y + i * 5, { align: "right" });
  });

  // Left side: Alpha Physics branding
  const leftLines = ["ألفا فيزياء", "Alpha Physics"];
  leftLines.forEach((line, i) => {
    doc.text(line, marginX, y + i * 5, { align: "left" });
  });

  // Center: Logo
  if (logoData) {
    try {
      const logoSize = 16;
      doc.addImage(logoData, "JPEG", pageW / 2 - logoSize / 2, y - 2, logoSize, logoSize);
    } catch {
      // ignore logo errors
    }
  }

  y += 24;

  // Confidential badge
  if (form.confidentialWatermark) {
    doc.setFillColor(153, 27, 27);
    doc.roundedRect(pageW / 2 - 20, y - 4, 40, 7, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("Amiri", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("سري للغاية", pageW / 2, y + 1, { align: "center" });
    y += 8;
  }

  // Title
  doc.setFontSize(16);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.text(form.title, pageW / 2, y, { align: "center" });
  y += 3;

  // Title underline
  const titleW = doc.getTextWidth(form.title);
  doc.setDrawColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.setLineWidth(0.8);
  doc.line(pageW / 2 - titleW / 2 - 8, y, pageW / 2 + titleW / 2 + 8, y);
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(pageW / 2 - titleW / 2, y, pageW / 2 + titleW / 2, y);
  y += 10;

  doc.setFont("Amiri", "normal");

  // ========== STUDENT INFO BOX ==========
  const autoFields = form.fields.filter((f) => f.type === "auto");
  if (autoFields.length > 0) {
    const bgColor = form.confidentialWatermark ? [255, 245, 245] : [240, 245, 255];
    const borderColor = form.confidentialWatermark ? [235, 200, 200] : [200, 215, 235];
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    const boxH = Math.ceil(autoFields.length / 2) * 8 + 8;
    doc.roundedRect(marginX, y - 2, contentW, boxH, 3, 3, "FD");

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    const colW = contentW / 2;
    const infoY = y + 4;

    autoFields.forEach((f, i) => {
      const value = fieldValues[f.id] || "—";
      const label = `${f.label}: ${value}`;
      const col = i % 2;
      const row = Math.floor(i / 2);
      const xPos = col === 0 ? pageW - marginX - 5 : pageW - marginX - colW - 5;
      doc.text(label, xPos, infoY + row * 8, { align: "right" });
    });

    y += boxH + 4;
  }

  // Witnesses section (for incident_report)
  const witnesses = fieldValues["witnesses_names"];
  if (form.witnessPickerEnabled && witnesses) {
    doc.setFillColor(255, 250, 235);
    doc.setDrawColor(220, 200, 160);
    doc.setLineWidth(0.3);

    doc.setFontSize(10);
    doc.setFont("Amiri", "bold");
    doc.setTextColor(120, 90, 20);
    doc.text("الشهود:", pageW - marginX - 5, y + 4, { align: "right" });

    doc.setFont("Amiri", "normal");
    doc.setTextColor(30, 41, 59);
    const witnessLines = doc.splitTextToSize(witnesses, contentW - 30);
    const wBoxH = witnessLines.length * 6 + 10;
    doc.roundedRect(marginX, y - 1, contentW, wBoxH, 2, 2, "FD");
    doc.text(witnessLines, pageW - marginX - 25, y + 4, { align: "right" });
    y += wBoxH + 4;
  }

  // ========== PROTOCOL LAYOUT ==========
  if (form.protocolLayout && form.protocolSections) {
    // Separator
    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.3);
    doc.line(marginX + 20, y, pageW - marginX - 20, y);
    y += 6;

    for (const section of form.protocolSections) {
      const content = fieldValues[section.fieldId] || "";
      y = drawProtocolSection(doc, section.title, content, y, marginX, contentW, pageH);
    }
  } else if (form.bodyTemplate) {
    // ========== BODY TEMPLATE ==========
    const filledBody = fillTemplate(form.bodyTemplate, fieldValues);

    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);

    const paragraphs = filledBody.split("\n");
    for (const para of paragraphs) {
      if (!para.trim()) { y += 4; continue; }
      if (y > pageH - 60) { doc.addPage(); y = 20; }

      const lines = doc.splitTextToSize(para, contentW - 8);
      for (const line of lines) {
        doc.text(line, pageW - marginX, y, { align: "right" });
        y += 7;
      }
    }
    y += 6;
  } else {
    // ========== STANDARD FORM BODY ==========
    const nonAutoFields = form.fields.filter((f) => f.type !== "auto" && !f.hidden);

    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.3);
    doc.line(marginX + 20, y, pageW - marginX - 20, y);
    y += 8;

    for (const field of nonAutoFields) {
      if (field.id === "witnesses_names") continue; // Rendered above
      const value = fieldValues[field.id] || "";

      if (y > pageH - 55) { doc.addPage(); y = 20; }

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`${field.label}:`, pageW - marginX, y, { align: "right" });
      y += 6;

      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);

      if (field.type === "textarea" && value) {
        const lines = doc.splitTextToSize(value, contentW - 12);
        const boxH = Math.max(lines.length * 6.5 + 8, 22);
        doc.setDrawColor(200, 215, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(marginX, y - 2, contentW, boxH, 2, 2, "S");
        doc.text(lines, pageW - marginX - 6, y + 4, { align: "right" });
        y += boxH + 5;
      } else {
        doc.text(value || ".....................................................", pageW - marginX - 5, y, { align: "right" });
        y += 9;
      }
    }
  }

  // ========== CONFIDENTIAL REFERRAL QR ==========
  if (form.id === "confidential_referral" && student.id) {
    y += 4;
    if (y > pageH - 65) { doc.addPage(); y = 20; }

    const qrUrl = `${window.location.origin}/student?id=${student.national_id || student.id}`;
    doc.setFontSize(9);
    doc.setTextColor(0, 102, 153);
    doc.text("رابط الصفحة السلوكية للطالب:", pageW / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(7);
    doc.text(qrUrl, pageW / 2, y, { align: "center" });
    y += 4;
    drawQrPattern(doc, pageW / 2 - 12, y, 24, refNumber);
    y += 32;
  }

  // ========== ELECTRONIC SIGNATURE ==========
  if (options?.signatureDataUrl) {
    if (y > pageH - 70) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("التوقيع الإلكتروني:", pageW - marginX, y, { align: "right" });
    y += 2;
    try {
      doc.addImage(options.signatureDataUrl, "PNG", pageW / 2 - 25, y, 50, 20);
    } catch { /* ignore */ }
    y += 24;
  }

  // ========== FOOTER: Signatures ==========
  y = Math.max(y + 8, pageH - 52);

  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageW - marginX, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("Amiri", "normal");
  doc.setTextColor(30, 41, 59);

  const sigLabels = form.signatureLabels || ["توقيع الطالب", "توقيع ولي الأمر", "توقيع المعلم", "ختم المدرسة"];
  const sigW = contentW / sigLabels.length;

  sigLabels.forEach((label, i) => {
    const xCenter = marginX + sigW * i + sigW / 2;
    doc.text(label, xCenter, y, { align: "center" });
    doc.setDrawColor(150, 160, 170);
    doc.setLineWidth(0.4);
    doc.line(xCenter - 20, y + 18, xCenter + 20, y + 18);
  });

  // ========== BOTTOM QR ==========
  const qrY = pageH - 28;
  drawQrPattern(doc, marginX + 2, qrY - 2, 18, refNumber);

  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text(`رقم المرجع: ${refNumber}`, marginX + 24, qrY + 6);
  doc.text("ثانوية الفيصلية - ألفا فيزياء", marginX + 24, qrY + 10);

  // Bottom decorative border
  doc.setDrawColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.setLineWidth(0.3);
  doc.line(marginX, pageH - 10, pageW - marginX, pageH - 10);
  doc.setLineWidth(1.2);
  doc.line(marginX, pageH - 8, pageW - marginX, pageH - 8);

  // Return blob + filename, or save directly
  const fileName = `${form.title} - ${fieldValues.student_name || "نموذج"}.pdf`;

  if (options?.returnBlob) {
    const blob = doc.output("blob");
    return { blob, fileName };
  }

  doc.save(fileName);
  return { blob: null, fileName };
}
