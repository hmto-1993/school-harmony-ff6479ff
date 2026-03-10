import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, CircleCheck, CircleMinus, CircleX, Star } from "lucide-react";
import GradesExportDialog, { ExportTableGroup } from "./GradesExportDialog";
import { cn } from "@/lib/utils";

interface ClassInfo { id: string; name: string; }
interface CategoryInfo { id: string; name: string; weight: number; max_score: number; class_id: string; category_group: string; }

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
  categoryGroupFilter?: string;
}

// Inline editable score input that saves on blur independently
function InlineScoreInput({ value, maxScore, studentId, categoryId, recordId, period, userId, onSaved }: {
  value: number; maxScore: number; studentId: string; categoryId: string; recordId?: string; period: number; userId: string; onSaved: () => void;
}) {
  const [localVal, setLocalVal] = useState<string>(String(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocalVal(String(value)); }, [value]);

  const handleBlur = async () => {
    const numVal = localVal === "" ? 0 : Math.min(maxScore, Math.max(0, Number(localVal)));
    if (numVal === value) return;
    setSaving(true);
    if (recordId) {
      await supabase.from("manual_category_scores" as any).update({ score: numVal, updated_at: new Date().toISOString() }).eq("id", recordId);
    } else {
      await supabase.from("manual_category_scores" as any).insert({ student_id: studentId, category_id: categoryId, score: numVal, recorded_by: userId, period });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Input
      type="number" min={0} max={maxScore}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      disabled={saving}
      className="w-14 mx-auto text-center h-7 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" dir="ltr"
    />
  );
}

export default function GradesSummary({ selectedClass, onClassChange, selectedPeriod = 1, categoryGroupFilter }: GradesSummaryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryInfo[]>([]);
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [searchName, setSearchName] = useState("");

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
    const cats = (catsData || []) as CategoryInfo[];
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
      classCats.forEach((cat) => {
        maxTotal += Number(cat.max_score);
        if (grades[cat.id] !== null && grades[cat.id] !== undefined) total += grades[cat.id]!;
      });

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

  const calcSubtotal = (grades: Record<string, number | null>, cats: CategoryInfo[]) => {
    let score = 0, max = 0;
    cats.forEach(cat => {
      max += Number(cat.max_score);
      if (grades[cat.id] != null) score += grades[cat.id]!;
    });
    return { score, max };
  };

  if (loading) return <p className="text-center py-12 text-muted-foreground">جارٍ تحميل الخلاصة...</p>;

  return (
    <div className="space-y-4">
      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث باسم الطالب..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="pr-9" />
        </div>
      </div>

      {/* Export button */}
      {groupedByClass.length > 0 && (
        <div className="flex justify-end">
          <GradesExportDialog
            title="التقييم النهائي"
            fileName="التقييم_النهائي"
            groups={groupedByClass.map((group) => {
              const classworkCats = group.categories.filter(c => c.category_group === 'classwork');
              const examCats = group.categories.filter(c => c.category_group === 'exams');
              const otherCats = group.categories.filter(c => c.category_group !== 'classwork' && c.category_group !== 'exams');
              const headers = [
                "#", "الطالب",
                ...classworkCats.flatMap(c => [c.name, `مجموع ${c.name}`]),
                ...(classworkCats.length > 0 ? ["إجمالي المهام"] : []),
                ...examCats.map(c => c.name), ...(examCats.length > 0 ? ["مجموع الاختبارات"] : []),
                ...otherCats.map(c => c.name),
                "المجموع",
              ];
              const rows = group.students.map((sg, i) => {
                const cwSub = calcSubtotal(sg.grades, classworkCats);
                const exSub = calcSubtotal(sg.grades, examCats);
                return [
                  String(i + 1), sg.full_name,
                  ...classworkCats.flatMap(c => [
                    sg.grades[c.id] != null ? String(sg.grades[c.id]) : "—",
                    String(sg.grades[c.id] ?? 0),
                  ]),
                  ...(classworkCats.length > 0 ? [`${cwSub.score} / ${cwSub.max}`] : []),
                  ...examCats.map(c => sg.grades[c.id] != null ? String(sg.grades[c.id]) : "—"),
                  ...(examCats.length > 0 ? [`${exSub.score} / ${exSub.max}`] : []),
                  ...otherCats.map(c => sg.grades[c.id] != null ? String(sg.grades[c.id]) : "—"),
                  sg.total,
                ];
              });
              return { className: group.name, headers, rows } as ExportTableGroup;
            })}
          />
        </div>
      )}

      {groupedByClass.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">لا توجد بيانات درجات بعد</p>
      ) : groupedByClass.map((group) => {
        const classworkCats = group.categories.filter(c => c.category_group === 'classwork');
        const examCats = group.categories.filter(c => c.category_group === 'exams');
        const otherCats = group.categories.filter(c => c.category_group !== 'classwork' && c.category_group !== 'exams');

        const hasClasswork = !categoryGroupFilter ? classworkCats.length > 0 : categoryGroupFilter === 'classwork' && classworkCats.length > 0;
        const hasExams = !categoryGroupFilter ? examCats.length > 0 : categoryGroupFilter === 'exams' && examCats.length > 0;
        const hasOther = !categoryGroupFilter ? otherCats.length > 0 : false;

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
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    {/* Group headers row */}
                    <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                      <th rowSpan={2} className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">#</th>
                      <th rowSpan={2} className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[160px]">الطالب</th>
                      {hasClasswork && (
                        <th colSpan={classworkCats.length * 2 + 1} className="text-center p-2 font-bold text-xs border-b border-primary/20 bg-primary/5 text-primary">
                          المهام الادائية والمشاركة والتفاعل
                        </th>
                      )}
                      {hasExams && (
                        <th colSpan={examCats.length + 1} className="text-center p-2 font-bold text-xs border-b border-primary/20 bg-accent/5 text-primary">
                          الاختبارات
                        </th>
                      )}
                      {hasOther && otherCats.map(cat => (
                        <th key={cat.id} rowSpan={2} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[80px]">
                          <div>{cat.name}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">من {Number(cat.max_score)}</div>
                        </th>
                      ))}
                      <th rowSpan={2} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[80px] last:rounded-tl-xl">المجموع</th>
                    </tr>
                    {/* Sub-headers row */}
                    <tr className="bg-muted/30">
                      {hasClasswork && (
                        <>
                          {classworkCats.map(cat => (
                            <React.Fragment key={cat.id}>
                              <th className="text-center p-2 font-medium text-xs border-b-2 border-primary/20 min-w-[70px] text-muted-foreground">
                                <div>{cat.name}</div>
                                <div className="text-[10px] font-normal">من {Number(cat.max_score)}</div>
                              </th>
                              <th className="text-center p-2 font-bold text-xs border-b-2 border-primary/20 text-primary min-w-[45px] bg-primary/5">
                                الدرجة
                              </th>
                            </React.Fragment>
                          ))}
                          <th className="text-center p-2 font-bold text-xs border-b-2 border-primary/20 text-primary min-w-[60px] bg-primary/10">الإجمالي</th>
                        </>
                      )}
                      {hasExams && (
                        <>
                          {examCats.map(cat => (
                            <th key={cat.id} className="text-center p-2 font-medium text-xs border-b-2 border-primary/20 min-w-[70px] text-muted-foreground">
                              <div>{cat.name}</div>
                              <div className="text-[10px] font-normal">من {Number(cat.max_score)}</div>
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
                      const currentGrades = sg.grades;

                      const classworkSub = calcSubtotal(currentGrades, classworkCats);
                      const examSub = calcSubtotal(currentGrades, examCats);
                      const allSub = calcSubtotal(currentGrades, group.categories);

                      const renderDots = (score: number | null, maxScore: number) => {
                        if (score == null) {
                          return (
                            <div className="flex items-center justify-center gap-0.5">
                              <CircleMinus className="h-3.5 w-3.5 text-muted-foreground opacity-30" />
                            </div>
                          );
                        }

                        let chunkSize = 1;
                        if (maxScore > 6) chunkSize = Math.ceil(maxScore / 6);
                        const dotCount = Math.ceil(maxScore / chunkSize);
                        const isStarred = score >= maxScore;
                        
                        let remaining = score;
                        const dots: Array<"excellent" | "average" | "zero"> = [];
                        for (let d = 0; d < dotCount; d++) {
                          const chunkVal = Math.min(chunkSize, maxScore - d * chunkSize);
                          const halfChunk = Math.round(chunkVal / 2);
                          if (remaining >= chunkVal) {
                            dots.push("excellent");
                            remaining -= chunkVal;
                          } else if (remaining >= halfChunk && remaining > 0) {
                            dots.push("average");
                            remaining = 0;
                          } else {
                            dots.push("zero");
                          }
                        }

                        return (
                          <div className="flex items-center justify-center gap-0.5 flex-wrap">
                            {dots.map((lvl, idx) => {
                              if (lvl === "excellent") return <CircleCheck key={idx} className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />;
                              if (lvl === "average") return <CircleMinus key={idx} className="h-3 w-3 text-amber-500 dark:text-amber-400" />;
                              return <CircleX key={idx} className="h-3 w-3 text-rose-500 dark:text-rose-400" />;
                            })}
                            {isStarred && (
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 dark:text-yellow-400 dark:fill-yellow-400" />
                            )}
                            <span className="text-[10px] text-muted-foreground font-medium mr-0.5">{score}</span>
                          </div>
                        );
                      };

                      return (
                        <tr key={sg.student_id} className={cn(
                          isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                          !isLast && "border-b border-border/20",
                        )}>
                          <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{i + 1}</td>
                          <td className="p-3 font-semibold border-l border-border/10">{sg.full_name}</td>

                          {/* Classwork categories with dots + inline score */}
                          {hasClasswork && (
                            <>
                              {classworkCats.map(cat => (
                                <React.Fragment key={cat.id}>
                                  <td className="p-2 text-center border-l border-border/10">
                                    {renderDots(currentGrades[cat.id], Number(cat.max_score))}
                                  </td>
                                  <td className="p-1.5 text-center border-l border-border/10 bg-primary/5">
                                    <InlineScoreInput
                                      value={sg.manualScores[cat.id] ?? 0}
                                      maxScore={Number(cat.max_score)}
                                      studentId={sg.student_id}
                                      categoryId={cat.id}
                                      recordId={sg.manualScoreIds[cat.id]}
                                      period={selectedPeriod}
                                      userId={user?.id || ""}
                                      onSaved={loadAllData}
                                    />
                                  </td>
                                </React.Fragment>
                              ))}
                              <td className="p-2 text-center font-bold border-l border-border/10 bg-primary/10 text-primary">
                                {classworkSub.score} / {classworkSub.max}
                              </td>
                            </>
                          )}

                          {/* Exam categories */}
                          {hasExams && (
                            <>
                              {examCats.map(cat => (
                                <td key={cat.id} className="p-2 text-center border-l border-border/10">
                                  {renderDots(currentGrades[cat.id], Number(cat.max_score))}
                                </td>
                              ))}
                              <td className="p-2 text-center font-bold border-l border-border/10 bg-accent/5 text-primary">
                                {examSub.score} / {examSub.max}
                              </td>
                            </>
                          )}

                          {/* Other categories */}
                          {hasOther && otherCats.map(cat => (
                            <td key={cat.id} className="p-2 text-center border-l border-border/10">
                              {renderDots(currentGrades[cat.id], Number(cat.max_score))}
                            </td>
                          ))}

                          {/* Grand total */}
                          <td className={cn("p-2 text-center font-bold border-l border-border/10", isLast && "last:rounded-bl-xl")}>
                            {allSub.score} / {allSub.max}
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
