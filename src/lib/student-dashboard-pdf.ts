import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getArabicTableStyles, registerArabicFont } from "@/lib/arabic-pdf";
import { safeDownload } from "@/lib/download-utils";
import type { ParentVisibility, PdfHeader } from "@/components/student-dashboard/constants";

type EvaluationLevel = "excellent" | "average" | "zero" | "star";

type StudentPdfInput = {
  student: any;
  isParent: boolean;
  parentVis: ParentVisibility;
  schoolName: string;
  schoolLogoUrl: string;
  parentPdfHeader: PdfHeader;
};

const PAGE_MARGIN_X = 12;
const PAGE_TOP = 12;
const PAGE_BOTTOM = 14;
const PARTICIPATION_SLOTS = 3;

const STATUS_META: Record<string, { label: string; fill: [number, number, number]; text: [number, number, number] }> = {
  present: { label: "حاضر", fill: [240, 253, 244], text: [22, 163, 74] },
  absent: { label: "غائب", fill: [255, 241, 242], text: [225, 29, 72] },
  late: { label: "متأخر", fill: [255, 251, 235], text: [245, 158, 11] },
  early_leave: { label: "خروج مبكر", fill: [255, 247, 237], text: [249, 115, 22] },
  sick_leave: { label: "إجازة مرضية", fill: [239, 246, 255], text: [37, 99, 235] },
};

const BEHAVIOR_META: Record<string, { label: string; fill: [number, number, number]; text: [number, number, number] }> = {
  positive: { label: "إيجابي", fill: [240, 253, 244], text: [22, 163, 74] },
  negative: { label: "سلبي", fill: [255, 241, 242], text: [225, 29, 72] },
  neutral: { label: "محايد", fill: [255, 251, 235], text: [245, 158, 11] },
  "إيجابي": { label: "إيجابي", fill: [240, 253, 244], text: [22, 163, 74] },
  "سلبي": { label: "سلبي", fill: [255, 241, 242], text: [225, 29, 72] },
  "محايد": { label: "محايد", fill: [255, 251, 235], text: [245, 158, 11] },
};

const EVAL_TONES: Record<EvaluationLevel | "empty", { stroke: [number, number, number]; fill?: [number, number, number] }> = {
  excellent: { stroke: [22, 163, 74] },
  average: { stroke: [245, 158, 11] },
  zero: { stroke: [225, 29, 72] },
  star: { stroke: [245, 158, 11], fill: [245, 158, 11] },
  empty: { stroke: [203, 213, 225] },
};

function lineAdvance(fontSize: number) {
  return Math.max(4.2, fontSize * 0.38);
}

function ensurePageSpace(doc: jsPDF, cursorY: number, neededHeight = 24) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (cursorY + neededHeight > pageHeight - PAGE_BOTTOM) {
    doc.addPage();
    return PAGE_TOP;
  }
  return cursorY;
}

function drawWrappedCenteredText(
  doc: jsPDF,
  text: string,
  y: number,
  options: {
    fontSize: number;
    fontStyle?: "normal" | "bold";
    color?: [number, number, number];
    maxWidth?: number;
  },
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = options.maxWidth ?? pageWidth - PAGE_MARGIN_X * 2;
  const lines = doc.splitTextToSize(String(text || ""), maxWidth) as string[];

  doc.setFont("Amiri", options.fontStyle || "normal");
  doc.setFontSize(options.fontSize);
  if (options.color) {
    doc.setTextColor(...options.color);
  } else {
    doc.setTextColor(30, 30, 30);
  }

  doc.text(lines, pageWidth / 2, y, { align: "center" });
  return y + lines.length * lineAdvance(options.fontSize);
}

function drawSectionTitle(doc: jsPDF, title: string, y: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("Amiri", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 64, 175);
  doc.text(title, pageWidth - PAGE_MARGIN_X, y, { align: "right" });
  doc.setTextColor(30, 30, 30);
  return y + 2;
}

function cleanBehaviorNote(note?: string) {
  if (!note) return "-";
  return note.replace(/\[severity:\w+\]\s*/g, "").trim() || "-";
}

function isParticipationCategory(name: string) {
  return name === "المشاركة" || name.includes("المشاركة");
}

