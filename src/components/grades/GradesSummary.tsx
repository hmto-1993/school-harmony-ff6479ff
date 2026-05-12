import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Pencil, Check, X, ArrowDown, Printer, FileText } from "lucide-react";
import GradesExportDialog, { ExportTableGroup } from "./GradesExportDialog";
import { cn } from "@/lib/utils";
import { printGradesTable, exportGradesTableAsPDF } from "@/lib/grades-print";
import { format } from "date-fns";
import { calcSubtotal, getSummaryPrintOptions } from "./grades-table-builders";

interface ClassInfo { id: string; name: string; }
interface CategoryInfo { id: string; name: string; weight: number; max_score: number; class_id: string; category_group: string; is_deduction?: boolean; }

interface SummaryRow {
  student_id: string;
  full_name: string;
  class_name: string;
  class_id: string;
  grades: Record<string, number | null>;
  grade_ids: Record<string, string>;
  manualScores: Record<string, number>;
  manualScoreIds: Record<string, string>;
  total: string;
}

interface GradesSummaryProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
  selectedPeriod?: number;
}

export default function GradesSummary({ selectedClass, onClassChange, selectedPeriod = 1 }: GradesSummaryProps) {
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
    const cats = ((catsData || []) as CategoryInfo[]).filter(c => !c.is_deduction);
    const studentIds = students.map((s) => s.id);

    let allGrades: any[] = [];
    let allManualScores: any[] = [];
    if (studentIds.length > 0) {
      const [{ data: gradesData }, { data: manualData }] = await Promise.all([
        supabase.from("grades").select("id, student_id, category_id, score, period").in("student_id", studentIds).eq("period", selectedPeriod).limit(5000),
        supabase.from("manual_category_scores" as any).select("id, student_id, category_id, score, period").in("student_id", studentIds).eq("period", selectedPeriod).limit(5000),
      ]);
      allGrades = gradesData || [];
      allManualScores = (manualData as any[]) || [];
    }

    const gradesMap = new Map<string, Map<string, { score: number | null; id: string }>>();
    allGrades.forEach((g) => {
      if (!gradesMap.has(g.student_id)) gradesMap.set(g.student_id, new Map());
      gradesMap.get(g.student_id)!.set(g.category_id, { score: g.score != null ? Number(g.score) : null, id: g.id });
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
      const grades: Record<string, number | null> = {};
      const gradeIds: Record<string, string> = {};
      const manualScores: Record<string, number> = {};
      const manualScoreIds: Record<string, string> = {};

      classCats.forEach((c) => {
        const g = studentGradesMap.get(c.id);
        grades[c.id] = g?.score ?? null;
        if (g?.id) gradeIds[c.id] = g.id;
        const m = studentManualMap.get(c.id);
        manualScores[c.id] = m?.score ?? 0;
        if (m?.id) manualScoreIds[c.id] = m.id;
      });

      let total = 0, maxTotal = 0;
      classCats.forEach((cat) => { maxTotal += Number(cat.max_score); total += manualScores[cat.id] ?? 0; });

      return {
        student_id: s.id, full_name: s.full_name,
        class_name: classMap.get(s.class_id!) || "", class_id: s.class_id!,
        grades, grade_ids: gradeIds, manualScores, manualScoreIds,
        total: maxTotal > 0 ? `${total} / ${maxTotal}` : "—",
      };
    });

    setClasses(cls);
    setAllCategories(cats);
    setSummaryRows(rows);
    setLoading(false);
  };

  const startEdit = (classId: string, students: SummaryRow[], editableCats: CategoryInfo[]) => {
    const edits: Record<string, string> = {};
    students.forEach(s => { editableCats.forEach(cat => { edits[`${s.student_id}__${cat.id}`] = String(s.manualScores[cat.id] ?? 0); }); });
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

  const groupedByClass = classes
    .map((cls) => ({ ...cls, students: filteredRows.filter((r) => r.class_id === cls.id), categories: allCategories.filter((c) => c.class_id === cls.id) }))
    .filter((g) => g.students.length > 0);

  const handlePrintTable = async (classId: string, className: string) => {
    const group = groupedByClass.find(g => g.id === classId);
    if (!group) return;
    await printGradesTable(getSummaryPrintOptions(className, group.students, group.categories, selectedPeriod));
  };

  const handleExportPDF = async (classId: string, className: string) => {
    const group = groupedByClass.find(g => g.id === classId);
    if (!group) return;
    try {
      await exportGradesTableAsPDF({
        ...getSummaryPrintOptions(className, group.students, group.categories, selectedPeriod),
        fileName: `التقييم_النهائي_${className}_${format(new Date(), "yyyy-MM-dd")}`,
      });
    } catch { /* handled */ }
  };

  const renderScore = (score: number | null) => {
    if (score == null) return <span className="text-muted-foreground opacity-40">—</span>;
    return <span className="text-xs font-semibold">{score}</span>;
  };

  if (loading) return <p className="text-center py-12 text-muted-foreground">جارٍ تحميل الخلاصة...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 no-print">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث باسم الطالب..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="pr-9" />
        </div>
      </div>

      {groupedByClass.length > 0 && (
        <div className="flex justify-end no-print">
          <GradesExportDialog
            title="التقييم النهائي"
            fileName="التقييم_النهائي"
            groups={groupedByClass.map((group) => {
              const classworkCats = group.categories.filter(c => c.category_group === 'classwork');
              const examCats = group.categories.filter(c => c.category_group === 'exam');
              const otherCats = group.categories.filter(c => c.category_group !== 'classwork' && c.category_group !== 'exam');
              const groupHeaders: { label: string; colSpan: number }[] = [
                { label: "#", colSpan: 1 }, { label: "الطالب", colSpan: 1 },
              ];
              if (classworkCats.length > 0) groupHeaders.push({ label: "المهام الادائية والمشاركة والتفاعل", colSpan: classworkCats.length + 1 });
              if (examCats.length > 0) groupHeaders.push({ label: "الاختبارات", colSpan: examCats.length + 1 });
              otherCats.forEach(cat => { groupHeaders.push({ label: cat.name, colSpan: 1 }); });
              groupHeaders.push({ label: "المجموع", colSpan: 1 });
              const headers = [
                "#", "الطالب",
                ...classworkCats.map(c => `${c.name}\nمن ${Number(c.max_score)}`),
                ...(classworkCats.length > 0 ? ["الإجمالي"] : []),
                ...examCats.map(c => `${c.name}\nمن ${Number(c.max_score)}`),
                ...(examCats.length > 0 ? ["المجموع"] : []),
                ...otherCats.map(c => `${c.name}\nمن ${Number(c.max_score)}`),
                "المجموع",
              ];
              const rows = group.students.map((sg, i) => {
                const cwSub = calcSubtotal(sg.manualScores, classworkCats);
                const exSub = calcSubtotal(sg.manualScores, examCats);
                const allSub = calcSubtotal(sg.manualScores, group.categories);
                return [
                  String(i + 1), sg.full_name,
                  ...classworkCats.map(c => String(sg.manualScores[c.id] ?? 0)),
                  ...(classworkCats.length > 0 ? [`${cwSub.score} / ${cwSub.max}`] : []),
                  ...examCats.map(c => String(sg.manualScores[c.id] ?? 0)),
                  ...(examCats.length > 0 ? [`${exSub.score} / ${exSub.max}`] : []),
                  ...otherCats.map(c => String(sg.manualScores[c.id] ?? 0)),
                  `${allSub.score} / ${allSub.max}`,
                ];
              });
              return { className: group.name, headers, rows, groupHeaders } as ExportTableGroup;
            })}
          />
        </div>
      )}

      {groupedByClass.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">لا توجد بيانات درجات بعد</p>
      ) : groupedByClass.map((group) => {
        const classworkCats = group.categories.filter(c => c.category_group === 'classwork');
        const examCats = group.categories.filter(c => c.category_group === 'exam');
        const otherCats = group.categories.filter(c => c.category_group !== 'classwork' && c.category_group !== 'exam');
        const hasClasswork = classworkCats.length > 0;
        const hasExams = examCats.length > 0;
        const hasOther = otherCats.length > 0;
        const isEditing = editingClassId === group.id;

        return (
          <Card key={group.id} className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
            <CardHeader className="pb-3 no-print">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <Badge variant="secondary">{group.students.length} طالب</Badge>
                  <Badge variant="outline" className="text-xs">{selectedPeriod === 1 ? "فترة أولى" : "فترة ثانية"}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 no-print">
                  {!isEditing && (
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="تصدير PDF" onClick={() => handleExportPDF(group.id, group.name)}><FileText className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="طباعة" onClick={() => handlePrintTable(group.id, group.name)}><Printer className="h-4 w-4" /></Button>
                    </div>
                  )}
                  {!isEditing ? (
                    <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={editingClassId !== null && editingClassId !== group.id}
                      onClick={() => startEdit(group.id, group.students, [...classworkCats, ...examCats])}>
                      <Pencil className="h-3.5 w-3.5" /> تعديل الدرجات
                    </Button>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
                        <Select value={fillAllCatId} onValueChange={setFillAllCatId}>
                          <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs border-0 bg-transparent"><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">الجميع</SelectItem>
                            {[...classworkCats, ...examCats].map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="number" min={0} placeholder="الدرجة" value={fillAllValue} onChange={(e) => setFillAllValue(e.target.value)}
                          className="w-14 h-7 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" dir="ltr" />
                        <Button size="sm" variant="secondary" className="h-7 text-xs px-2 gap-1" onClick={() => {
                          if (!fillAllCatId || fillAllValue === "") return;
                          const newEdits = { ...tempEdits };
                          if (fillAllCatId === "__all__") {
                            [...classworkCats, ...examCats].forEach(cat => { group.students.forEach(s => { newEdits[`${s.student_id}__${cat.id}`] = String(Math.min(Number(cat.max_score), Math.max(0, Number(fillAllValue)))); }); });
                          } else {
                            const cat = [...classworkCats, ...examCats].find(c => c.id === fillAllCatId);
                            if (cat) { const val = Math.min(Number(cat.max_score), Math.max(0, Number(fillAllValue))); group.students.forEach(s => { newEdits[`${s.student_id}__${fillAllCatId}`] = String(val); }); }
                          }
                          setTempEdits(newEdits);
                        }}>
                          <ArrowDown className="h-3 w-3" /> ملء الكل
                        </Button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" onClick={saveEdits} disabled={saving} className="h-8 text-xs gap-1"><Check className="h-3.5 w-3.5" /> حفظ</Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving} className="h-8 text-xs gap-1"><X className="h-3.5 w-3.5" /> إلغاء</Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="hidden print:block text-center mb-2">
                <h2 className="text-sm font-bold">{group.name} — التقييم النهائي — {selectedPeriod === 1 ? "الفترة الأولى" : "الفترة الثانية"}</h2>
              </div>
              <div className="w-full overflow-x-auto -mx-1 px-1 rounded-xl border border-border/40 shadow-sm" dir="rtl">
                <table className="w-full text-sm border-separate border-spacing-0" style={{ tableLayout: "auto" }} dir="rtl">
                  <thead>
                    <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                      <th rowSpan={2} className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">#</th>
                      <th rowSpan={2} className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[160px]">الطالب</th>
                      {hasClasswork && <th colSpan={classworkCats.length + 1} className="text-center p-2 font-bold text-xs border-b border-primary/20 bg-primary/5 text-primary">المهام الادائية والمشاركة والتفاعل</th>}
                      {hasExams && <th colSpan={examCats.length + 1} className="text-center p-2 font-bold text-xs border-b border-primary/20 bg-accent/5 text-primary">الاختبارات</th>}
                      {hasOther && otherCats.map(cat => (
                        <th key={cat.id} rowSpan={2} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[80px]">
                          <div>{cat.name}</div><div className="text-[10px] text-muted-foreground font-normal">من {Number(cat.max_score)}</div>
                        </th>
                      ))}
                      <th rowSpan={2} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[80px] last:rounded-tl-xl">المجموع</th>
                    </tr>
                    <tr className="bg-muted/30">
                      {hasClasswork && (
                        <>
                          {classworkCats.map(cat => (
                            <th key={cat.id} className={cn("text-center p-2 font-bold text-xs border-b-2 border-primary/20 min-w-[60px]", isEditing ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
                              <div>{cat.name}</div><div className="text-[10px] text-muted-foreground font-normal">من {Number(cat.max_score)}</div>
                            </th>
                          ))}
                          <th className="text-center p-2 font-bold text-xs border-b-2 border-primary/20 text-primary min-w-[60px] bg-primary/10">الإجمالي</th>
                        </>
                      )}
                      {hasExams && (
                        <>
                          {examCats.map(cat => (
                            <th key={cat.id} className={cn("text-center p-2 font-bold text-xs border-b-2 border-primary/20 min-w-[60px]", isEditing ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                              <div>{cat.name}</div><div className="text-[10px] text-muted-foreground font-normal">من {Number(cat.max_score)}</div>
                            </th>
                          ))}
                          <th className="text-center p-2 font-bold text-xs border-b-2 border-primary/20 text-primary min-w-[60px] bg-accent/5">المجموع</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {group.students.map((sg, i) => {
                      const isEven = i % 2 === 0;
                      const isLast = i === group.students.length - 1;
                      const currentManual = sg.manualScores;
                      const classworkSub = calcSubtotal(currentManual, classworkCats);
                      const examSub = calcSubtotal(currentManual, examCats);
                      const allSub = calcSubtotal(currentManual, group.categories);

                      return (
                        <tr key={sg.student_id} className={cn(isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20", !isLast && "border-b border-border/20")}>
                          <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{i + 1}</td>
                          <td className="p-3 font-semibold border-l border-border/10">{sg.full_name}</td>
                          {hasClasswork && (
                            <>
                              {classworkCats.map(cat => {
                                const cellKey = `${sg.student_id}__${cat.id}`;
                                return (
                                  <td key={cat.id} className={cn("p-1.5 text-center border-l border-border/10", isEditing ? "bg-emerald-500/10" : "")}>
                                    {isEditing ? (() => {
                                      const locked = fillAllCatId && fillAllCatId !== "__all__" && fillAllCatId !== cat.id;
                                      return (
                                        <Input type="number" min={0} max={Number(cat.max_score)} value={tempEdits[cellKey] ?? ""}
                                          onChange={(e) => setTempEdits(prev => ({ ...prev, [cellKey]: e.target.value }))}
                                          className={cn("w-14 mx-auto text-center h-7 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", locked && "opacity-40 pointer-events-none")}
                                          dir="ltr" disabled={!!locked} />
                                      );
                                    })() : <span className="text-xs font-semibold">{sg.manualScores[cat.id] ?? 0}</span>}
                                  </td>
                                );
                              })}
                              <td className="p-2 text-center font-bold border-l border-border/10 bg-primary/10 text-primary">{classworkSub.score} / {classworkSub.max}</td>
                            </>
                          )}
                          {hasExams && (
                            <>
                              {examCats.map(cat => {
                                const cellKey = `${sg.student_id}__${cat.id}`;
                                return (
                                  <td key={cat.id} className={cn("p-1.5 text-center border-l border-border/10", isEditing ? "bg-amber-500/10" : "")}>
                                    {isEditing ? (() => {
                                      const locked = fillAllCatId && fillAllCatId !== "__all__" && fillAllCatId !== cat.id;
                                      return (
                                        <Input type="number" min={0} max={Number(cat.max_score)} value={tempEdits[cellKey] ?? ""}
                                          onChange={(e) => setTempEdits(prev => ({ ...prev, [cellKey]: e.target.value }))}
                                          className={cn("w-14 mx-auto text-center h-7 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", locked && "opacity-40 pointer-events-none")}
                                          dir="ltr" disabled={!!locked} />
                                      );
                                    })() : <span className="text-xs font-semibold">{sg.manualScores[cat.id] ?? 0}</span>}
                                  </td>
                                );
                              })}
                              <td className="p-2 text-center font-bold border-l border-border/10 bg-accent/5 text-primary">{examSub.score} / {examSub.max}</td>
                            </>
                          )}
                          {hasOther && otherCats.map(cat => (
                            <td key={cat.id} className="p-2 text-center border-l border-border/10">{renderScore(sg.manualScores[cat.id] ?? null)}</td>
                          ))}
                          <td className={cn("p-2 text-center font-bold border-l border-border/10", isLast && "last:rounded-bl-xl")}>{allSub.score} / {allSub.max}</td>
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
