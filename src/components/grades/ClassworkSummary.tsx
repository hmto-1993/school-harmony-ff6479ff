import React, { useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Pencil, Check, X, ArrowDown, CircleCheck, CircleMinus, CircleX, Star, FileText, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { createArabicPDF, getArabicTableStyles } from "@/lib/arabic-pdf";
import { safeSavePDF } from "@/lib/download-utils";
import autoTable from "jspdf-autotable";
import { safePrint } from "@/lib/print-utils";
import { format } from "date-fns";
import { toast as sonnerToast } from "sonner";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";

interface ClassInfo { id: string; name: string; }
interface CategoryInfo { id: string; name: string; weight: number; max_score: number; class_id: string; category_group: string; }

interface SummaryRow {
  student_id: string;
  full_name: string;
  class_name: string;
  class_id: string;
  dailyPoints: Record<string, number | null>;
  manualScores: Record<string, number>;
  manualScoreIds: Record<string, string>;
}

interface ClassworkSummaryProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
  selectedPeriod?: number;
}

/** Draw a filled star shape in jsPDF using triangles */
function drawStar(doc: any, cx: number, cy: number, size: number) {
  const pts = 5;
  const outerR = size;
  const innerR = size * 0.4;
  const verts: [number, number][] = [];
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 2) + (i * Math.PI) / pts;
    verts.push([cx + r * Math.cos(angle), cy - r * Math.sin(angle)]);
  }
  doc.setFillColor(234, 179, 8);
  for (let i = 1; i < verts.length - 1; i++) {
    doc.triangle(verts[0][0], verts[0][1], verts[i][0], verts[i][1], verts[i + 1][0], verts[i + 1][1], "F");
  }
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

  const exportTableAsPDF = async (classId: string, className: string) => {
    // Find students and categories for this class
    const group = groupedByClass.find(g => g.id === classId);
    if (!group) return;
    try {
      const { doc, startY } = await createArabicPDF({
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

      // Build headers (reversed for RTL): الإجمالي | درجة | نقاط | ... | الطالب | #
      const headers: string[] = [];
      headers.push("الإجمالي");
      [...classworkCats].reverse().forEach(cat => {
        headers.push(`الدرجة (${cat.max_score})`);
        headers.push(cat.name);
      });
      headers.push("الطالب");
      headers.push("#");

      // Track which cells need dot/star drawing: { row, col, type, dots }
      type DotInfo = { filledDots: number; partialDot: boolean; totalDots: number };
      const dotCells = new Map<string, { type: "star" | "dots"; dots?: DotInfo }>();

      // Build rows
      const rows: string[][] = group.students.map((sg, i) => {
        const sub = calcManualSubtotal(sg.manualScores, classworkCats);
        const row: string[] = [];
        row.push(`${sub.score} / ${sub.max}`);
        let colOffset = 1; // start after الإجمالي
        [...classworkCats].reverse().forEach(cat => {
          row.push(String(sg.manualScores[cat.id] ?? 0));
          const points = sg.dailyPoints[cat.id];
          const pointsColIndex = colOffset + 1;
          if (points != null) {
            const max = Number(cat.max_score);
            if (points >= max) {
              row.push(" "); // placeholder, will draw star
              dotCells.set(`${i}_${pointsColIndex}`, { type: "star" });
            } else {
              const perDot = (() => {
                const catNameLower = cat.name;
                const targetDots = catNameLower.includes("مشاركة") ? 15
                  : catNameLower.includes("كتاب") ? 10
                  : (catNameLower.includes("واجب") || catNameLower.includes("مشاريع") || catNameLower.includes("مشروع")) ? 5
                  : max <= 5 ? max : max <= 10 ? Math.ceil(max / 2) : Math.ceil(max / 5);
                return max / targetDots;
              })();
              const totalDots = Math.round(max / perDot);
              const filledDots = Math.floor(points / perDot);
              const hasPartial = points % perDot > 0;
              row.push(" "); // placeholder, will draw dots
              dotCells.set(`${i}_${pointsColIndex}`, { type: "dots", dots: { filledDots, partialDot: hasPartial, totalDots } });
            }
          } else {
            row.push("—");
          }
          colOffset += 2;
        });
        row.push(sg.full_name);
        row.push(String(i + 1));
        return row;
      });

      const nameColIndex = headers.length - 2;
      autoTable(doc, {
        startY: startY + 15,
        head: [headers],
        body: rows,
        ...tableStyles,
        styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 1.5 },
        headStyles: { ...tableStyles.headStyles, fontSize: 7 },
        columnStyles: {
          [nameColIndex]: { halign: "right" as const, cellWidth: 35 },
        },
        didDrawCell: (data: any) => {
          if (data.section !== "body") return;
          const key = `${data.row.index}_${data.column.index}`;
          const info = dotCells.get(key);
          if (!info) return;

          const cellX = data.cell.x;
          const cellY = data.cell.y;
          const cellW = data.cell.width;
          const cellH = data.cell.height;
          const centerY = cellY + cellH / 2;
          const r = 1.2; // dot radius
          const gap = 0.8; // gap between dots

          if (info.type === "star") {
            // Draw a filled yellow star
            doc.setFillColor(234, 179, 8);
            const starX = cellX + cellW / 2;
            drawStar(doc, starX, centerY, 2.5);
          } else if (info.type === "dots" && info.dots) {
            const { filledDots, partialDot, totalDots } = info.dots;
            const totalWidth = totalDots * (r * 2) + (totalDots - 1) * gap;
            let dotX = cellX + cellW / 2 + totalWidth / 2 - r; // RTL: start from right

            for (let d = 0; d < totalDots; d++) {
              if (d < filledDots) {
                doc.setFillColor(16, 185, 129); // emerald
                doc.circle(dotX, centerY, r, "F");
              } else if (d === filledDots && partialDot) {
                doc.setFillColor(245, 158, 11); // amber
                doc.circle(dotX, centerY, r, "F");
              } else {
                doc.setDrawColor(220, 38, 38); // rose
                doc.setLineWidth(0.3);
                doc.circle(dotX, centerY, r, "S");
              }
              dotX -= (r * 2 + gap);
            }
          }
        },
      });

      safeSavePDF(doc, `المهام_والمشاركة_${className}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      sonnerToast.success("تم تصدير ملف PDF بنجاح");
    } catch (err) {
      console.error(err);
      sonnerToast.error("حدث خطأ أثناء التصدير");
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

    let allGrades: any[] = [];
    let allManualScores: any[] = [];
    if (studentIds.length > 0) {
      const [{ data: gradesData }, { data: manualData }] = await Promise.all([
        supabase.from("grades").select("id, student_id, category_id, score, period")
          .in("student_id", studentIds).eq("period", selectedPeriod),
        supabase.from("manual_category_scores" as any).select("id, student_id, category_id, score, period")
          .in("student_id", studentIds).eq("period", selectedPeriod),
      ]);
      allGrades = gradesData || [];
      allManualScores = (manualData as any[]) || [];
    }

    const gradesMap = new Map<string, Map<string, number | null>>();
    allGrades.forEach((g) => {
      if (!gradesMap.has(g.student_id)) gradesMap.set(g.student_id, new Map());
      gradesMap.get(g.student_id)!.set(g.category_id, g.score != null ? Number(g.score) : null);
    });

    const manualMap = new Map<string, Map<string, { score: number; id: string }>>();
    allManualScores.forEach((m: any) => {
      if (!manualMap.has(m.student_id)) manualMap.set(m.student_id, new Map());
      manualMap.get(m.student_id)!.set(m.category_id, { score: Number(m.score), id: m.id });
    });

    const classMap = new Map(cls.map((c) => [c.id, c.name]));

    const rows: SummaryRow[] = students.filter((s) => s.class_id).map((s) => {
      const classCats = cats.filter((c) => c.class_id === s.class_id);
      const studentGradesMap = gradesMap.get(s.id) || new Map();
      const studentManualMap = manualMap.get(s.id) || new Map();
      const dailyPoints: Record<string, number | null> = {};
      const manualScores: Record<string, number> = {};
      const manualScoreIds: Record<string, string> = {};

      classCats.forEach((c) => {
        dailyPoints[c.id] = studentGradesMap.get(c.id) ?? null;
        const m = studentManualMap.get(c.id);
        manualScores[c.id] = m?.score ?? 0;
        if (m?.id) manualScoreIds[c.id] = m.id;
      });

      return {
        student_id: s.id, full_name: s.full_name,
        class_name: classMap.get(s.class_id!) || "", class_id: s.class_id!,
        dailyPoints, manualScores, manualScoreIds,
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
        upserts.push(supabase.from("manual_category_scores" as any).update({ score: numVal, updated_at: new Date().toISOString() }).eq("id", existingId));
      } else {
        upserts.push(supabase.from("manual_category_scores" as any).insert({ student_id: studentId, category_id: categoryId, score: numVal, recorded_by: user.id, period: selectedPeriod }));
      }
    }

    await Promise.all(upserts);
    setSaving(false);
    cancelEdit();
    toast({ title: "تم الحفظ", description: "تم حفظ الدرجات بنجاح" });
    loadAllData();
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
      categories: allCategories.filter((c) => c.class_id === cls.id),
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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث باسم الطالب..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="pr-9" />
        </div>
      </div>

      {/* Print header - only visible in print */}
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
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <Badge variant="secondary">{group.students.length} طالب</Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedPeriod === 1 ? "فترة أولى" : "فترة ثانية"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Export buttons */}
                  {!isEditing && (
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="تصدير PDF" onClick={() => exportTableAsPDF(group.id, group.name)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="طباعة" onClick={async () => {
                        const tableEl = tableRefs.current.get(group.id);
                        if (!tableEl) return;
                        const printArea = document.createElement("div");
                        printArea.className = "print-area";
                        printArea.style.cssText = "display:none;direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif;";

                        // Fetch and render print header
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
                            // Right section
                            const rightDiv = document.createElement("div");
                            rightDiv.style.cssText = `flex:1;text-align:${headerConfig.rightSection?.align||"right"};font-size:${headerConfig.rightSection?.fontSize||12}px;line-height:1.8;color:${headerConfig.rightSection?.color||"#1e293b"};`;
                            (headerConfig.rightSection?.lines||[]).forEach((line: string) => {
                              const p = document.createElement("p");
                              p.style.cssText = "margin:0;font-weight:600;";
                              p.textContent = line;
                              rightDiv.appendChild(p);
                            });
                            // Center images
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
                            // Left section
                            const leftDiv = document.createElement("div");
                            leftDiv.style.cssText = `flex:1;text-align:${headerConfig.leftSection?.align||"left"};font-size:${headerConfig.leftSection?.fontSize||12}px;line-height:1.8;color:${headerConfig.leftSection?.color||"#1e293b"};`;
                            (headerConfig.leftSection?.lines||[]).forEach((line: string) => {
                              const p = document.createElement("p");
                              p.style.cssText = "margin:0;font-weight:600;";
                              p.textContent = line;
                              leftDiv.appendChild(p);
                            });
                            headerDiv.appendChild(rightDiv);
                            headerDiv.appendChild(centerDiv);
                            headerDiv.appendChild(leftDiv);
                            printArea.appendChild(headerDiv);
                          }
                        } catch {}

                        const title = document.createElement("h2");
                        title.style.cssText = "text-align:center;margin-bottom:4px;font-size:14px;font-weight:bold;";
                        title.textContent = `المهام والمشاركة — ${group.name}`;
                        const periodLabel = document.createElement("p");
                        periodLabel.style.cssText = "text-align:center;margin-bottom:8px;font-size:11px;color:#666;";
                        periodLabel.textContent = `${selectedPeriod === 1 ? "الفترة الأولى" : "الفترة الثانية"} — ${format(new Date(), "yyyy/MM/dd")}`;
                        printArea.appendChild(title);
                        printArea.appendChild(periodLabel);
                        const clone = tableEl.cloneNode(true) as HTMLElement;
                        clone.style.overflow = "visible";
                        clone.style.width = "100%";
                        // Print-friendly: fit all columns on landscape A4
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
                        // Name column: wider; points columns: narrower
                        clone.querySelectorAll("thead tr").forEach(row => {
                          const ths = row.querySelectorAll("th");
                          // ths order: #, الطالب, [cat_name, درجة]..., الإجمالي
                          if (ths.length >= 2) {
                            ths[1].style.minWidth = "110px";
                          }
                          // Points columns (every odd column after index 1) — make narrower
                          for (let c = 2; c < ths.length - 1; c += 2) {
                            ths[c].style.maxWidth = "45px";
                            ths[c].style.fontSize = "8px";
                          }
                        });
                        clone.querySelectorAll("tbody tr").forEach(row => {
                          const cells = row.querySelectorAll("td");
                          if (cells.length >= 2) {
                            cells[1].style.whiteSpace = "normal";
                            cells[1].style.textAlign = "right";
                            cells[1].style.minWidth = "110px";
                          }
                          // Points cells narrower
                          for (let c = 2; c < cells.length - 1; c += 2) {
                            cells[c].style.maxWidth = "45px";
                            cells[c].style.padding = "1px 2px";
                          }
                        });
                        // Shrink SVG icons in print clone
                        clone.querySelectorAll("svg").forEach(svg => {
                          svg.style.width = "6px";
                          svg.style.height = "6px";
                        });
                        clone.querySelectorAll("*").forEach(el => {
                          const h = el as HTMLElement;
                          if (!h.style.color) h.style.color = "#1a1a1a";
                        });
                        printArea.appendChild(clone);
                        document.body.appendChild(printArea);
                        safePrint(() => { printArea.remove(); });
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
              <div ref={(el) => { if (el) tableRefs.current.set(group.id, el); }} className="overflow-x-auto rounded-xl border border-border/40 shadow-sm print:overflow-visible" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties}>
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">#</th>
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 whitespace-nowrap w-0 bg-primary/10">الطالب</th>
                      {classworkCats.map(cat => (
                        <React.Fragment key={cat.id}>
                          <th className="text-center p-2 font-bold text-xs border-b-2 border-primary/20 text-muted-foreground min-w-[50px]">
                            <div className="leading-tight">{cat.name.split(/\s*و\s*/).length > 1 
                              ? cat.name.split(/\s*و\s*/).map((part, pi) => <div key={pi}>{pi > 0 ? `و${part}` : part}</div>)
                              : cat.name
                            }</div>
                          </th>
                          <th className={cn(
                            "text-center p-2 font-bold text-xs border-b-2 border-primary/20 min-w-[50px]",
                            isEditing
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600"
                              : "bg-primary/8 text-primary"
                          )}>
                            <div>الدرجة</div>
                            <div className="text-[10px] font-normal opacity-70">من {Number(cat.max_score)}</div>
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
                          !isLast && "border-b border-border/20",
                        )}>
                          <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{i + 1}</td>
                          <td className="p-3 font-semibold border-l border-border/10 whitespace-nowrap bg-primary/5">{sg.full_name}</td>

                          {classworkCats.map(cat => {
                            const cellKey = `${sg.student_id}__${cat.id}`;
                            const points = sg.dailyPoints[cat.id];
                            return (
                              <React.Fragment key={cat.id}>
                                {/* Daily points column — dot visualization */}
                                <td className="p-1.5 text-center border-l border-border/10">
                                  {points != null ? (() => {
                                    const max = Number(cat.max_score);
                                    const catNameLower = cat.name;
                                    const targetDots = catNameLower.includes("مشاركة") ? 15
                                      : catNameLower.includes("كتاب") ? 10
                                      : (catNameLower.includes("واجب") || catNameLower.includes("مشاريع") || catNameLower.includes("مشروع")) ? 5
                                      : max <= 5 ? max : max <= 10 ? Math.ceil(max / 2) : Math.ceil(max / 5);
                                    const perDot = max / targetDots;

                                    if (points >= max) {
                                      return <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 dark:text-yellow-400 dark:fill-yellow-400 print:h-2 print:w-2" />;
                                    }

                                    const filledDots = Math.floor(points / perDot);
                                    const hasPartial = points % perDot > 0;
                                    const dots: React.ReactNode[] = [];

                                    for (let d = 0; d < targetDots; d++) {
                                      if (d < filledDots) {
                                        dots.push(<CircleCheck key={d} className="h-4 w-4 text-emerald-500 dark:text-emerald-400 drop-shadow-sm print:h-2 print:w-2" />);
                                      } else if (d === filledDots && hasPartial) {
                                        dots.push(<CircleMinus key={d} className="h-4 w-4 text-amber-500 dark:text-amber-400 drop-shadow-sm print:h-2 print:w-2" />);
                                      } else {
                                        dots.push(<CircleX key={d} className="h-4 w-4 text-rose-400/60 dark:text-rose-400/50 print:h-2 print:w-2" />);
                                      }
                                    }
                                    return (
                                      <div
                                        className="inline-grid gap-0.5 justify-items-center"
                                        style={{
                                          gridTemplateColumns: `repeat(${Math.ceil(targetDots / 2)}, 1fr)`,
                                          gridTemplateRows: 'auto auto',
                                          margin: '0 auto',
                                        }}
                                      >
                                        {dots}
                                      </div>
                                    );
                                  })() : (
                                    <span className="text-muted-foreground opacity-40 text-xs">—</span>
                                  )}
                                </td>
                                {/* Manual score (درجة) column */}
                                <td className={cn(
                                  "p-1.5 text-center border-l border-border/10",
                                  isEditing ? "bg-emerald-500/10" : "bg-primary/5"
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
                                    <span className="text-xs font-semibold">{sg.manualScores[cat.id] ?? 0}</span>
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
