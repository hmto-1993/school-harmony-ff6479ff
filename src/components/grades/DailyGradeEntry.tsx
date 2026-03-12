import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save, CircleCheck, CircleMinus, CircleX, Star, Undo2, Plus, ChevronRight, ChevronLeft, Download } from "lucide-react";
import GradesExportDialog, { ExportTableGroup } from "./GradesExportDialog";
import { cn } from "@/lib/utils";
import { subDays, addDays, isToday, format } from "date-fns";
import { HijriDatePicker } from "@/components/ui/hijri-date-picker";

interface GradeCategory {
  id: string;
  name: string;
  weight: number;
  max_score: number;
}

type GradeLevel = "excellent" | "average" | "zero" | null;

interface StudentGrade {
  student_id: string;
  full_name: string;
  grades: Record<string, number | null>;
  grade_ids: Record<string, string>;
  slots: Record<string, GradeLevel[]>;
  starred: Record<string, boolean>;
}

const nextLevel = (current: GradeLevel): GradeLevel => {
  if (current === null) return "excellent";
  if (current === "excellent") return "average";
  if (current === "average") return "zero";
  return null;
};

const levelScore = (level: GradeLevel, perSlot: number): number => {
  if (level === "excellent") return perSlot;
  if (level === "average") return Math.round(perSlot / 2);
  return 0;
};

const LevelIcon = ({ level, size = "h-6 w-6" }: { level: GradeLevel; size?: string }) => {
  if (level === "excellent") return <CircleCheck className={cn(size, "text-emerald-600 dark:text-emerald-400")} />;
  if (level === "average") return <CircleMinus className={cn(size, "text-amber-500 dark:text-amber-400")} />;
  if (level === "zero") return <CircleX className={cn(size, "text-rose-500 dark:text-rose-400")} />;
  return (
    <div className={cn(size, "rounded-full border-2 border-dashed border-muted-foreground/30")} />
  );
};

const HIDDEN_DAILY_CATEGORIES = ["اختبار عملي", "اختبار الفترة"];
const isHiddenFromDaily = (name: string) => HIDDEN_DAILY_CATEGORIES.includes(name);
const isParticipation = (name: string) => name === "المشاركة";
const isBookCategory = (name: string) => name === "الكتاب";
const MAX_PARTICIPATION_SLOTS = 3;


interface DailyGradeEntryProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
  selectedPeriod?: number;
}

