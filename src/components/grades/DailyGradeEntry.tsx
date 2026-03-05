import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save, CircleCheck, CircleMinus, CircleX, Star, Undo2, Plus, ChevronRight, ChevronLeft, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, addDays, isToday } from "date-fns";
import { ar } from "date-fns/locale";

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
  if (level === "excellent") return <CircleCheck className={cn(size, "text-green-600")} />;
  if (level === "average") return <CircleMinus className={cn(size, "text-yellow-500")} />;
  if (level === "zero") return <CircleX className={cn(size, "text-red-500")} />;
  return <CircleMinus className={cn(size, "text-muted-foreground opacity-30")} />;
};

const NUMERIC_CATEGORIES = ["اختبار عملي", "اختبار الفترة"];
const isNumericCategory = (name: string) => NUMERIC_CATEGORIES.includes(name);
const isParticipation = (name: string) => name === "المشاركة";
const MAX_PARTICIPATION_SLOTS = 3;

interface DailyGradeEntryProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
}

export default function DailyGradeEntry({ selectedClass, onClassChange }: DailyGradeEntryProps) {
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
  }, [selectedClass, selectedDate]);

  const loadData = async () => {
    const { data: cats } = await supabase
      .from("grade_categories").select("*").eq("class_id", selectedClass).order("sort_order");
    const { data: students } = await supabase
      .from("students").select("id, full_name").eq("class_id", selectedClass).order("full_name");
    const { data: grades } = await supabase
      .from("grades").select("id, student_id, category_id, score")
      .in("student_id", (students || []).map((s) => s.id));

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
          gradeValues[c.id] = g?.score ?? null;
          if (g?.id) gradeIds[c.id] = g.id;
          slots[c.id] = [null]; // start with 1 slot
          starred[c.id] = false;
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
        const score = newStarred ? maxScore : calcSlotsScore(sg.slots[categoryId] || [null], maxScore, isParticipation("") ? 1 : 1);
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
    let total = 0, totalWeight = 0;
    categories.forEach((cat) => {
      const score = grades[cat.id];
      if (score !== null && score !== undefined) {
        const weight = Number(cat.weight);
        total += (score / Number(cat.max_score)) * weight;
        totalWeight += weight;
      }
    });
    return totalWeight > 0 ? ((total / totalWeight) * 100).toFixed(1) : "—";
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const catsToSave = selectedCategory && selectedCategory !== "all"
      ? categories.filter((c) => c.id === selectedCategory) : categories;

    for (const sg of studentGrades) {
      for (const cat of catsToSave) {
        const score = sg.grades[cat.id];
        const existingId = sg.grade_ids[cat.id];
        if (score !== null && score !== undefined) {
          if (existingId) {
            await supabase.from("grades").update({ score }).eq("id", existingId);
          } else {
            await supabase.from("grades").insert({ student_id: sg.student_id, category_id: cat.id, score, recorded_by: user.id });
          }
        }
      }
    }
    toast({ title: "تم الحفظ", description: "تم حفظ الدرجات بنجاح" });
    setSaving(false);
    loadData();
  };

  const visibleCategories = selectedCategory && selectedCategory !== "all"
    ? categories.filter((c) => c.id === selectedCategory) : categories;
  const isSingleCategory = selectedCategory && selectedCategory !== "all";

  return (
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-lg">إدخال الدرجات اليومية</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={selectedClass} onValueChange={onClassChange}>
                <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="اختر الفصل..." /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {categories.length > 0 && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="جميع الفئات" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    {categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          {/* Date Navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-sm font-medium min-w-[160px] justify-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(selectedDate, "EEEE yyyy/MM/dd", { locale: ar })}
            </div>
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
            <div className="flex gap-4 mb-4 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <CircleCheck className="h-5 w-5 text-green-600" /><span>ممتاز</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CircleMinus className="h-5 w-5 text-yellow-500" /><span>متوسط</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CircleX className="h-5 w-5 text-red-500" /><span>صفر</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" /><span>متميز (الدرجة الكاملة)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Undo2 className="h-4 w-4 text-muted-foreground" /><span>تراجع</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                    <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 sticky right-0 bg-gradient-to-l from-primary/8 to-primary/4 dark:from-primary/15 dark:to-primary/8 first:rounded-tr-xl">#</th>
                    <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 sticky right-10 bg-gradient-to-l from-primary/8 to-primary/4 dark:from-primary/15 dark:to-primary/8 min-w-[180px]">الطالب</th>
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

                        if (isNumericCategory(cat.name)) {
                          return (
                            <td key={cat.id} className="p-3 text-center border-l border-border/10">
                              <Input
                                type="number" min={0} max={maxScore}
                                value={currentScore ?? ""}
                                onChange={(e) => setNumericGrade(sg.student_id, cat.id, e.target.value, maxScore)}
                                className="w-20 text-center h-8 mx-auto"
                                placeholder={`/${maxScore}`}
                              />
                            </td>
                          );
                        }

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
                                  className="p-0.5 rounded-md transition-all hover:scale-110 cursor-pointer"
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
                                  "p-0.5 rounded-md transition-all hover:scale-110",
                                  isStarred ? "opacity-100" : "opacity-40 hover:opacity-70"
                                )}
                                title="متميز"
                              >
                                <Star className={cn("h-5 w-5", isStarred ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
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
