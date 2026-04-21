import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Pencil, Check, X, ArrowDown, FileText, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { printGradesTable, getPrintIconSpan, exportGradesTableAsPDF } from "@/lib/grades-print";
import { format } from "date-fns";
import { toast as sonnerToast } from "sonner";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";

import type { ClassInfo, CategoryInfo, SummaryRow, ClassworkSummaryProps } from "./classwork/classwork-types";
import { isParticipation, DEFAULT_MAX_SLOTS, getMaxDisplayIcons, restoreSlotsFromScore, calcManualSubtotal } from "./classwork/classwork-helpers";
import ClassworkTable from "./classwork/ClassworkTable";
import ClassAlphaDashboard from "./classwork/ClassAlphaDashboard";
import type { DailyIcon } from "./classwork/classwork-types";

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
              <th style="width:auto;border-right:2px solid #93c5fd;${cat.is_deduction ? "background:#fee2e2;color:#b91c1c;" : ""}">${cat.is_deduction ? "مخالفة" : cat.name}<br><span style="font-size:9px;color:#64748b;">${cat.is_deduction ? "العدد" : ""}</span></th>
              <th style="width:auto;${cat.is_deduction ? "background:#fee2e2;color:#b91c1c;" : ""}">${cat.is_deduction ? "الخصم" : "الدرجة"}<br><span style="font-size:9px;color:#64748b;">${cat.is_deduction ? "مجموع الخصم" : `من ${Number(cat.max_score)}`}</span></th>
            `).join("")}
            <th style="width:auto;">الإجمالي</th>
            <th style="width:auto;background:#ecfdf5;color:#059669;">الدرجات المكتسبة</th>
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
                  const rawScore = student.manualScores[cat.id] ?? 0;
                  const dedCount = student.deductionCounts?.[cat.id] ?? 0;
                  const firstCellHTML = cat.is_deduction
                    ? `<span style="color:${dedCount > 0 ? "#dc2626" : "#64748b"};font-weight:bold;">${dedCount}</span>`
                    : iconsHTML;
                  const scoreDisplay = cat.is_deduction && rawScore > 0
                    ? `<span style="color:#dc2626;font-weight:bold;">−${rawScore}</span>`
                    : String(rawScore);
                  return `
                    <td style="border-right:2px solid #93c5fd;${cat.is_deduction ? "background:#fef2f2;" : ""}">${firstCellHTML}</td>
                    <td style="${cat.is_deduction ? "background:#fef2f2;" : ""}">${scoreDisplay}</td>
                  `;
                }).join("")}
                <td class="subtotal-cell">${subtotal.score} / ${subtotal.max}</td>
                <td style="background:#ecfdf5;color:#059669;font-weight:bold;">${student.earnedTotal}</td>
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

  useEffect(() => {
    supabase.from("site_settings").select("id, value").in("id", ["daily_max_slots", "daily_max_slots_per_cat"]).then(({ data }) => {
      (data || []).forEach((s: any) => {
        if (s.id === "daily_max_slots" && s.value) setGlobalMaxSlots(Number(s.value) || DEFAULT_MAX_SLOTS);
        if (s.id === "daily_max_slots_per_cat" && s.value) {
          try { setMaxSlotsPerCat(JSON.parse(s.value)); } catch { setMaxSlotsPerCat({}); }
        }
      });
    });
  }, []);

  useEffect(() => { if (selectedClass) loadAllData(); }, [selectedPeriod, selectedClass]);

  const loadAllData = async () => {
    if (!selectedClass) return;
    setLoading(true);
    const [{ data: classesData }, { data: studentsData }, { data: catsData }] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("students").select("id, full_name, class_id").eq("class_id", selectedClass).order("full_name"),
      supabase.from("grade_categories").select("*").or(`class_id.eq.${selectedClass},class_id.is.null`).order("sort_order"),
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
          .eq("period", selectedPeriod)
          .limit(5000),
        catIds.length > 0
          ? supabase
              .from("grades")
              .select("student_id, category_id, score, date")
              .in("student_id", studentIds)
              .in("category_id", catIds)
              .eq("period", selectedPeriod)
              .order("date")
              .limit(5000)
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

    const dailyIconsMap = new Map<string, Map<string, DailyIcon[]>>();
    const earnedTotalsMap = new Map<string, number>();
    // Sum of daily deduction grades per student/category — shown as the negative score in the cell
    const deductionTotalsMap = new Map<string, Map<string, number>>();
    // Count of deduction events per student/category — shown under "مخالفة" column
    const deductionCountsMap = new Map<string, Map<string, number>>();
    allDailyGrades.forEach((g: any) => {
      if (g.score === null || g.score === undefined) return;
      const score = Number(g.score);
      const cat = cats.find(c => c.id === g.category_id);
      if (!cat) return;

      // Accumulate earned total (deductions reduce, others add)
      const delta = cat.is_deduction ? -score : score;
      earnedTotalsMap.set(g.student_id, (earnedTotalsMap.get(g.student_id) || 0) + delta);

      // Skip icon rendering for deduction categories — they show as count + negative number
      if (cat.is_deduction) {
        if (!deductionTotalsMap.has(g.student_id)) deductionTotalsMap.set(g.student_id, new Map());
        const sumMap = deductionTotalsMap.get(g.student_id)!;
        sumMap.set(g.category_id, (sumMap.get(g.category_id) || 0) + score);
        if (!deductionCountsMap.has(g.student_id)) deductionCountsMap.set(g.student_id, new Map());
        const cntMap = deductionCountsMap.get(g.student_id)!;
        // Count any recorded deduction event (even score=0 was filtered above by null check; >0 = real violation)
        if (score > 0) cntMap.set(g.category_id, (cntMap.get(g.category_id) || 0) + 1);
        return;
      }

      if (!dailyIconsMap.has(g.student_id)) dailyIconsMap.set(g.student_id, new Map());
      const studentMap = dailyIconsMap.get(g.student_id)!;
      if (!studentMap.has(g.category_id)) studentMap.set(g.category_id, []);
      const maxScore = Number(cat.max_score);
      const isPartCat = isParticipation(cat.name);
      const slotCount = getMaxSlots(cat.id);
      const restored = restoreSlotsFromScore({ score, maxScore, slotCount, isParticipationCategory: isPartCat });
      if (restored.starred) {
        studentMap.get(g.category_id)!.push({ level: "excellent", isFullScore: true });
      } else {
        restored.slots.forEach(level => {
          if (level !== null) {
            studentMap.get(g.category_id)!.push({ level, isFullScore: false });
          }
        });
      }
    });

    const classMap = new Map(cls.map((c) => [c.id, c.name]));

    const rows: SummaryRow[] = students.filter((s) => s.class_id).map((s) => {
      const classCats = cats.filter((c) => c.class_id === s.class_id || c.class_id === null);
      const studentManualMap = manualMap.get(s.id) || new Map();
      const studentDailyMap = dailyIconsMap.get(s.id) || new Map();
      const studentDeductionMap = deductionTotalsMap.get(s.id) || new Map();
      const studentDeductionCountMap = deductionCountsMap.get(s.id) || new Map();
      const manualScores: Record<string, number> = {};
      const manualScoreIds: Record<string, string> = {};
      const dailyIcons: Record<string, DailyIcon[]> = {};
      const deductionCounts: Record<string, number> = {};
      classCats.forEach((c) => {
        const m = studentManualMap.get(c.id);
        if (c.is_deduction) {
          // Deduction columns reflect the cumulative daily deductions (no max cap)
          manualScores[c.id] = studentDeductionMap.get(c.id) || 0;
          deductionCounts[c.id] = studentDeductionCountMap.get(c.id) || 0;
        } else {
          manualScores[c.id] = m?.score ?? 0;
        }
        if (m?.id) manualScoreIds[c.id] = m.id;
        dailyIcons[c.id] = studentDailyMap.get(c.id) || [];
      });
      return {
        student_id: s.id, full_name: s.full_name,
        class_name: classMap.get(s.class_id!) || "", class_id: s.class_id!,
        manualScores, manualScoreIds, dailyIcons, deductionCounts,
        earnedTotal: earnedTotalsMap.get(s.id) || 0,
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
        if (cat.is_deduction) return; // deductions are managed via daily violations entry
        edits[`${s.student_id}__${cat.id}`] = String(s.manualScores[cat.id] ?? 0);
      });
    });
    setTempEdits(edits);
    setEditingClassId(classId);
    setFillAllValue("");
    setFillAllCatId("");
  };

  const cancelEdit = () => { setEditingClassId(null); setTempEdits({}); setFillAllValue(""); setFillAllCatId(""); };

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
          <div key={group.id} className="space-y-3">
          <ClassAlphaDashboard
            classId={group.id}
            className={group.name}
            students={group.students.map(s => ({
              student_id: s.student_id,
              full_name: s.full_name,
              earnedTotal: s.earnedTotal,
              violationsCount: Object.values(s.deductionCounts || {}).reduce((a, b) => a + (b || 0), 0),
            }))}
          />
          <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
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
              <ClassworkTable
                students={group.students}
                categories={classworkCats}
                isEditing={isEditing}
                tempEdits={tempEdits}
                setTempEdits={setTempEdits}
                fillAllCatId={fillAllCatId}
                selectedPeriod={selectedPeriod}
                tableRef={(el) => { if (el) tableRefs.current.set(group.id, el); }}
              />
            </CardContent>
          </Card>
          </div>
        );
      })}
    </div>
  );
}