export default function DailyGradeEntry({ selectedClass, onClassChange, selectedPeriod = 1 }: DailyGradeEntryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const goToPrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => {
    if (!isToday(selectedDate)) setSelectedDate(prev => addDays(prev, 1));
  };
  const goToToday = () => setSelectedDate(new Date());

  useEffect(() => {
    supabase.from("classes").select("id, name").order("name").then(({ data }) => setClasses(data || []));
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setSelectedCategory("");
    loadData();
  }, [selectedClass, selectedDate, selectedPeriod]);

  const loadData = async () => {
    const { data: cats } = await supabase
      .from("grade_categories").select("*").eq("class_id", selectedClass).order("sort_order");
    const { data: students } = await supabase
      .from("students").select("id, full_name").eq("class_id", selectedClass).order("full_name");
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data: grades } = await supabase
      .from("grades").select("id, student_id, category_id, score, period")
      .in("student_id", (students || []).map((s) => s.id))
      .eq("period", selectedPeriod)
      .eq("date", dateStr);

    const gradesMap = new Map<string, Map<string, { score: number | null; id: string }>>();
    grades?.forEach((g) => {
      if (!gradesMap.has(g.student_id)) gradesMap.set(g.student_id, new Map());
      gradesMap.get(g.student_id)!.set(g.category_id, { score: g.score ? Number(g.score) : null, id: g.id });
    });

    setCategories((cats as GradeCategory[]) || []);
    setStudentGrades(
      (students || []).map((s) => {
        const studentGradesMap = gradesMap.get(s.id) || new Map();
        const gradeValues: Record<string, number | null> = {};
        const gradeIds: Record<string, string> = {};
        const slots: Record<string, GradeLevel[]> = {};
        const starred: Record<string, boolean> = {};
        (cats || []).forEach((c: any) => {
          const g = studentGradesMap.get(c.id);
          const score = g?.score ?? null;
          gradeValues[c.id] = score;
          if (g?.id) gradeIds[c.id] = g.id;

          // Restore slot/star state from saved score
          if (score === null) {
            slots[c.id] = [null];
            starred[c.id] = false;
          } else {
            const max = Number(c.max_score);
            const isPartCat = isParticipation(c.name);
            const slotCount = isPartCat ? MAX_PARTICIPATION_SLOTS : 1;
            const perSlot = Math.round(max / slotCount);

            if (score >= max && isPartCat) {
              // Full score on participation → starred
              starred[c.id] = true;
              slots[c.id] = [null, null, null];
            } else if (score >= max && !isPartCat) {
              // Full score on single-slot (واجبات/كتاب) → excellent, NOT starred
              starred[c.id] = false;
              slots[c.id] = ["excellent"];
            } else {
              starred[c.id] = false;
              const restoredSlots: GradeLevel[] = [];
              let remaining = score;
              for (let si = 0; si < slotCount; si++) {
                if (remaining >= perSlot) {
                  restoredSlots.push("excellent");
                  remaining -= perSlot;
                } else if (remaining >= Math.round(perSlot / 2)) {
                  restoredSlots.push("average");
                  remaining -= Math.round(perSlot / 2);
                } else if (remaining > 0) {
                  restoredSlots.push("average");
                  remaining = 0;
                } else {
                  restoredSlots.push("zero");
                }
              }
              slots[c.id] = restoredSlots;
            }
          }
        });
        return { student_id: s.id, full_name: s.full_name, grades: gradeValues, grade_ids: gradeIds, slots, starred };
      })
    );
  };

  const calcSlotsScore = (slotsArr: GradeLevel[], maxScore: number, slotCount: number): number => {
    const perSlot = Math.round(maxScore / slotCount);
    return slotsArr.reduce((sum, lvl) => sum + levelScore(lvl, perSlot), 0);
  };

  const cycleSlot = (studentId: string, categoryId: string, slotIndex: number, maxScore: number, catName: string) => {
    const maxSlots = isParticipation(catName) ? MAX_PARTICIPATION_SLOTS : 1;
    setStudentGrades((prev) =>
      prev.map((sg) => {
        if (sg.student_id !== studentId) return sg;
        const currentSlots = [...(sg.slots[categoryId] || [null])];
        currentSlots[slotIndex] = nextLevel(currentSlots[slotIndex]);
        const score = sg.starred[categoryId] ? maxScore : calcSlotsScore(currentSlots, maxScore, maxSlots);
        return { ...sg, slots: { ...sg.slots, [categoryId]: currentSlots }, grades: { ...sg.grades, [categoryId]: score } };
      })
    );
  };

  const addSlot = (studentId: string, categoryId: string, maxScore: number) => {
    setStudentGrades((prev) =>
      prev.map((sg) => {
        if (sg.student_id !== studentId) return sg;
        const currentSlots = [...(sg.slots[categoryId] || [])];
        if (currentSlots.length >= MAX_PARTICIPATION_SLOTS) return sg;
        currentSlots.push(null);
        return { ...sg, slots: { ...sg.slots, [categoryId]: currentSlots } };
      })
    );
  };

  const toggleStar = (studentId: string, categoryId: string, maxScore: number) => {
    setStudentGrades((prev) =>
      prev.map((sg) => {
        if (sg.student_id !== studentId) return sg;
        const wasStarred = sg.starred[categoryId];
        const newStarred = !wasStarred;
        const catName = categories.find(c => c.id === categoryId)?.name || "";
        const slotCount = isParticipation(catName) ? MAX_PARTICIPATION_SLOTS : 1;
        const score = newStarred ? maxScore : calcSlotsScore(sg.slots[categoryId] || [null], maxScore, slotCount);
        return { ...sg, starred: { ...sg.starred, [categoryId]: newStarred }, grades: { ...sg.grades, [categoryId]: score } };
      })
    );
  };

  const clearGrade = (studentId: string, categoryId: string) => {
    setStudentGrades((prev) =>
      prev.map((sg) =>
        sg.student_id === studentId
          ? { ...sg, grades: { ...sg.grades, [categoryId]: null }, slots: { ...sg.slots, [categoryId]: [null] }, starred: { ...sg.starred, [categoryId]: false } }
          : sg
      )
    );
  };

  const setNumericGrade = (studentId: string, categoryId: string, value: string, maxScore: number) => {
    const num = value === "" ? null : Math.min(Math.max(0, Number(value)), maxScore);
    setStudentGrades((prev) =>
      prev.map((sg) =>
        sg.student_id === studentId ? { ...sg, grades: { ...sg.grades, [categoryId]: num } } : sg
      )
    );
  };

  const calcTotal = (grades: Record<string, number | null>) => {
    let total = 0, maxTotal = 0;
    categories.forEach((cat) => {
      const score = grades[cat.id];
      maxTotal += Number(cat.max_score);
      if (score !== null && score !== undefined) {
        total += score;
      }
    });
    return maxTotal > 0 ? `${total} / ${maxTotal}` : "—";
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const catsToSave = selectedCategory && selectedCategory !== "all"
        ? dailyCategories.filter((c) => c.id === selectedCategory) : dailyCategories;

      const updateOps: PromiseLike<void>[] = [];
      const inserts: { student_id: string; category_id: string; score: number; recorded_by: string; period: number }[] = [];

      for (const sg of studentGrades) {
        for (const cat of catsToSave) {
          const score = sg.grades[cat.id];
          const existingId = sg.grade_ids[cat.id];
          if (score !== null && score !== undefined) {
            if (existingId) {
              updateOps.push(
                supabase.from("grades").update({ score }).eq("id", existingId).then(res => {
                  if (res.error) throw new Error(res.error.message);
                })
              );
            } else {
              inserts.push({ student_id: sg.student_id, category_id: cat.id, score, recorded_by: user.id, period: selectedPeriod, date: format(selectedDate, "yyyy-MM-dd") } as any);
            }
          }
        }
      }

      await Promise.all(updateOps);

      // Batch upsert new grades
      let insertedData: any[] = [];
      if (inserts.length > 0) {
        const { data, error } = await supabase.from("grades").upsert(inserts, { onConflict: "student_id,category_id,date,period" }).select("id, student_id, category_id");
        if (error) throw new Error(error.message || "فشل إدخال الدرجات");
        insertedData = data || [];
      }

      // Update grade_ids locally so icons are preserved without reload
      if (insertedData.length > 0) {
        setStudentGrades(prev => prev.map(sg => {
          const newIds = { ...sg.grade_ids };
          insertedData.forEach((ins: any) => {
            if (ins.student_id === sg.student_id) {
              newIds[ins.category_id] = ins.id;
            }
          });
          return { ...sg, grade_ids: newIds };
        }));
      }

      toast({ title: "تم الحفظ", description: "تم حفظ الدرجات بنجاح" });
    } catch (err: any) {
      console.error("Grade save error:", err);
      toast({
        title: "فشل حفظ الدرجات",
        description: err?.message || "حدث خطأ غير متوقع أثناء الحفظ. حاول مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const dailyCategories = categories.filter(c => !isHiddenFromDaily(c.name));
  const visibleCategories = selectedCategory && selectedCategory !== "all"
    ? dailyCategories.filter((c) => c.id === selectedCategory) : dailyCategories;
  const isSingleCategory = selectedCategory && selectedCategory !== "all";

  return (
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
           <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-lg">إدخال الدرجات اليومية</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {categories.length > 0 && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="جميع الفئات" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    {dailyCategories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {selectedClass && categories.length > 0 && (
                <GradesExportDialog
                  title="الإدخال اليومي"
                  fileName="الإدخال_اليومي"
                  groups={(() => {
                    const className = classes.find(c => c.id === selectedClass)?.name || "الفصل";
                    const headers = ["#", "الطالب", ...visibleCategories.map(c => c.name), ...(!isSingleCategory ? ["المجموع"] : [])];
                    const rows = studentGrades.map((sg, i) => [
                      String(i + 1),
                      sg.full_name,
                      ...visibleCategories.map(c => sg.grades[c.id] != null ? String(sg.grades[c.id]) : "—"),
                      ...(!isSingleCategory ? [calcTotal(sg.grades)] : []),
                    ]);
                    return [{ className, headers, rows }] as ExportTableGroup[];
                  })()}
                />
              )}
            </div>
          </div>
          {/* Date Navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <HijriDatePicker
              date={selectedDate}
              onDateChange={setSelectedDate}
            />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextDay} disabled={isToday(selectedDate)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {!isToday(selectedDate) && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={goToToday}>اليوم</Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedClass ? (
           <p className="text-center py-12 text-muted-foreground">اختر فصلاً لعرض الدرجات</p>
         ) : categories.length === 0 ? (
           <p className="text-center py-12 text-muted-foreground">لم يتم إعداد فئات التقييم لهذا الفصل بعد</p>
        ) : (
          <>
             <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4 text-sm">
               <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                 <CircleCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /><span className="text-emerald-700 dark:text-emerald-300 font-medium">ممتاز</span>
               </div>
               <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                 <CircleMinus className="h-5 w-5 text-amber-500 dark:text-amber-400" /><span className="text-amber-700 dark:text-amber-300 font-medium">متوسط</span>
               </div>
               <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                 <CircleX className="h-5 w-5 text-rose-500 dark:text-rose-400" /><span className="text-rose-700 dark:text-rose-300 font-medium">صفر</span>
               </div>
               <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20">
                 <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 dark:text-yellow-400 dark:fill-yellow-400" /><span className="text-yellow-700 dark:text-yellow-300 font-medium">متميز</span>
               </div>
               <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/20">
                 <Undo2 className="h-4 w-4 text-slate-500 dark:text-slate-400" /><span className="text-slate-600 dark:text-slate-300 font-medium">تراجع</span>
               </div>
             </div>

            <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                     <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">#</th>
                     <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[180px]">الطالب</th>
                    {visibleCategories.map((cat) => (
                      <th key={cat.id} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[100px]">
                        <div>{cat.name}</div>
                      </th>
                    ))}
                    {!isSingleCategory && <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl min-w-[80px]">المجموع</th>}
                  </tr>
                </thead>
                <tbody>
                  {studentGrades.map((sg, i) => {
                    const isEven = i % 2 === 0;
                    const isLast = i === studentGrades.length - 1;
                    return (
                    <tr
                      key={sg.student_id}
                      className={cn(
                        isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                        !isLast && "border-b border-border/20"
                      )}
                    >
                      <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{i + 1}</td>
                      <td className="p-3 font-semibold border-l border-border/10">{sg.full_name}</td>
                      {visibleCategories.map((cat) => {
                        const maxScore = Number(cat.max_score);
                        const currentScore = sg.grades[cat.id];

                        const isPartCat = isParticipation(cat.name);
                        const slotsArr = sg.slots[cat.id] || [null];
                        const isStarred = sg.starred[cat.id] || false;

                        return (
                          <td key={cat.id} className="p-3 text-center border-l border-border/10">
                            <div className="flex items-center justify-center gap-1">
                              {/* Cycling icons */}
                              {slotsArr.map((slotLevel, si) => (
                                 <button
                                   key={si}
                                   type="button"
                                   onClick={() => cycleSlot(sg.student_id, cat.id, si, maxScore, cat.name)}
                                   className={cn(
                                     "p-1 rounded-lg transition-all hover:scale-110 cursor-pointer",
                                     slotLevel === "excellent" && "bg-emerald-50 dark:bg-emerald-500/15",
                                     slotLevel === "average" && "bg-amber-50 dark:bg-amber-500/15",
                                     slotLevel === "zero" && "bg-rose-50 dark:bg-rose-500/15",
                                   )}
                                   title="اضغط للتبديل"
                                 >
                                   <LevelIcon level={slotLevel} />
                                 </button>
                              ))}

                              {/* Add slot button for participation */}
                              {isPartCat && slotsArr.length < MAX_PARTICIPATION_SLOTS && (
                                <button
                                  type="button"
                                  onClick={() => addSlot(sg.student_id, cat.id, maxScore)}
                                  className="p-0.5 rounded-md transition-all hover:scale-110 opacity-40 hover:opacity-80"
                                  title="إضافة تقييم"
                                >
                                  <Plus className="h-5 w-5 text-muted-foreground" />
                                </button>
                              )}

                              {/* Separator */}
                              <span className="w-px h-5 bg-border mx-0.5" />

                              {/* Star - independent */}
                               <button
                                 type="button"
                                 onClick={() => toggleStar(sg.student_id, cat.id, maxScore)}
                                 className={cn(
                                   "p-1 rounded-lg transition-all hover:scale-110",
                                   isStarred ? "bg-yellow-50 dark:bg-yellow-500/15 opacity-100" : "opacity-40 hover:opacity-70"
                                 )}
                                 title="متميز"
                               >
                                 <Star className={cn("h-5 w-5", isStarred ? "text-yellow-500 fill-yellow-500 dark:text-yellow-400 dark:fill-yellow-400" : "text-muted-foreground")} />
                               </button>

                              {/* Undo */}
                              <button
                                type="button"
                                onClick={() => clearGrade(sg.student_id, cat.id)}
                                className="p-0.5 rounded-md transition-all hover:scale-110 opacity-40 hover:opacity-100"
                                title="تراجع"
                              >
                                <Undo2 className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </div>
                          </td>
                        );
                      })}
                      {!isSingleCategory && (
                        <td className={cn("p-3 text-center font-bold border-l border-border/10", isLast && "last:rounded-bl-xl")}>{calcTotal(sg.grades)}</td>
                      )}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={saving} className="shadow-md shadow-primary/20">
                 <Save className="h-4 w-4 ml-2" />
                 {saving ? "جارٍ الحفظ..." : "حفظ الدرجات"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
