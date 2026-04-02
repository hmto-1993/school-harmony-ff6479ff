import React, { useEffect, useMemo, useRef, useState } from "react";

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
import { printGradesTable, getPrintIconSpan, exportGradesTableAsPDF } from "@/lib/grades-print";

import { format } from "date-fns";
import { toast as sonnerToast } from "sonner";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";

type GradeLevel = "excellent" | "average" | "zero" | null;

const isParticipation = (name: string) => name === "المشاركة" || name.includes("المشاركة");
const DEFAULT_MAX_SLOTS = 3;

/** Maximum display icons per category in ClassworkSummary */
function getMaxDisplayIcons(catName: string): number {
  if (catName === "المشاركة") return 20;
  if (catName === "الواجبات") return 8;
  if (catName === "الكتاب") return 8;
  if (catName === "الأعمال والمشاريع") return 8;
  return 8;
}

/** Restore minimal slots from a saved score – matches DailyGradeEntry logic exactly */
function restoreSlotsFromScore({
  score,
  maxScore,
  slotCount,
  isParticipationCategory,
}: {
  score: number | null;
  maxScore: number;
  slotCount: number;
  isParticipationCategory: boolean;
}): { slots: GradeLevel[]; starred: boolean } {
  if (score === null) return { slots: [], starred: false };
  if (score >= maxScore && isParticipationCategory) return { slots: [], starred: true };
  if (score >= maxScore) return { slots: ["excellent"], starred: false };
  if (score === 0) return { slots: ["zero"], starred: false };

  const perSlot = Math.round(maxScore / slotCount);
  const averageScore = Math.round(perSlot / 2);
  const restoredSlots: GradeLevel[] = [];
  let remaining = score;
  while (remaining > 0 && restoredSlots.length < slotCount) {
    if (remaining >= perSlot) { restoredSlots.push("excellent"); remaining -= perSlot; continue; }
    if (remaining >= averageScore) { restoredSlots.push("average"); remaining -= averageScore; continue; }
    restoredSlots.push("average"); remaining = 0;
  }
  return { slots: restoredSlots.length > 0 ? restoredSlots : [], starred: false };
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

/* getPrintIconHTML removed — using unified getPrintIconSpan from grades-print.ts */

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
  const [globalMaxSlots, setGlobalMaxSlots] = useState(DEFAULT_MAX_SLOTS);
  const [maxSlotsPerCat, setMaxSlotsPerCat] = useState<Record<string, number>>({});
  const tableRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const getMaxSlots = (catId: string) => maxSlotsPerCat[catId] ?? globalMaxSlots;

  const buildClassworkTableHTML = (group: typeof groupedByClass[0]) => {
    return `
      <table>
        <thead>
          <tr>
            <th style="width:30px;">#</th>
            <th style="width:24%;">الطالب</th>
            ${group.categories.map((cat) => `
              <th style="width:auto;border-right:2px solid #93c5fd;">${cat.name}</th>
              <th style="width:auto;">الدرجة<br><span style="font-size:9px;color:#64748b;">من ${Number(cat.max_score)}</span></th>
            `).join("")}
            <th style="width:auto;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${group.students.map((student, index) => {
            const subtotal = calcManualSubtotal(student.manualScores, group.categories);
            return `
              <tr>
                <td>${index + 1}</td>
                <td>${student.full_name}</td>
                ${group.categories.map((cat) => {
                  const icons = (student.dailyIcons[cat.id] || []).slice(0, getMaxDisplayIcons(cat.name));
                  const iconsHTML = icons.length
                    ? `<div class="icons-cell">${icons.map(getPrintIconSpan).join("")}</div>`
                    : "";
                  return `
                    <td style="border-right:2px solid #93c5fd;">${iconsHTML}</td>
                    <td>${student.manualScores[cat.id] ?? 0}</td>
                  `;
                }).join("")}
                <td class="subtotal-cell">${subtotal.score} / ${subtotal.max}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  };

  const getClassworkPrintOptions = (group: typeof groupedByClass[0], className: string) => ({
    orientation: "landscape" as const,
    title: `المهام والمشاركة — ${className}`,
    subtitle: `${selectedPeriod === 1 ? "الفترة الأولى" : "الفترة الثانية"} — ${format(new Date(), "yyyy/MM/dd")}`,
    reportType: "grades" as const,
    tableHTML: buildClassworkTableHTML(group),
  });

  const handlePrintTable = async (classId: string, className: string) => {
    const group = groupedByClass.find((entry) => entry.id === classId);
    if (!group) return;
    await printGradesTable(getClassworkPrintOptions(group, className));
  };

  const exportTableAsPDF = async (classId: string, className: string) => {
    const group = groupedByClass.find(g => g.id === classId);
    if (!group) return;
    try {
      const tableHTML = buildClassworkTableHTML(group);
      await exportGradesTableAsPDF({
        orientation: "landscape",
        title: `المهام والمشاركة — ${className}`,
        subtitle: `${selectedPeriod === 1 ? "الفترة الأولى" : "الفترة الثانية"} — ${format(new Date(), "yyyy/MM/dd")}`,
        reportType: "grades",
        tableHTML,
        fileName: `المهام_والمشاركة_${className}_${format(new Date(), "yyyy-MM-dd")}`,
      });
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

  const groupedByClass = useMemo(() => classes
    .map((cls) => ({
      ...cls,
      students: filteredRows.filter((r) => r.class_id === cls.id),
      categories: allCategories.filter((c) => c.class_id === cls.id || c.class_id === null),
    }))
    .filter((g) => g.students.length > 0), [classes, filteredRows, allCategories]);

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

      <div className="print-only">
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="طباعة" onClick={() => handlePrintTable(group.id, group.name)}>
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
              <div ref={(el) => { if (el) tableRefs.current.set(group.id, el); }} className="w-full overflow-x-auto -mx-1 px-1 rounded-xl border border-border/40 shadow-sm" dir="rtl" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties}>
                <table className="w-full text-sm border-collapse" style={{ tableLayout: "auto" }} dir="rtl">
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