function getEvaluationLevel(score: number | null, maxScore: number, categoryName: string): EvaluationLevel | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null;

  const normalizedScore = Number(score);
  const normalizedMaxScore = Number(maxScore) || 100;
  const isParticipation = isParticipationCategory(categoryName);

  if (normalizedScore >= normalizedMaxScore && isParticipation) return "star";
  if (normalizedScore >= normalizedMaxScore) return "excellent";
  if (normalizedScore === 0) return "zero";

  const slotCount = isParticipation ? PARTICIPATION_SLOTS : 1;
  const perSlot = Math.round(normalizedMaxScore / slotCount);
  const averageScore = Math.round(perSlot / 2);

  if (normalizedScore >= perSlot) return "excellent";
  if (normalizedScore >= averageScore) return "average";
  return "zero";
}

function getEvaluationIconLevels(score: number | null, maxScore: number, categoryName: string): EvaluationLevel[] {
  if (score === null || score === undefined || Number.isNaN(score)) return ["zero"];

  const normalizedScore = Number(score);
  const normalizedMaxScore = Number(maxScore) || 100;
  const isParticipation = isParticipationCategory(categoryName);

  if (normalizedScore <= 0) return ["zero"];
  if (normalizedScore >= normalizedMaxScore && isParticipation) return ["star"];
  if (normalizedScore >= normalizedMaxScore) return ["excellent"];

  const slotCount = isParticipation ? PARTICIPATION_SLOTS : 1;
  const perSlot = Math.round(normalizedMaxScore / slotCount);
  const averageScore = Math.round(perSlot / 2);
  const icons: EvaluationLevel[] = [];
  let remaining = normalizedScore;

  while (remaining > 0 && icons.length < slotCount) {
    if (remaining >= perSlot) {
      icons.push("excellent");
      remaining -= perSlot;
    } else if (remaining >= averageScore) {
      icons.push("average");
      remaining -= averageScore;
    } else {
      icons.push("average");
      remaining = 0;
    }
  }

  return icons.length > 0 ? icons : ["zero"];
}

function getImageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function drawPdfHeader(doc: jsPDF, input: StudentPdfInput) {
  const { student, schoolName, schoolLogoUrl, parentPdfHeader, parentVis } = input;
  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = PAGE_TOP;

  const hasCustomHeader = Boolean(parentPdfHeader.line1 || parentPdfHeader.line2 || parentPdfHeader.line3);
  const logoDataUrl = parentPdfHeader.showLogo && schoolLogoUrl ? await imageUrlToDataUrl(schoolLogoUrl) : null;

  if (hasCustomHeader) {
    if (logoDataUrl) {
      try {
        doc.addImage(
          logoDataUrl,
          getImageFormatFromDataUrl(logoDataUrl),
          pageWidth - PAGE_MARGIN_X - 18,
          cursorY - 1,
          18,
          18,
        );
      } catch {
      }
    }

    if (parentPdfHeader.line1) {
      cursorY = drawWrappedCenteredText(doc, parentPdfHeader.line1, cursorY, {
        fontSize: 14,
        fontStyle: "bold",
        color: [30, 58, 95],
      });
    }

    if (parentPdfHeader.line2) {
      cursorY = drawWrappedCenteredText(doc, parentPdfHeader.line2, cursorY, {
        fontSize: 11,
        color: [51, 65, 85],
      });
    }

    if (parentPdfHeader.line3) {
      cursorY = drawWrappedCenteredText(doc, parentPdfHeader.line3, cursorY, {
        fontSize: 11,
        color: [51, 65, 85],
      });
    }

    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.45);
    doc.line(PAGE_MARGIN_X, cursorY + 1, pageWidth - PAGE_MARGIN_X, cursorY + 1);
    cursorY += 7;
  } else if (schoolName) {
    cursorY = drawWrappedCenteredText(doc, schoolName, cursorY, {
      fontSize: 16,
      fontStyle: "bold",
      color: [30, 58, 95],
    });
    cursorY += 1;
  }

  cursorY = drawWrappedCenteredText(doc, `تقرير الطالب: ${student.full_name || ""}`, cursorY, {
    fontSize: 15,
    fontStyle: "bold",
    color: [51, 51, 51],
  });

  const classInfo = student.class
    ? `${student.class.name} - ${student.class.grade} (${student.class.section})`
    : "";

  if (classInfo) {
    cursorY = drawWrappedCenteredText(doc, classInfo, cursorY, {
      fontSize: 10,
      color: [100, 116, 139],
    });
  }

  if (parentVis.parentShowNationalId && student.national_id) {
    cursorY = drawWrappedCenteredText(doc, `الهوية الوطنية: ${student.national_id}`, cursorY, {
      fontSize: 10,
      color: [100, 116, 139],
    });
  }

  const reportDate = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  cursorY = drawWrappedCenteredText(doc, "تاريخ التقرير", cursorY, {
    fontSize: 9,
    color: [148, 163, 184],
  });

  cursorY = drawWrappedCenteredText(doc, reportDate, cursorY, {
    fontSize: 9,
    color: [148, 163, 184],
  });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.line(PAGE_MARGIN_X, cursorY + 1, pageWidth - PAGE_MARGIN_X, cursorY + 1);
  return cursorY + 7;
}

