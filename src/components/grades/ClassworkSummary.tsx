import React, { useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Pencil, Check, X, ArrowDown, FileText, Printer, CircleCheck, CircleMinus, CircleX, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { createArabicPDF, getArabicTableStyles, finalizePDF } from "@/lib/arabic-pdf";
import autoTable from "jspdf-autotable";

import { format } from "date-fns";
import { toast as sonnerToast } from "sonner";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";

type GradeLevel = "excellent" | "average" | "zero";

const isParticipation = (name: string) => name === "المشاركة";
const MAX_PARTICIPATION_SLOTS = 3;

/** Maximum display icons per category in ClassworkSummary */
function getMaxDisplayIcons(catName: string): number {
  if (catName === "المشاركة") return 20;
  if (catName === "الواجبات") return 8;
  if (catName === "الكتاب") return 8;
  if (catName === "الأعمال والمشاريع") return 8;
  return 8; // default fallback
}

/** Decompose a daily score into colored icon levels */
function decomposeScoreToIcons(score: number, maxScore: number, catName: string): GradeLevel[] {
  if (score <= 0) return ["zero"];
  const isPartCat = isParticipation(catName);
  const slotCount = isPartCat ? MAX_PARTICIPATION_SLOTS : 1;
  const perSlot = Math.round(maxScore / slotCount);

  // Full score on participation → single star (handled separately)
  if (score >= maxScore && isPartCat) return ["excellent"]; // will render as star

  const icons: GradeLevel[] = [];
  let remaining = score;
  for (let si = 0; si < slotCount; si++) {
    if (remaining >= perSlot) {
      icons.push("excellent");
      remaining -= perSlot;
    } else if (remaining >= Math.round(perSlot / 2)) {
      icons.push("average");
      remaining -= Math.round(perSlot / 2);
    } else if (remaining > 0) {
      icons.push("average");
      remaining = 0;
    } else {
      icons.push("zero");
    }
  }
  return icons;
}

interface DailyIcon {
  level: GradeLevel;
  isFullScore: boolean; // render as star instead of circle
}

const DailyIconComponent = ({ icon, size = "h-4 w-4" }: { icon: DailyIcon; size?: string }) => {
  if (icon.isFullScore) return <Star className={cn(size, "text-amber-500 fill-amber-400")} />;
  if (icon.level === "excellent") return <CircleCheck className={cn(size, "text-emerald-600 dark:text-emerald-400")} />;
  if (icon.level === "average") return <CircleMinus className={cn(size, "text-amber-500 dark:text-amber-400")} />;
  return <CircleX className={cn(size, "text-rose-500 dark:text-rose-400")} />;
};

interface ClassInfo { id: string; name: string; }
interface CategoryInfo { id: string; name: string; weight: number; max_score: number; class_id: string; category_group: string; }

interface SummaryRow {
  student_id: string;
  full_name: string;
  class_name: string;
  class_id: string;
  manualScores: Record<string, number>;
  manualScoreIds: Record<string, string>;
  dailyIcons: Record<string, DailyIcon[]>; // accumulated icons from daily grades per category
}

interface ClassworkSummaryProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
  selectedPeriod?: number;
}

