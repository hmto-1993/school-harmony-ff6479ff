import React, { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save, CircleCheck, CircleMinus, CircleX, Star, Undo2, Plus, ChevronRight, ChevronLeft, Download, Printer, FileText, AlertTriangle, Clock, Eye, EyeOff } from "lucide-react";
import ScrollToSaveButton from "@/components/shared/ScrollToSaveButton";
import GradesExportDialog, { ExportTableGroup } from "./GradesExportDialog";
import { cn } from "@/lib/utils";
import { subDays, addDays, isToday, format } from "date-fns";
import { HijriDatePicker } from "@/components/ui/hijri-date-picker";
import { printGradesTable, exportGradesTableAsPDF } from "@/lib/grades-print";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GradeCategory {
  id: string;
  name: string;
  weight: number;
  max_score: number;
  category_group: string;
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

const LevelIcon = React.forwardRef<HTMLDivElement, { level: GradeLevel; size?: string }>(
  ({ level, size = "h-6 w-6", ...props }, ref) => {
    if (level === "excellent") return <div ref={ref} {...props}><CircleCheck className={cn(size, "text-emerald-600 dark:text-emerald-400")} /></div>;
    if (level === "average") return <div ref={ref} {...props}><CircleMinus className={cn(size, "text-amber-500 dark:text-amber-400")} /></div>;
    if (level === "zero") return <div ref={ref} {...props}><CircleX className={cn(size, "text-rose-500 dark:text-rose-400")} /></div>;
    return (
      <div ref={ref} {...props} className={cn(size, "rounded-full border-2 border-dashed border-muted-foreground/30")} />
    );
  }
);
LevelIcon.displayName = "LevelIcon";

const isAllowedInDaily = (cat: GradeCategory) => cat.category_group === "classwork";
const isParticipation = (name: string) => name === "المشاركة" || name.includes("المشاركة");
const isBookCategory = (name: string) => name === "الكتاب";
const DEFAULT_MAX_SLOTS = 3;


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
  const [extraSlotsEnabled, setExtraSlotsEnabled] = useState(true);
  const [extraSlotsDisabledCats, setExtraSlotsDisabledCats] = useState<string[]>([]);
  const [globalMaxSlots, setGlobalMaxSlots] = useState(DEFAULT_MAX_SLOTS);
  const [maxSlotsPerCat, setMaxSlotsPerCat] = useState<Record<string, number>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [showAbsent, setShowAbsent] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const goToPrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => {
    if (!isToday(selectedDate)) setSelectedDate(prev => addDays(prev, 1));
  };
  const goToToday = () => setSelectedDate(new Date());

  useEffect(() => {
    supabase.from("classes").select("id, name").order("name").then(({ data }) => setClasses(data || []));
    supabase.from("site_settings").select("id, value").in("id", ["daily_extra_slots_enabled", "daily_extra_slots_disabled_cats", "daily_max_slots", "daily_max_slots_per_cat"]).then(({ data }) => {
      (data || []).forEach((s: any) => {
        if (s.id === "daily_extra_slots_enabled") setExtraSlotsEnabled(s.value !== "false");
        if (s.id === "daily_extra_slots_disabled_cats" && s.value) {
          try { setExtraSlotsDisabledCats(JSON.parse(s.value)); } catch { setExtraSlotsDisabledCats([]); }
        }
        if (s.id === "daily_max_slots" && s.value) setGlobalMaxSlots(Number(s.value) || DEFAULT_MAX_SLOTS);
        if (s.id === "daily_max_slots_per_cat" && s.value) {
          try { setMaxSlotsPerCat(JSON.parse(s.value)); } catch { setMaxSlotsPerCat({}); }
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setSelectedCategory("");
    loadData();
  }, [selectedClass, selectedDate, selectedPeriod]);

  // Load attendance for the selected date & class
  const loadAttendance = async () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data } = await supabase
      .from("attendance_records")
      .select("student_id, status")
      .eq("class_id", selectedClass)
      .eq("date", dateStr);
    const map: Record<string, string> = {};
    (data || []).forEach((r) => { map[r.student_id] = r.status; });
    setAttendanceMap(map);
    setAttendanceLoaded(true);
  };

  useEffect(() => {
    if (!selectedClass) return;
    setAttendanceLoaded(false);
    loadAttendance();
  }, [selectedClass, selectedDate]);

  // Realtime subscription for attendance changes
  useEffect(() => {
    if (!selectedClass) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const channel = supabase
      .channel(`attendance-daily-${selectedClass}-${dateStr}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
          filter: `class_id=eq.${selectedClass}`,
        },
        (payload: any) => {
          const record = payload.new || payload.old;
          if (record?.date === dateStr) {
            loadAttendance();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedClass, selectedDate]);

  const getMaxSlots = (catId: string) => maxSlotsPerCat[catId] ?? globalMaxSlots;

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
            const slotCount = getMaxSlots(c.id);
            const perSlot = Math.round(max / slotCount);

            if (score >= max && isPartCat) {
              // Full score on participation → starred
              starred[c.id] = true;
              slots[c.id] = Array(slotCount).fill(null);
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
    const maxSlots = getMaxSlots(categoryId);
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
        if (currentSlots.length >= getMaxSlots(categoryId)) return sg;
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
        const slotCount = getMaxSlots(categoryId);
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

  const dailyCategories = categories.filter(c => isAllowedInDaily(c));
  const visibleCategories = selectedCategory && selectedCategory !== "all"
    ? dailyCategories.filter((c) => c.id === selectedCategory) : dailyCategories;
  const isSingleCategory = selectedCategory && selectedCategory !== "all";

  // Filter students: show only present/late, hide absent
  const hasAttendanceRecords = attendanceLoaded && Object.keys(attendanceMap).length > 0;
  const filteredStudentGrades = useMemo(() => {
    if (!attendanceLoaded || !hasAttendanceRecords) return studentGrades;
    return studentGrades.filter((sg) => {
      const status = attendanceMap[sg.student_id];
      // Show students who are present, late, early_leave, sick_leave — hide only "absent"
      return status && status !== "absent";
    });
  }, [studentGrades, attendanceMap, attendanceLoaded, hasAttendanceRecords]);

  const buildDailyTableHTML = () => {
    const getLevelIcon = (level: GradeLevel) => {
      if (level === "excellent") return '<span class="icon-excellent">✔</span>';
      if (level === "average") return '<span class="icon-average">➖</span>';
      if (level === "zero") return '<span class="icon-zero">✖</span>';
      return '<span style="display:inline-block;width:7px;height:7px;border-radius:9999px;border:1px dashed #ccc;"></span>';
    };
    const starIcon = '<span class="icon-star">☆</span>';

    const headerCells = [
      '<th style="width:30px;">#</th>',
      '<th style="width:20%;text-align:right;">الطالب</th>',
      ...visibleCategories.map(c => `<th>${c.name}<br><span style="font-size:9px;color:#64748b;">من ${Number(c.max_score)}</span></th>`),
      ...(!isSingleCategory ? ['<th class="subtotal-header">المجموع</th>'] : []),
    ].join('');

    const bodyRows = filteredStudentGrades.map((sg, i) => {
      const cells = [
        `<td>${i + 1}</td>`,
        `<td>${sg.full_name}</td>`,
        ...visibleCategories.map(cat => {
          const slotsArr = sg.slots[cat.id] || [null];
          const isStarred = sg.starred[cat.id] || false;
          const icons = slotsArr.map(l => getLevelIcon(l)).join(' ');
          const star = isStarred ? ` ${starIcon}` : '';
          return `<td><div class="icons-cell">${icons}${star}</div></td>`;
        }),
        ...(!isSingleCategory ? [`<td class="subtotal-cell">${calcTotal(sg.grades)}</td>`] : []),
      ].join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  };

  const getDailyPrintOptions = () => {
    const className = classes.find(c => c.id === selectedClass)?.name || "الفصل";
    const dateStr = format(selectedDate, "yyyy/MM/dd");
    return {
      orientation: "portrait" as const,
      title: `${className} — إدخال الدرجات اليومية`,
      subtitle: `${dateStr} — الفترة ${selectedPeriod === 1 ? "الأولى" : "الثانية"}`,
      reportType: "grades" as const,
      tableHTML: buildDailyTableHTML(),
    };
  };

  const handlePrintTable = async () => {
    await printGradesTable(getDailyPrintOptions());
  };

  const handleExportPDF = async () => {
    try {
      const opts = getDailyPrintOptions();
      await exportGradesTableAsPDF({ ...opts, fileName: `الإدخال_اليومي_${format(selectedDate, "yyyy-MM-dd")}` });
      toast({ title: "تم التصدير", description: "تم تصدير ملف PDF بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل تصدير PDF", variant: "destructive" });
    }
  };



  return (
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
      <CardHeader className="pb-3 no-print">
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
                   tableRef={tableRef}
                   groups={(() => {
                     const className = `${classes.find(c => c.id === selectedClass)?.name || "الفصل"} — ${format(selectedDate, "yyyy/MM/dd")}`;
                     const headers = ["#", "الطالب", ...visibleCategories.map(c => c.name), ...(!isSingleCategory ? ["المجموع"] : [])];
                     const rows = filteredStudentGrades.map((sg, i) => [
                       String(i + 1),
                       sg.full_name,
                       ...visibleCategories.map(c => {
                         const slotsArr = sg.slots[c.id] || [null];
                         const isStarred = sg.starred[c.id] || false;
                         if (isStarred) return "★";
                         const levelSymbol = (l: GradeLevel) => l === "excellent" ? "✓" : l === "average" ? "~" : l === "zero" ? "✗" : "";
                         const symbols = slotsArr.map(levelSymbol).filter(Boolean).join(" ");
                         return symbols || "-";
                       }),
                       ...(!isSingleCategory ? [calcTotal(sg.grades)] : []),
                     ]);
                     return [{ className, headers, rows }] as ExportTableGroup[];
                   })()}
                 />
               )}
               {selectedClass && categories.length > 0 && (
                 <div className="flex items-center gap-0.5">
                   <Button variant="ghost" size="icon" className="h-8 w-8" title="تصدير PDF" onClick={handleExportPDF}>
                     <FileText className="h-4 w-4" />
                   </Button>
                   <Button variant="ghost" size="icon" className="h-8 w-8" title="طباعة" onClick={handlePrintTable}>
                     <Printer className="h-4 w-4" />
                   </Button>
                 </div>
               )}
            </div>
          </div>
          {/* Date Navigation */}
           <div className="flex items-center gap-2 flex-wrap">
             <ScrollToSaveButton targetId="grades-save" label="حفظ ↓" />
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
             <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4 text-sm no-print">
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

            {/* Attendance alerts */}
            {attendanceLoaded && !hasAttendanceRecords && (
              <Alert className="mb-4 border-warning/50 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning text-sm font-medium">
                  يرجى رصد الحضور أولاً ليظهر الطلاب في قائمة التفاعل
                </AlertDescription>
              </Alert>
            )}
            {hasAttendanceRecords && filteredStudentGrades.length === 0 && (
              <Alert className="mb-4 border-muted-foreground/30">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-muted-foreground text-sm">
                  جميع الطلاب مسجّلون كغائبين في هذا اليوم
                </AlertDescription>
              </Alert>
            )}
            {hasAttendanceRecords && filteredStudentGrades.length > 0 && filteredStudentGrades.length < studentGrades.length && (
              <div className="mb-3 text-xs text-muted-foreground flex items-center gap-1.5 no-print">
                <span className="inline-block w-2 h-2 rounded-full bg-success" />
                يُعرض {filteredStudentGrades.length} طالب حاضر من أصل {studentGrades.length}
              </div>
            )}

            <div ref={tableRef} className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                     <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-l border-primary/20 first:rounded-tr-xl">#</th>
                     <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-l border-primary/20 min-w-[120px] max-w-[160px]">الطالب</th>
                    {visibleCategories.map((cat) => (
                      <th key={cat.id} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-l border-primary/20 min-w-[100px]">
                        <div>{cat.name}</div>
                      </th>
                    ))}
                    {!isSingleCategory && <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl min-w-[80px]">المجموع</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudentGrades.map((sg, i) => {
                    const isEven = i % 2 === 0;
                    const isLast = i === filteredStudentGrades.length - 1;
                    return (
                    <tr
                      key={sg.student_id}
                      className={cn(
                        "group transition-all duration-200 cursor-default hover:bg-primary/10 dark:hover:bg-primary/15",
                        isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                        !isLast && "border-b border-border/20"
                      )}
                    >
                      <td className="p-3 text-muted-foreground font-medium border-l border-border/30 transition-colors duration-200 group-hover:text-primary">{i + 1}</td>
                      <td className="p-3 font-semibold border-l border-border/30 whitespace-nowrap text-sm transition-all duration-200 group-hover:bg-primary/5 group-hover:text-primary">{sg.full_name}</td>
                      {visibleCategories.map((cat) => {
                        const maxScore = Number(cat.max_score);
                        const currentScore = sg.grades[cat.id];

                        const isPartCat = isParticipation(cat.name);
                        const slotsArr = sg.slots[cat.id] || [null];
                        const isStarred = sg.starred[cat.id] || false;

                        return (
                          <td key={cat.id} className="p-3 text-center border-l border-border/30">
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
                                     !slotLevel && "grade-empty",
                                   )}
                                   title="اضغط للتبديل"
                                   data-grade-level={slotLevel || "empty"}
                                 >
                                   <LevelIcon level={slotLevel} />
                                 </button>
                              ))}

                              {/* Add slot button for participation */}
                              {extraSlotsEnabled && !extraSlotsDisabledCats.includes(cat.id) && slotsArr.length < getMaxSlots(cat.id) && (
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
                                   isStarred ? "bg-yellow-50 dark:bg-yellow-500/15 opacity-100" : "opacity-40 hover:opacity-70 star-empty"
                                 )}
                                 title="متميز"
                                 data-starred={isStarred ? "true" : "false"}
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
                        <td className="p-3 text-center font-bold border-l border-border/30">{calcTotal(sg.grades)}</td>
                      )}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div id="grades-save" className="flex justify-end mt-4">
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