function drawStar(doc: jsPDF, cx: number, cy: number, radius: number) {
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const pointRadius = i % 2 === 0 ? radius : radius * 0.45;
    points.push({
      x: cx + pointRadius * Math.cos(angle),
      y: cy + pointRadius * Math.sin(angle),
    });
  }

  const relativeLines: [number, number][] = [];
  for (let i = 1; i < points.length; i += 1) {
    relativeLines.push([points[i].x - points[i - 1].x, points[i].y - points[i - 1].y]);
  }
  relativeLines.push([points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y]);

  doc.lines(relativeLines, points[0].x, points[0].y, [1, 1], "FD", false);
}

function drawEvaluationIcon(doc: jsPDF, level: EvaluationLevel | null, centerX: number, centerY: number, size = 3.7) {
  const tone = level ? EVAL_TONES[level] : EVAL_TONES.empty;
  const radius = size / 2;

  doc.setDrawColor(...tone.stroke);
  doc.setLineWidth(0.5);

  if (level === "star") {
    doc.setFillColor(...(tone.fill || tone.stroke));
    drawStar(doc, centerX, centerY, radius);
    return;
  }

  doc.circle(centerX, centerY, radius, "S");

  if (level === "excellent") {
    doc.line(centerX - radius * 0.55, centerY + radius * 0.05, centerX - radius * 0.15, centerY + radius * 0.45);
    doc.line(centerX - radius * 0.15, centerY + radius * 0.45, centerX + radius * 0.6, centerY - radius * 0.4);
    return;
  }

  if (level === "average") {
    doc.line(centerX - radius * 0.55, centerY, centerX + radius * 0.55, centerY);
    return;
  }

  if (level === "zero") {
    doc.line(centerX - radius * 0.45, centerY - radius * 0.45, centerX + radius * 0.45, centerY + radius * 0.45);
    doc.line(centerX + radius * 0.45, centerY - radius * 0.45, centerX - radius * 0.45, centerY + radius * 0.45);
  }
}

function drawEvaluationIconsRow(doc: jsPDF, levels: EvaluationLevel[], cell: { x: number; y: number; width: number; height: number }) {
  const size = 3.7;
  const gap = 0.9;
  const totalWidth = levels.length * size + Math.max(0, levels.length - 1) * gap;
  let startX = cell.x + (cell.width - totalWidth) / 2 + size / 2;
  const centerY = cell.y + cell.height / 2;

  levels.forEach((level) => {
    drawEvaluationIcon(doc, level, startX, centerY, size);
    startX += size + gap;
  });
}

function getEffectiveVisibility(student: any, isParent: boolean, parentVis: ParentVisibility) {
  const vis = student.visibility || { grades: true, attendance: true, behavior: true };
  return isParent
    ? {
        grades: vis.grades && parentVis.parentShowGrades,
        attendance: vis.attendance && parentVis.parentShowAttendance,
        behavior: vis.behavior && parentVis.parentShowBehavior,
      }
    : vis;
}

