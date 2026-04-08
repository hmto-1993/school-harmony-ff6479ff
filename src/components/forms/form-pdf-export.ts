import jsPDF from "jspdf";
import type { FormTemplate } from "./form-templates";

interface StudentInfo {
  id: string;
  full_name: string;
  national_id: string | null;
}

/**
 * Generates an official Saudi‐style A4 PDF for a given form template.
 */
export async function exportFormPdf(
  form: FormTemplate,
  fieldValues: Record<string, string>,
  student: StudentInfo,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const contentW = pageW - marginX * 2;
  let y = 12;

  // --- Load Arabic font if available (fallback to default) ---
  // jsPDF default font handles basic Arabic with the right setup
  doc.setFont("helvetica");

  // ========== HEADER ==========
  // Top border line
  doc.setDrawColor(0, 102, 153);
  doc.setLineWidth(1);
  doc.line(marginX, y, pageW - marginX, y);
  y += 6;

  // Right side: school logo text
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const rightLines = ["المملكة العربية السعودية", "وزارة التعليم", "ثانوية الفيصلية"];
  rightLines.forEach((line, i) => {
    doc.text(line, pageW - marginX, y + i * 5, { align: "right" });
  });

  // Left side
  const leftLines = ["ألفا فيزياء", "Alpha Physics"];
  leftLines.forEach((line, i) => {
    doc.text(line, marginX, y + i * 5, { align: "left" });
  });

  y += 18;

  // Title
  doc.setFontSize(16);
  doc.setTextColor(0, 102, 153);
  doc.text(form.title, pageW / 2, y, { align: "center" });
  y += 4;

  // Underline
  const titleW = doc.getTextWidth(form.title);
  doc.setDrawColor(0, 102, 153);
  doc.setLineWidth(0.5);
  doc.line(pageW / 2 - titleW / 2 - 5, y, pageW / 2 + titleW / 2 + 5, y);
  y += 10;

  // ========== FORM BODY ==========
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);

  const nonAutoFields = form.fields.filter((f) => f.type !== "auto");
  const autoFields = form.fields.filter((f) => f.type === "auto");

  // Auto fields row (student info)
  if (autoFields.length > 0) {
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(marginX, y - 2, contentW, 24, 3, 3, "F");

    doc.setFontSize(10);
    let infoY = y + 4;

    const infoLines = autoFields.map((f) => `${f.label}: ${fieldValues[f.id] || "—"}`);

    // Draw in 2 columns
    const colW = contentW / 2;
    infoLines.forEach((line, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const xPos = col === 0 ? pageW - marginX - 5 : pageW - marginX - colW - 5;
      doc.text(line, xPos, infoY + row * 7, { align: "right" });
    });

    y += 28;
  }

  // Separator
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageW - marginX, y);
  y += 8;

  // Render non-auto fields
  for (const field of nonAutoFields) {
    const value = fieldValues[field.id] || "";

    // Check page overflow
    if (y > pageH - 50) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`${field.label}:`, pageW - marginX, y, { align: "right" });
    y += 6;

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);

    if (field.type === "textarea" && value) {
      // Wrap long text
      const lines = doc.splitTextToSize(value, contentW - 10);
      // Draw box
      const boxH = Math.max(lines.length * 6 + 6, 20);
      doc.setDrawColor(200, 210, 220);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, y - 2, contentW, boxH, 2, 2, "S");
      doc.text(lines, pageW - marginX - 5, y + 3, { align: "right" });
      y += boxH + 4;
    } else {
      // Single line with underline
      doc.text(value || "................................................................", pageW - marginX - 5, y, { align: "right" });
      y += 8;
    }
  }

  // ========== QR CODE for confidential_referral ==========
  if (form.id === "confidential_referral" && student.id) {
    y += 5;
    if (y > pageH - 60) {
      doc.addPage();
      y = 20;
    }

    // Simple QR placeholder - generate a text-based QR reference
    const qrUrl = `${window.location.origin}/student?id=${student.national_id || student.id}`;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("رابط الصفحة السلوكية:", pageW / 2, y, { align: "center" });
    y += 5;
    doc.setTextColor(0, 102, 153);
    doc.text(qrUrl, pageW / 2, y, { align: "center" });
    y += 3;

    // Draw a QR-like box as visual indicator
    const qrSize = 25;
    const qrX = pageW / 2 - qrSize / 2;
    doc.setDrawColor(0, 102, 153);
    doc.setLineWidth(1);
    doc.rect(qrX, y, qrSize, qrSize, "S");

    // Inner pattern (simple representation)
    doc.setFillColor(0, 102, 153);
    const cellSize = qrSize / 7;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        // Draw corners and some pattern
        const isCorner =
          (r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3);
        const isData = (r + c) % 3 === 0;
        if (isCorner || isData) {
          doc.rect(qrX + c * cellSize, y + r * cellSize, cellSize, cellSize, "F");
        }
      }
    }
    y += qrSize + 8;
  }

  // ========== FOOTER: Signature & Stamp ==========
  y = Math.max(y + 10, pageH - 55);

  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageW - marginX, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);

  // Signature boxes
  const sigLabels = ["توقيع الطالب", "توقيع ولي الأمر", "توقيع المعلم", "ختم المدرسة"];
  const sigW = contentW / sigLabels.length;

  sigLabels.forEach((label, i) => {
    const xCenter = marginX + sigW * i + sigW / 2;
    doc.text(label, xCenter, y, { align: "center" });
    doc.line(xCenter - 18, y + 15, xCenter + 18, y + 15);
  });

  // Bottom decorative line
  doc.setDrawColor(0, 102, 153);
  doc.setLineWidth(1);
  doc.line(marginX, pageH - 10, pageW - marginX, pageH - 10);

  // Save
  const fileName = `${form.title} - ${fieldValues.student_name || "نموذج"}.pdf`;
  doc.save(fileName);
}