export default function ClassworkSummary({ selectedClass, onClassChange, selectedPeriod = 1 }: ClassworkSummaryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryInfo[]>([]);
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [searchName, setSearchName] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [tempEdits, setTempEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [fillAllValue, setFillAllValue] = useState("");
  const [fillAllCatId, setFillAllCatId] = useState<string>("");
  const tableRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handlePrintTable = async (classId: string, className: string) => {
    const tableEl = tableRefs.current.get(classId);
    if (!tableEl) return;

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1400,height=900");
    if (!printWindow) {
      toast({
        title: "تعذر فتح نافذة الطباعة",
        description: "تحقق من السماح بالنوافذ المنبثقة ثم أعد المحاولة",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8" />
          <title>طباعة المهام والمشاركة</title>
          <style>
            body { font-family: 'IBM Plex Sans Arabic', sans-serif; padding: 24px; color: #1a1a1a; background: #fff; }
            .print-loading { text-align: center; padding: 48px 24px; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="print-loading">جارٍ تجهيز الطباعة...</div>
        </body>
      </html>
    `);
    printWindow.document.close();

    const container = document.createElement("div");
    container.style.cssText = "direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif;color:#1a1a1a;background:#fff;";

    try {
      let headerConfig: any = null;
      const { data } = await supabase.from("site_settings").select("value").eq("id", "print_header_config_grades").single();
      if (data?.value) {
        try { headerConfig = JSON.parse(data.value); } catch {}
      }
      if (!headerConfig) {
        const { data: def } = await supabase.from("site_settings").select("value").eq("id", "print_header_config").single();
        if (def?.value) {
          try { headerConfig = JSON.parse(def.value); } catch {}
        }
      }
      if (headerConfig) {
        const headerDiv = document.createElement("div");
        headerDiv.style.cssText = "margin-bottom:10px;padding-bottom:6px;border-bottom:3px solid #3b82f6;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;";

        const rightDiv = document.createElement("div");
        rightDiv.style.cssText = `max-width:40%;text-align:center;font-size:${headerConfig.rightSection?.fontSize || 12}px;line-height:1.8;color:${headerConfig.rightSection?.color || "#1e293b"};`;
        (headerConfig.rightSection?.lines || []).forEach((line: string) => {
          const p = document.createElement("p");
          p.style.cssText = "margin:0;font-weight:600;";
          p.textContent = line;
          rightDiv.appendChild(p);
        });

        const centerDiv = document.createElement("div");
        centerDiv.style.cssText = "display:flex;align-items:center;gap:10px;flex-shrink:0;";
        (headerConfig.centerSection?.images || []).forEach((img: string, i: number) => {
          if (!img) return;
          const imgEl = document.createElement("img");
          imgEl.src = img;
          const size = headerConfig.centerSection?.imagesSizes?.[i] || 60;
          imgEl.style.cssText = `width:${size}px;height:${size}px;object-fit:contain;`;
          centerDiv.appendChild(imgEl);
        });

        const leftDiv = document.createElement("div");
        leftDiv.style.cssText = `max-width:40%;text-align:center;font-size:${headerConfig.leftSection?.fontSize || 12}px;line-height:1.8;color:${headerConfig.leftSection?.color || "#1e293b"};`;
        (headerConfig.leftSection?.lines || []).forEach((line: string) => {
          const p = document.createElement("p");
          p.style.cssText = "margin:0;font-weight:600;";
          p.textContent = line;
          leftDiv.appendChild(p);
        });

        headerDiv.appendChild(rightDiv);
        headerDiv.appendChild(centerDiv);
        headerDiv.appendChild(leftDiv);
        container.appendChild(headerDiv);
      }
    } catch {}

    const title = document.createElement("h2");
    title.style.cssText = "text-align:center;margin-bottom:4px;font-size:14px;font-weight:bold;";
    title.textContent = `المهام والمشاركة — ${className}`;
    const periodLabel = document.createElement("p");
    periodLabel.style.cssText = "text-align:center;margin-bottom:8px;font-size:11px;color:#666;";
    periodLabel.textContent = `${selectedPeriod === 1 ? "الفترة الأولى" : "الفترة الثانية"} — ${format(new Date(), "yyyy/MM/dd")}`;
    container.appendChild(title);
    container.appendChild(periodLabel);

    const clone = tableEl.cloneNode(true) as HTMLElement;
    clone.style.overflow = "visible";
    clone.style.width = "100%";
    clone.querySelectorAll("table").forEach((t) => {
      t.style.width = "100%";
      t.style.tableLayout = "auto";
      t.style.fontSize = "11px";
      t.style.borderCollapse = "collapse";
    });
    clone.querySelectorAll("th, td").forEach((el) => {
      const h = el as HTMLElement;
      h.style.color = "#1a1a1a";
      h.style.backgroundColor = "";
      h.style.padding = "3px 5px";
      h.style.border = "1px solid #d1d5db";
      h.style.fontSize = "11px";
      h.style.lineHeight = "1.4";
      h.style.textAlign = "center";
      h.style.overflow = "visible";
      h.style.whiteSpace = "nowrap";
    });
    clone.querySelectorAll("th").forEach((el) => {
      (el as HTMLElement).style.backgroundColor = "#eff6ff";
      (el as HTMLElement).style.fontWeight = "700";
    });
    clone.querySelectorAll("thead tr").forEach((row) => {
      const ths = row.querySelectorAll("th");
      if (ths.length >= 2) {
        ths[1].style.minWidth = "110px";
      }
    });
    clone.querySelectorAll("tbody tr").forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        cells[1].style.whiteSpace = "normal";
        cells[1].style.textAlign = "right";
        cells[1].style.minWidth = "110px";
      }
    });
    clone.querySelectorAll("*").forEach((el) => {
      const h = el as HTMLElement;
      if (h.tagName === "svg" || h.closest("svg")) return;
      if (!h.style.color) h.style.color = "#1a1a1a";
    });
    container.appendChild(clone);

    const headMarkup = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join("\n");

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8" />
          <title>طباعة المهام والمشاركة</title>
          ${headMarkup}
          <style>
            @page { size: A4 landscape; margin: 0mm 6mm 6mm 6mm; }
            html, body { background: #fff !important; color: #1a1a1a !important; }
            body { font-family: 'IBM Plex Sans Arabic', sans-serif; margin: 0; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            svg { width: 11px !important; height: 11px !important; }
          </style>
        </head>
        <body>
          ${container.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();

    const waitForAssets = () => {
      const images = Array.from(printWindow.document.images);
      if (images.length === 0) {
        setTimeout(() => printWindow.print(), 250);
        return;
      }

      let loaded = 0;
      const done = () => {
        loaded += 1;
        if (loaded === images.length) {
          setTimeout(() => printWindow.print(), 250);
        }
      };

      images.forEach((img) => {
        if (img.complete) {
          done();
        } else {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }
      });
    };

    printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
    waitForAssets();
  };

  const exportTableAsPDF = async (classId: string, className: string) => {
    const group = groupedByClass.find(g => g.id === classId);
    if (!group) return;
    try {
      const { doc, startY, watermark } = await createArabicPDF({
        orientation: "landscape",
        reportType: "grades",
        includeHeader: true,
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const tableStyles = getArabicTableStyles();

      doc.setFontSize(14);
      doc.text(`المهام والمشاركة — ${className}`, pageWidth / 2, startY, { align: "center" });
      doc.setFontSize(9);
      doc.text(format(new Date(), "yyyy/MM/dd"), pageWidth / 2, startY + 6, { align: "center" });
      doc.text(selectedPeriod === 1 ? "الفترة الأولى" : "الفترة الثانية", pageWidth / 2, startY + 11, { align: "center" });

      const classworkCats = group.categories;

      // Build headers: # | الطالب | [for each cat: icons col | score col] | الإجمالي
      // Reversed for RTL display
      const headers: string[] = [];
      headers.push("الإجمالي");
      [...classworkCats].reverse().forEach(cat => {
        headers.push(`الدرجة (${cat.max_score})`);
        headers.push(cat.name); // icons column header
      });
      headers.push("الطالب");
      headers.push("#");

      // Build rows with placeholder text for icon cells
      const rows: string[][] = group.students.map((sg, i) => {
        const sub = calcManualSubtotal(sg.manualScores, classworkCats);
        const row: string[] = [];
        row.push(`${sub.score} / ${sub.max}`);
        [...classworkCats].reverse().forEach(cat => {
          row.push(String(sg.manualScores[cat.id] ?? 0));
          row.push(""); // placeholder for icons - will be drawn manually
        });
        row.push(sg.full_name);
        row.push(String(i + 1));
        return row;
      });

      const nameColIndex = headers.length - 2;

      // Store icon data for each row/category to draw after table
      const reversedCats = [...classworkCats].reverse();
      const iconCellPositions: { rowIdx: number; catIdx: number; icons: DailyIcon[]; }[] = [];
      group.students.forEach((sg, rowIdx) => {
        reversedCats.forEach((cat, catIdx) => {
          const allIcons = sg.dailyIcons[cat.id] || [];
          const maxDisplay = getMaxDisplayIcons(cat.name);
          const icons = allIcons.slice(0, maxDisplay);
          if (icons.length > 0) {
            iconCellPositions.push({ rowIdx, catIdx, icons });
          }
        });
      });

      // Icon column indices in the headers array (after "الإجمالي", each cat has 2 cols: score at even, icons at odd)
      // icons col index for catIdx = 1 + catIdx * 2 + 1 = 2 + catIdx * 2
      const iconColIndices = reversedCats.map((_, ci) => 1 + ci * 2 + 1);

      autoTable(doc, {
        startY: startY + 15,
        head: [headers],
        body: rows,
        ...tableStyles,
        styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 1.5 },
        headStyles: { ...tableStyles.headStyles, fontSize: 7 },
        columnStyles: {
          [nameColIndex]: { halign: "right" as const, cellWidth: 35 },
          ...Object.fromEntries(iconColIndices.map(ci => [ci, { cellWidth: 28, halign: "center" as const }])),
        },
        didDrawCell: (data: any) => {
          if (data.section !== "body") return;
          const rowIdx = data.row.index;
          // Check if this column is an icon column
          const colIdx = data.column.index;
          const catLocalIdx = iconColIndices.indexOf(colIdx);
          if (catLocalIdx === -1) return;

          const entry = iconCellPositions.find(e => e.rowIdx === rowIdx && e.catIdx === catLocalIdx);
          if (!entry || entry.icons.length === 0) return;

          const cellX = data.cell.x;
          const cellY = data.cell.y;
          const cellW = data.cell.width;
          const cellH = data.cell.height;
          const r = 1.2; // icon radius
          const gap = 0.6;
          const iconsPerRow = Math.floor(cellW / (r * 2 + gap));
          const totalIcons = entry.icons.length;
          const rowCount = Math.ceil(totalIcons / iconsPerRow);
          const startYIcon = cellY + (cellH - rowCount * (r * 2 + gap)) / 2 + r;

          entry.icons.forEach((icon, idx) => {
            const rowI = Math.floor(idx / iconsPerRow);
            const colI = idx % iconsPerRow;
            const iconsInThisRow = Math.min(iconsPerRow, totalIcons - rowI * iconsPerRow);
            const rowWidth = iconsInThisRow * (r * 2 + gap) - gap;
            const offsetX = cellX + (cellW - rowWidth) / 2 + colI * (r * 2 + gap) + r;
            const offsetY = startYIcon + rowI * (r * 2 + gap);

            if (icon.isFullScore) {
              // Draw star shape in amber
              doc.setFillColor(245, 158, 11);
              drawPDFStar(doc, offsetX, offsetY, r * 1.1);
            } else if (icon.level === "excellent") {
              doc.setFillColor(16, 185, 129); // emerald
              doc.circle(offsetX, offsetY, r, "F");
            } else if (icon.level === "average") {
              doc.setFillColor(245, 158, 11); // amber
              doc.circle(offsetX, offsetY, r, "F");
            } else {
              doc.setFillColor(239, 68, 68); // rose
              doc.circle(offsetX, offsetY, r, "F");
              // Draw X mark
              doc.setDrawColor(255, 255, 255);
              doc.setLineWidth(0.3);
              doc.line(offsetX - r * 0.5, offsetY - r * 0.5, offsetX + r * 0.5, offsetY + r * 0.5);
              doc.line(offsetX + r * 0.5, offsetY - r * 0.5, offsetX - r * 0.5, offsetY + r * 0.5);
              doc.setDrawColor(0, 0, 0);
              doc.setLineWidth(0.1);
            }
          });
        },
      });

      finalizePDF(doc, `المهام_والمشاركة_${className}_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark);
      sonnerToast.success("تم تصدير ملف PDF بنجاح");
    } catch (err) {
      console.error(err);
      sonnerToast.error("حدث خطأ أثناء التصدير");
    }
  };

  /** Draw a simple 5-point star using filled polygon */
  const drawPDFStar = (doc: any, cx: number, cy: number, size: number) => {
    const points: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 2) + (i * Math.PI / 5);
      const r = i % 2 === 0 ? size : size * 0.45;
      points.push([cx + r * Math.cos(angle), cy - r * Math.sin(angle)]);
    }
    // Draw filled polygon using triangle fan
    for (let i = 1; i < points.length - 1; i++) {
      doc.triangle(
        points[0][0], points[0][1],
        points[i][0], points[i][1],
        points[i + 1][0], points[i + 1][1],
        "F"
      );
    }
  };

  useEffect(() => { loadAllData(); }, [selectedPeriod]);

  const loadAllData = async () => {
    setLoading(true);
    const [{ data: classesData }, { data: studentsData }, { data: catsData }] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("students").select("id, full_name, class_id").order("full_name"),
      supabase.from("grade_categories").select("*").order("sort_order"),
    ]);

    const cls = classesData || [];
    const students = studentsData || [];
    const cats = (catsData || []).filter((c: any) => c.category_group === 'classwork') as CategoryInfo[];
    const studentIds = students.map((s) => s.id);
    const catIds = cats.map((c) => c.id);

    let allManualScores: any[] = [];
    let allDailyGrades: any[] = [];
    if (studentIds.length > 0) {
      const [manualRes, dailyRes] = await Promise.all([
        supabase
          .from("manual_category_scores" as any)
          .select("id, student_id, category_id, score, period")
          .in("student_id", studentIds)
          .eq("period", selectedPeriod),
        catIds.length > 0
          ? supabase
              .from("grades")
              .select("student_id, category_id, score, date")
              .in("student_id", studentIds)
              .in("category_id", catIds)
              .eq("period", selectedPeriod)
              .order("date")
          : Promise.resolve({ data: [] }),
      ]);
      allManualScores = (manualRes.data as any[]) || [];
      allDailyGrades = (dailyRes.data as any[]) || [];
    }

    const manualMap = new Map<string, Map<string, { score: number; id: string }>>();
    allManualScores.forEach((m: any) => {
      if (!manualMap.has(m.student_id)) manualMap.set(m.student_id, new Map());
      manualMap.get(m.student_id)!.set(m.category_id, { score: Number(m.score), id: m.id });
    });

    // Build daily icons map: student_id -> category_id -> DailyIcon[]
    const dailyIconsMap = new Map<string, Map<string, DailyIcon[]>>();
    allDailyGrades.forEach((g: any) => {
      if (g.score === null || g.score === undefined) return;
      const score = Number(g.score);
      const cat = cats.find(c => c.id === g.category_id);
      if (!cat) return;
      
      if (!dailyIconsMap.has(g.student_id)) dailyIconsMap.set(g.student_id, new Map());
      const studentMap = dailyIconsMap.get(g.student_id)!;
      if (!studentMap.has(g.category_id)) studentMap.set(g.category_id, []);
      
      const isFullScore = score >= Number(cat.max_score) && isParticipation(cat.name);
      if (isFullScore) {
        studentMap.get(g.category_id)!.push({ level: "excellent", isFullScore: true });
      } else {
        const levels = decomposeScoreToIcons(score, Number(cat.max_score), cat.name);
        levels.forEach(level => {
          studentMap.get(g.category_id)!.push({ level, isFullScore: false });
        });
      }
    });

    const classMap = new Map(cls.map((c) => [c.id, c.name]));

    const rows: SummaryRow[] = students.filter((s) => s.class_id).map((s) => {
      const classCats = cats.filter((c) => c.class_id === s.class_id || c.class_id === null);
      const studentManualMap = manualMap.get(s.id) || new Map();
      const studentDailyMap = dailyIconsMap.get(s.id) || new Map();
      const manualScores: Record<string, number> = {};
      const manualScoreIds: Record<string, string> = {};
      const dailyIcons: Record<string, DailyIcon[]> = {};

      classCats.forEach((c) => {
        const m = studentManualMap.get(c.id);
        manualScores[c.id] = m?.score ?? 0;
        if (m?.id) manualScoreIds[c.id] = m.id;
        dailyIcons[c.id] = studentDailyMap.get(c.id) || [];
      });

      return {
        student_id: s.id, full_name: s.full_name,
        class_name: classMap.get(s.class_id!) || "", class_id: s.class_id!,
        manualScores, manualScoreIds, dailyIcons,
      };
    });

    setClasses(cls);
    setAllCategories(cats);
    setSummaryRows(rows);
    setLoading(false);
  };

  const startEdit = (classId: string, students: SummaryRow[], editableCats: CategoryInfo[]) => {
    const edits: Record<string, string> = {};
    students.forEach(s => {
      editableCats.forEach(cat => {
        edits[`${s.student_id}__${cat.id}`] = String(s.manualScores[cat.id] ?? 0);
      });
    });
    setTempEdits(edits);
    setEditingClassId(classId);
    setFillAllValue("");
    setFillAllCatId("");
  };

  const cancelEdit = () => {
    setEditingClassId(null);
    setTempEdits({});
    setFillAllValue("");
    setFillAllCatId("");
  };

  const saveEdits = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const upserts: any[] = [];

      for (const [key, val] of Object.entries(tempEdits)) {
        const [studentId, categoryId] = key.split("__");
        const row = summaryRows.find(r => r.student_id === studentId);
        if (!row) continue;
        const cat = allCategories.find(c => c.id === categoryId);
        if (!cat) continue;
        const numVal = val === "" ? 0 : Math.min(Number(cat.max_score), Math.max(0, Number(val)));
        const existingId = row.manualScoreIds[categoryId];

        if (existingId) {
          upserts.push(supabase.from("manual_category_scores" as any).update({ score: numVal, updated_at: new Date().toISOString() }).eq("id", existingId).then(res => { if (res.error) throw res.error; }));
        } else {
          upserts.push(supabase.from("manual_category_scores" as any).insert({ student_id: studentId, category_id: categoryId, score: numVal, recorded_by: user.id, period: selectedPeriod }).then(res => { if (res.error) throw res.error; }));
        }
      }

      await Promise.all(upserts);
      setSaving(false);
      cancelEdit();
      toast({ title: "تم الحفظ", description: "تم حفظ الدرجات بنجاح" });
      loadAllData();
    } catch (err: any) {
      setSaving(false);
      toast({ title: "فشل حفظ الدرجات", description: err?.message || "حدث خطأ غير متوقع أثناء الحفظ.", variant: "destructive" });
    }
  };

  const filteredRows = summaryRows.filter((r) => {
    const matchesName = !searchName || r.full_name.includes(searchName);
    const matchesClass = !selectedClass || selectedClass === "all" || r.class_id === selectedClass;
    return matchesName && matchesClass;
  });

  const groupedByClass = classes
    .map((cls) => ({
      ...cls,
      students: filteredRows.filter((r) => r.class_id === cls.id),
      categories: allCategories.filter((c) => c.class_id === cls.id || c.class_id === null),
    }))
    .filter((g) => g.students.length > 0);

  const calcManualSubtotal = (scores: Record<string, number>, cats: CategoryInfo[]) => {
    let score = 0, max = 0;
    cats.forEach(cat => {
      max += Number(cat.max_score);
      score += scores[cat.id] ?? 0;
    });
    return { score, max };
  };

  if (loading) return <p className="text-center py-12 text-muted-foreground">جارٍ تحميل المهام والمشاركة...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 no-print">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث باسم الطالب..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="pr-9" />
        </div>
      </div>

      <div className="hidden print:block">
        <ReportPrintHeader reportType="grades" />
      </div>

      {groupedByClass.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">لا توجد بيانات بعد</p>
      ) : groupedByClass.map((group) => {
        const classworkCats = group.categories;
        const isEditing = editingClassId === group.id;

        return (
          <Card key={group.id} className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
            <CardHeader className="pb-3 no-print">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <Badge variant="secondary">{group.students.length} طالب</Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedPeriod === 1 ? "فترة أولى" : "فترة ثانية"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!isEditing && (
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="تصدير PDF" onClick={() => exportTableAsPDF(group.id, group.name)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="طباعة" onClick={async () => {
                        const tableEl = tableRefs.current.get(group.id);
                        if (!tableEl) return;

                        // Remove any leftover print container
                        document.getElementById("print-container")?.remove();

                        const container = document.createElement("div");
                        container.id = "print-container";
                        container.style.cssText = "direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif;";

                        try {
                          let headerConfig: any = null;
                          const { data } = await supabase.from("site_settings").select("value").eq("id", "print_header_config_grades").single();
                          if (data?.value) { try { headerConfig = JSON.parse(data.value); } catch {} }
                          if (!headerConfig) {
                            const { data: def } = await supabase.from("site_settings").select("value").eq("id", "print_header_config").single();
                            if (def?.value) { try { headerConfig = JSON.parse(def.value); } catch {} }
                          }
                          if (headerConfig) {
                            const headerDiv = document.createElement("div");
                            headerDiv.style.cssText = "margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #3b82f6;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;";
                            const rightDiv = document.createElement("div");
                            rightDiv.style.cssText = `max-width:40%;text-align:center;font-size:${headerConfig.rightSection?.fontSize||12}px;line-height:1.8;color:${headerConfig.rightSection?.color||"#1e293b"};`;
                            (headerConfig.rightSection?.lines||[]).forEach((line: string) => {
                              const p = document.createElement("p");
                              p.style.cssText = "margin:0;font-weight:600;";
                              p.textContent = line;
                              rightDiv.appendChild(p);
                            });
                            const centerDiv = document.createElement("div");
                            centerDiv.style.cssText = "display:flex;align-items:center;gap:10px;flex-shrink:0;";
                            (headerConfig.centerSection?.images||[]).forEach((img: string, i: number) => {
                              if (!img) return;
                              const imgEl = document.createElement("img");
                              imgEl.src = img;
                              const size = headerConfig.centerSection?.imagesSizes?.[i] || 60;
                              imgEl.style.cssText = `width:${size}px;height:${size}px;object-fit:contain;`;
                              centerDiv.appendChild(imgEl);
                            });
                            const leftDiv = document.createElement("div");
                            leftDiv.style.cssText = `max-width:40%;text-align:center;font-size:${headerConfig.leftSection?.fontSize||12}px;line-height:1.8;color:${headerConfig.leftSection?.color||"#1e293b"};`;
                            (headerConfig.leftSection?.lines||[]).forEach((line: string) => {
                              const p = document.createElement("p");
                              p.style.cssText = "margin:0;font-weight:600;";
                              p.textContent = line;
                              leftDiv.appendChild(p);
                            });
                            headerDiv.appendChild(rightDiv);
                            headerDiv.appendChild(centerDiv);
                            headerDiv.appendChild(leftDiv);
                            container.appendChild(headerDiv);
                          }
                        } catch {}

                        const title = document.createElement("h2");
                        title.style.cssText = "text-align:center;margin-bottom:4px;font-size:14px;font-weight:bold;";
                        title.textContent = `المهام والمشاركة — ${group.name}`;
                        const periodLabel = document.createElement("p");
                        periodLabel.style.cssText = "text-align:center;margin-bottom:8px;font-size:11px;color:#666;";
                        periodLabel.textContent = `${selectedPeriod === 1 ? "الفترة الأولى" : "الفترة الثانية"} — ${format(new Date(), "yyyy/MM/dd")}`;
                        container.appendChild(title);
                        container.appendChild(periodLabel);

                        const clone = tableEl.cloneNode(true) as HTMLElement;
                        clone.style.overflow = "visible";
                        clone.style.width = "100%";
                        clone.querySelectorAll("table").forEach(t => {
                          t.style.width = "100%";
                          t.style.tableLayout = "auto";
                          t.style.fontSize = "11px";
                          t.style.borderCollapse = "collapse";
                        });
                        clone.querySelectorAll("th, td").forEach(el => {
                          const h = el as HTMLElement;
                          h.style.color = "#1a1a1a";
                          h.style.backgroundColor = "";
                          h.style.padding = "3px 5px";
                          h.style.border = "1px solid #d1d5db";
                          h.style.fontSize = "11px";
                          h.style.lineHeight = "1.4";
                          h.style.textAlign = "center";
                          h.style.overflow = "visible";
                          h.style.whiteSpace = "nowrap";
                        });
                        clone.querySelectorAll("th").forEach(el => {
                          (el as HTMLElement).style.backgroundColor = "#eff6ff";
                          (el as HTMLElement).style.fontWeight = "700";
                        });
                        clone.querySelectorAll("thead tr").forEach(row => {
                          const ths = row.querySelectorAll("th");
                          if (ths.length >= 2) {
                            ths[1].style.minWidth = "110px";
                          }
                        });
                        clone.querySelectorAll("tbody tr").forEach(row => {
                          const cells = row.querySelectorAll("td");
                          if (cells.length >= 2) {
                            cells[1].style.whiteSpace = "normal";
                            cells[1].style.textAlign = "right";
                            cells[1].style.minWidth = "110px";
                          }
                        });
                        clone.querySelectorAll("*").forEach(el => {
                          const h = el as HTMLElement;
                          // Preserve SVG icon colors (stars, circles)
                          if (h.tagName === "svg" || h.closest("svg")) return;
                          if (!h.style.color) h.style.color = "#1a1a1a";
                        });
                        container.appendChild(clone);
                        document.body.appendChild(container);

                        // Force landscape for classwork print via injected @page rule
                        document.body.classList.add("print-landscape");
                        const orientationStyle = document.createElement("style");
                        orientationStyle.id = "classwork-print-orientation";
                        orientationStyle.media = "print";
                        orientationStyle.textContent = `@page { size: A4 landscape; margin: 0mm 6mm 6mm 6mm; }`;
                        document.head.appendChild(orientationStyle);

                        const cleanup = () => {
                          container.remove();
                          document.body.classList.remove("print-landscape");
                          orientationStyle.remove();
                        };
                        const handleAfterPrint = () => {
                          window.removeEventListener("afterprint", handleAfterPrint);
                          cleanup();
                        };
                        window.addEventListener("afterprint", handleAfterPrint);
                        setTimeout(() => window.print(), 200);
                      }}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {!isEditing ? (
                    <Button
                      size="sm" variant="outline"
                      className="h-8 gap-1.5"
                      disabled={editingClassId !== null && editingClassId !== group.id}
                      onClick={() => startEdit(group.id, group.students, classworkCats)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> تعديل الدرجات
                    </Button>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
                        <Select value={fillAllCatId} onValueChange={setFillAllCatId}>
                          <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs border-0 bg-transparent">
                            <SelectValue placeholder="اختر الفئة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">الجميع</SelectItem>
                            {classworkCats.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number" min={0}
                          placeholder="الدرجة"
                          value={fillAllValue}
                          onChange={(e) => setFillAllValue(e.target.value)}
                          className="w-14 h-7 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          dir="ltr"
                        />
                        <Button size="sm" variant="secondary" className="h-7 text-xs px-2 gap-1" onClick={() => {
                          if (!fillAllCatId || fillAllValue === "") return;
                          const newEdits = { ...tempEdits };
                          if (fillAllCatId === "__all__") {
                            group.students.forEach(s => {
                              classworkCats.forEach(cat => {
                                const val = Math.min(Number(cat.max_score), Math.max(0, Number(fillAllValue)));
                                newEdits[`${s.student_id}__${cat.id}`] = String(val);
                              });
                            });
                          } else {
                            const cat = classworkCats.find(c => c.id === fillAllCatId);
                            if (!cat) return;
                            const val = Math.min(Number(cat.max_score), Math.max(0, Number(fillAllValue)));
                            group.students.forEach(s => {
                              newEdits[`${s.student_id}__${fillAllCatId}`] = String(val);
                            });
                          }
                          setTempEdits(newEdits);
                        }}>
                          <ArrowDown className="h-3 w-3" /> ملء الكل
                        </Button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" onClick={saveEdits} disabled={saving} className="h-8 text-xs gap-1">
                          <Check className="h-3.5 w-3.5" /> حفظ
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving} className="h-8 text-xs gap-1">
                          <X className="h-3.5 w-3.5" /> إلغاء
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="hidden print:block text-center mb-2">
                <h2 className="text-sm font-bold">{group.name} — المهام والمشاركة — {selectedPeriod === 1 ? "الفترة الأولى" : "الفترة الثانية"}</h2>
              </div>
              <div ref={(el) => { if (el) tableRefs.current.set(group.id, el); }} className="overflow-x-auto rounded-xl border border-border/40 shadow-sm print:overflow-visible" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties}>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">#</th>
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 whitespace-nowrap w-0 bg-primary/10">الطالب</th>
                      {classworkCats.map(cat => (
                        <React.Fragment key={`sub-${cat.id}`}>
                          <th className={cn(
                            "text-center p-2 font-bold text-xs border-b-2 border-primary/20 min-w-[55px] border-r-2 border-r-border",
                            isEditing
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-info/10 text-info dark:bg-info/20"
                          )}>
                            <div className="leading-tight">{cat.name.split(/\s*و\s*/).length > 1 
                              ? cat.name.split(/\s*و\s*/).map((part, pi) => <div key={pi}>{pi > 0 ? `و${part}` : part}</div>)
                              : cat.name
                            }</div>
                          </th>
                          <th className={cn(
                            "text-center p-2 font-semibold text-xs border-b-2 border-primary/20 min-w-[55px]",
                            isEditing
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-warning/10 text-warning dark:bg-warning/20"
                          )}>
                            <div>الدرجة</div>
                            <div className="text-[10px] opacity-80">من {Number(cat.max_score)}</div>
                          </th>
                        </React.Fragment>
                      ))}
                      <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[80px] last:rounded-tl-xl">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.students.map((sg, i) => {
                      const isEven = i % 2 === 0;
                      const isLast = i === group.students.length - 1;
                      const sub = calcManualSubtotal(sg.manualScores, classworkCats);

                      return (
                        <tr key={sg.student_id} className={cn(
                          isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                          "border-b border-border/40",
                        )}>
                          <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{i + 1}</td>
                          <td className="p-3 font-semibold border-l border-border/10 whitespace-nowrap bg-primary/5">{sg.full_name}</td>

                          {classworkCats.map(cat => {
                            const cellKey = `${sg.student_id}__${cat.id}`;
                            const allIcons = sg.dailyIcons[cat.id] || [];
                            const maxDisplay = getMaxDisplayIcons(cat.name);
                            const icons = allIcons.slice(0, maxDisplay);
                            const manualScore = sg.manualScores[cat.id] ?? 0;
                            return (
                              <React.Fragment key={cat.id}>
                                {/* Icons column */}
                                <td className="p-1.5 text-center border-l border-border/10 border-r-2 border-r-border">
                                  {icons.length > 0 && (
                                    <div className="flex flex-wrap justify-center gap-0.5">
                                      {icons.map((icon, idx) => (
                                        <DailyIconComponent key={idx} icon={icon} size="h-3.5 w-3.5" />
                                      ))}
                                    </div>
                                  )}
                                </td>
                                {/* Score column */}
                                <td className={cn(
                                  "p-1.5 text-center border-l border-border/10",
                                  isEditing ? "bg-emerald-500/10" : "bg-warning/5 dark:bg-warning/10"
                                )}>
                                  {isEditing ? (() => {
                                    const locked = fillAllCatId && fillAllCatId !== "__all__" && fillAllCatId !== cat.id;
                                    return (
                                      <Input
                                        type="number" min={0} max={Number(cat.max_score)}
                                        value={tempEdits[cellKey] ?? ""}
                                        onChange={(e) => setTempEdits(prev => ({ ...prev, [cellKey]: e.target.value }))}
                                        className={cn(
                                          "w-14 mx-auto text-center h-7 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                          locked && "opacity-40 pointer-events-none"
                                        )}
                                        dir="ltr"
                                        disabled={!!locked}
                                      />
                                    );
                                  })() : (
                                    <span className="text-xs font-semibold text-muted-foreground">{manualScore}</span>
                                  )}
                                </td>
                              </React.Fragment>
                            );
                          })}

                          <td className={cn("p-2 text-center font-bold border-l border-border/10", isLast && "last:rounded-bl-xl")}>
                            {sub.score} / {sub.max}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