function getEvaluationState(student: any, isParent: boolean, parentVis: ParentVisibility) {
  const studentEval = student.evalSettings || { showDaily: true, showClasswork: true, iconsCount: 10 };
  const showDaily = isParent ? parentVis.parentShowDailyGrades : studentEval.showDaily;
  const showClasswork = isParent ? parentVis.parentShowClassworkIcons : studentEval.showClasswork;
  const effectiveIconsCount = Math.max(1, Number(isParent ? parentVis.parentClassworkIconsCount : studentEval.iconsCount) || 10);
  const studentClassId = student.class_id;

  const isCategoryHidden = (categoryId: string) => {
    if (!isParent) return false;

    const classScopedHidden = studentClassId
      ? parentVis.parentGradesHiddenCategories.classes?.[studentClassId] || []
      : [];

    if (classScopedHidden.length > 0) {
      return classScopedHidden.includes(categoryId);
    }

    return (parentVis.parentGradesHiddenCategories.global || []).includes(categoryId);
  };

  const filteredGrades = Array.isArray(student.grades)
    ? student.grades.filter((grade: any) => {
        if (isCategoryHidden(grade.category_id)) return false;

        if (isParent && parentVis.parentGradesVisiblePeriods !== "both" && grade.period !== undefined) {
          if (parentVis.parentGradesVisiblePeriods === "1" && grade.period !== 1) return false;
          if (parentVis.parentGradesVisiblePeriods === "2" && grade.period !== 2) return false;
        }

        return true;
      })
    : [];

  return { showDaily, showClasswork, effectiveIconsCount, filteredGrades };
}

function drawLegend(doc: jsPDF, cursorY: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  cursorY = ensurePageSpace(doc, cursorY, 10);

  const items: Array<{ label: string; level: EvaluationLevel | null }> = [
    { label: "متميز", level: "star" },
    { label: "ممتاز", level: "excellent" },
    { label: "متوسط", level: "average" },
    { label: "ضعيف", level: "zero" },
    { label: "لم يُقيّم", level: null },
  ];

  const itemWidth = 34;
  const startX = pageWidth - PAGE_MARGIN_X - itemWidth / 2;

  doc.setFont("Amiri", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  items.forEach((item, index) => {
    const centerX = startX - index * itemWidth;
    drawEvaluationIcon(doc, item.level, centerX, cursorY + 1.5, 3.2);
    doc.text(item.label, centerX - 4.2, cursorY + 2.4, { align: "right" });
  });

  doc.setTextColor(30, 30, 30);
  return cursorY + 8;
}

export async function buildStudentDashboardPdf(input: StudentPdfInput) {
  const { student, isParent, parentVis } = input;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registerArabicFont(doc);
  

  const tableStyles = getArabicTableStyles();
  const effectiveVis = getEffectiveVisibility(student, isParent, parentVis);
  const { showDaily, showClasswork, effectiveIconsCount, filteredGrades } = getEvaluationState(student, isParent, parentVis);

  const attendance = Array.isArray(student.attendance) ? student.attendance : [];
  const behaviors = Array.isArray(student.behaviors) ? student.behaviors : [];

  let cursorY = await drawPdfHeader(doc, input);
  let renderedSection = false;

  if (effectiveVis.grades && filteredGrades.length > 0) {
    const classworkGrades = filteredGrades.filter((grade: any) => grade.grade_categories?.category_group === "classwork");

    if (showDaily) {
      const dailyGrades = classworkGrades.filter((grade: any) => grade.date);
      const uniqueDates = Array.from(new Set<string>(dailyGrades.map((grade: any) => grade.date))).sort().slice(-7);
      const dailyCategoryNames = Array.from(new Set<string>(dailyGrades.map((grade: any) => grade.grade_categories?.name).filter(Boolean)));
      const dayLabels: Record<number, string> = { 0: "الأحد", 1: "الإثنين", 2: "الثلاثاء", 3: "الأربعاء", 4: "الخميس", 5: "الجمعة", 6: "السبت" };

      if (uniqueDates.length > 0 && dailyCategoryNames.length > 0) {
        cursorY = ensurePageSpace(doc, cursorY, 28);
        cursorY = drawSectionTitle(doc, "التقييم المستمر — تفاعل اليوم", cursorY);

        const dailyRows = uniqueDates.map((date) => {
          const day = new Date(date);
          const dateLabel = `${dayLabels[day.getDay()] || ""} ${day.getDate()}/${day.getMonth() + 1}`;
          const iconCells = dailyCategoryNames.map((categoryName) => {
            const grade = dailyGrades.find((entry: any) => entry.date === date && entry.grade_categories?.name === categoryName);
            const level = grade
              ? getEvaluationLevel(Number(grade.score), Number(grade.grade_categories?.max_score || 100), categoryName)
              : null;

            return {
              content: "",
              styles: { minCellHeight: 9, cellPadding: 1.5, halign: "center" },
              meta: { render: "eval-single", level },
            } as any;
          });

          return [
            ...iconCells,
            {
              content: dateLabel,
              styles: { halign: "right", fontStyle: "bold" },
            },
          ];
        });

        autoTable(doc, {
          startY: cursorY,
          margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
          theme: "grid",
          head: [[...dailyCategoryNames, "اليوم"]],
          body: dailyRows,
          styles: {
            ...tableStyles.styles,
            font: "Amiri",
            fontSize: 8,
            halign: "center",
            overflow: "linebreak",
          },
          headStyles: tableStyles.headStyles,
          alternateRowStyles: tableStyles.alternateRowStyles,
          bodyStyles: tableStyles.bodyStyles,
          columnStyles: {
            [dailyCategoryNames.length]: { halign: "right", fontStyle: "bold" },
          },
          didParseCell: (data: any) => {
            const raw = data.cell.raw as any;
            if (data.section === "body" && raw?.meta?.render === "eval-single") {
              data.cell.text = [""];
            }
          },
          didDrawCell: (data: any) => {
            const raw = data.cell.raw as any;
            if (data.section === "body" && raw?.meta?.render === "eval-single") {
              drawEvaluationIcon(doc, raw.meta.level ?? null, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, 3.7);
            }
          },
        } as any);

        cursorY = (((doc as any).lastAutoTable?.finalY as number) || cursorY) + 5;
        renderedSection = true;
      }
    }

    if (showClasswork) {
      const classworkCategoryNames = Array.from(new Set<string>(classworkGrades.map((grade: any) => grade.grade_categories?.name).filter(Boolean)));

      if (classworkCategoryNames.length > 0) {
        cursorY = ensurePageSpace(doc, cursorY, 24);
        cursorY = drawSectionTitle(doc, "التقييم المستمر — التفاعل الكلي", cursorY);

        const classworkRows = classworkCategoryNames.map((categoryName) => {
          const categoryGrades = classworkGrades
            .filter((grade: any) => grade.grade_categories?.name === categoryName)
            .sort((a: any, b: any) => String(a.date || "").localeCompare(String(b.date || "")));

          const allIcons = categoryGrades.flatMap((grade: any) =>
            getEvaluationIconLevels(Number(grade.score), Number(grade.grade_categories?.max_score || 100), categoryName),
          );
          const displayIcons = allIcons.slice(-effectiveIconsCount);

          return [
            {
              content: displayIcons.length ? "" : "لا توجد بيانات",
              styles: { minCellHeight: 10, cellPadding: 1.5, halign: "center" },
              meta: displayIcons.length ? { render: "eval-multi", levels: displayIcons } : undefined,
            },
            {
              content: categoryName,
              styles: { halign: "right", fontStyle: "bold" },
            },
          ];
        });

        autoTable(doc, {
          startY: cursorY,
          margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
          theme: "grid",
          head: [["التقييم", "فئة التقييم"]],
          body: classworkRows,
          styles: {
            ...tableStyles.styles,
            font: "Amiri",
            fontSize: 9,
            halign: "center",
            overflow: "linebreak",
          },
          headStyles: tableStyles.headStyles,
          alternateRowStyles: tableStyles.alternateRowStyles,
          bodyStyles: tableStyles.bodyStyles,
          columnStyles: {
            0: { halign: "center" },
            1: { halign: "right", fontStyle: "bold" },
          },
          didParseCell: (data: any) => {
            const raw = data.cell.raw as any;
            if (data.section === "body" && raw?.meta?.render === "eval-multi") {
              data.cell.text = [""];
            }
          },
          didDrawCell: (data: any) => {
            const raw = data.cell.raw as any;
            if (data.section === "body" && raw?.meta?.render === "eval-multi") {
              drawEvaluationIconsRow(doc, raw.meta.levels || [], data.cell);
            }
          },
        } as any);

        cursorY = (((doc as any).lastAutoTable?.finalY as number) || cursorY) + 4;
        cursorY = drawLegend(doc, cursorY);
        renderedSection = true;
      }
    }
  }

  if (effectiveVis.attendance && attendance.length > 0) {
    cursorY = ensurePageSpace(doc, cursorY, 24);
    cursorY = drawSectionTitle(doc, "سجل الحضور", cursorY);

    const attendanceRows = attendance.map((entry: any) => {
      const status = STATUS_META[entry.status] || {
        label: entry.status || "-",
        fill: [248, 250, 252] as [number, number, number],
        text: [100, 116, 139] as [number, number, number],
      };

      return [
        entry.notes || "-",
        {
          content: status.label,
          meta: { render: "status-badge", status: entry.status },
          styles: { halign: "center", fontStyle: "bold" },
        },
        entry.date || "-",
      ];
    });

    autoTable(doc, {
      startY: cursorY,
      margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
      theme: "grid",
      head: [["ملاحظات", "الحالة", "التاريخ"]],
      body: attendanceRows,
      styles: {
        ...tableStyles.styles,
        font: "Amiri",
        fontSize: 9,
        overflow: "linebreak",
      },
      headStyles: tableStyles.headStyles,
      alternateRowStyles: tableStyles.alternateRowStyles,
      bodyStyles: tableStyles.bodyStyles,
      columnStyles: {
        0: { halign: "right" },
        1: { halign: "center" },
        2: { halign: "right", fontStyle: "bold" },
      },
      didParseCell: (data: any) => {
        const raw = data.cell.raw as any;
        if (data.section === "body" && raw?.meta?.render === "status-badge") {
          const meta = STATUS_META[raw.meta.status] || null;
          if (meta) {
            data.cell.styles.fillColor = meta.fill;
            data.cell.styles.textColor = meta.text;
          }
        }
      },
    } as any);

    cursorY = (((doc as any).lastAutoTable?.finalY as number) || cursorY) + 5;
    renderedSection = true;
  }

  if (effectiveVis.behavior && behaviors.length > 0) {
    cursorY = ensurePageSpace(doc, cursorY, 24);
    cursorY = drawSectionTitle(doc, "التقييمات السلوكية", cursorY);

    const behaviorRows = behaviors.map((entry: any, index: number) => {
      const meta = BEHAVIOR_META[entry.type] || {
        label: entry.type || "—",
        fill: [248, 250, 252] as [number, number, number],
        text: [100, 116, 139] as [number, number, number],
      };

      return [
        cleanBehaviorNote(entry.note),
        {
          content: meta.label,
          meta: { render: "behavior-badge", type: entry.type },
          styles: { halign: "center", fontStyle: "bold" },
        },
        entry.date || "-",
        String(index + 1),
      ];
    });

    autoTable(doc, {
      startY: cursorY,
      margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
      theme: "grid",
      head: [["الملاحظة", "السلوك", "التاريخ", "#"]],
      body: behaviorRows,
      styles: {
        ...tableStyles.styles,
        font: "Amiri",
        fontSize: 9,
        overflow: "linebreak",
      },
      headStyles: tableStyles.headStyles,
      alternateRowStyles: tableStyles.alternateRowStyles,
      bodyStyles: tableStyles.bodyStyles,
      columnStyles: {
        0: { halign: "right" },
        1: { halign: "center" },
        2: { halign: "right", fontStyle: "bold" },
        3: { halign: "center", cellWidth: 10 },
      },
      didParseCell: (data: any) => {
        const raw = data.cell.raw as any;
        if (data.section === "body" && raw?.meta?.render === "behavior-badge") {
          const meta = BEHAVIOR_META[raw.meta.type] || null;
          if (meta) {
            data.cell.styles.fillColor = meta.fill;
            data.cell.styles.textColor = meta.text;
          }
        }
      },
    } as any);

    cursorY = (((doc as any).lastAutoTable?.finalY as number) || cursorY) + 5;
    renderedSection = true;
  }

  if (!renderedSection) {
    cursorY = ensurePageSpace(doc, cursorY, 20);
    doc.setFont("Amiri", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("لا توجد بيانات متاحة للتصدير حالياً", doc.internal.pageSize.getWidth() / 2, cursorY + 6, { align: "center" });
    doc.setTextColor(30, 30, 30);
  }

  await safeDownload(doc.output("blob") as Blob, `تقرير_${student.full_name || "student"}.pdf`);
}
