import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, addDays, isToday } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────
export interface GradeCategory {
  id: string;
  name: string;
  weight: number;
  max_score: number;
  category_group: string;
  is_deduction?: boolean;
}

export type GradeLevel = "excellent" | "average" | "zero" | null;

export interface StudentGrade {
  student_id: string;
  full_name: string;
  grades: Record<string, number | null>;
  grade_ids: Record<string, string>;
  slots: Record<string, GradeLevel[]>;
  starred: Record<string, boolean>;
  notes: Record<string, string>;
}

// ── Helpers ────────────────────────────────────────────────────────
export const nextLevel = (current: GradeLevel): GradeLevel => {
  if (current === null) return "excellent";
  if (current === "excellent") return "average";
  if (current === "average") return "zero";
  return null;
};

export const levelScore = (level: GradeLevel, perSlot: number): number => {
  if (level === "excellent") return perSlot;
  if (level === "average") return Math.round(perSlot / 2);
  return 0;
};

export const restoreSlotsFromScore = ({
  score,
  maxScore,
  slotCount,
  isParticipationCategory,
}: {
  score: number | null;
  maxScore: number;
  slotCount: number;
  isParticipationCategory: boolean;
}): { slots: GradeLevel[]; starred: boolean } => {
  if (score === null) return { slots: [null], starred: false };
  // Full score → starred for ALL categories (not just participation)
  if (score >= maxScore) return { slots: [], starred: true };
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
  return { slots: restoredSlots.length > 0 ? restoredSlots : [null], starred: false };
};

export const isAllowedInDaily = (cat: GradeCategory) => cat.category_group === "classwork";
export const isParticipation = (name: string) => name === "المشاركة" || name.includes("المشاركة");
export const isBookCategory = (name: string) => name === "الكتاب";
export const DEFAULT_MAX_SLOTS = 3;

// ── Hook ───────────────────────────────────────────────────────────
interface UseDailyGradeDataProps {
  selectedClass: string;
  selectedPeriod: number;
}

export function useDailyGradeData({ selectedClass, selectedPeriod }: UseDailyGradeDataProps) {
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
  const goToNextDay = () => { if (!isToday(selectedDate)) setSelectedDate(prev => addDays(prev, 1)); };
  const goToToday = () => setSelectedDate(new Date());

  // Load classes & settings
  useEffect(() => {
    supabase.from("classes").select("id, name").order("name").then(({ data }) => setClasses(data || []));
    supabase.from("site_settings").select("id, value").in("id", ["daily_extra_slots_enabled", "daily_extra_slots_disabled_cats", "daily_max_slots", "daily_max_slots_per_cat"]).then(({ data }) => {
      (data || []).forEach((s: any) => {
        if (s.id === "daily_extra_slots_enabled") setExtraSlotsEnabled(s.value !== "false");
        if (s.id === "daily_extra_slots_disabled_cats" && s.value) { try { setExtraSlotsDisabledCats(JSON.parse(s.value)); } catch { setExtraSlotsDisabledCats([]); } }
        if (s.id === "daily_max_slots" && s.value) setGlobalMaxSlots(Number(s.value) || DEFAULT_MAX_SLOTS);
        if (s.id === "daily_max_slots_per_cat" && s.value) { try { setMaxSlotsPerCat(JSON.parse(s.value)); } catch { setMaxSlotsPerCat({}); } }
      });
    });
  }, []);

  const getCatName = (catId: string) => categories.find(c => c.id === catId)?.name || "";
  const getMaxSlots = useCallback((catId: string) => {
    const name = getCatName(catId);
    return maxSlotsPerCat[name] ?? maxSlotsPerCat[catId] ?? globalMaxSlots;
  }, [categories, maxSlotsPerCat, globalMaxSlots]);

  const isCatDisabled = (catId: string) => {
    const name = getCatName(catId);
    return extraSlotsDisabledCats.includes(name) || extraSlotsDisabledCats.includes(catId);
  };

  // Load data
  const loadData = useCallback(async () => {
    if (!selectedClass) return;
    const { data: cats } = await supabase.from("grade_categories").select("*").or(`class_id.eq.${selectedClass},class_id.is.null`).order("sort_order");
    const { data: students } = await supabase.from("students").select("id, full_name").eq("class_id", selectedClass).order("full_name");
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data: grades } = await supabase.from("grades").select("id, student_id, category_id, score, period, note")
      .in("student_id", (students || []).map((s) => s.id)).eq("period", selectedPeriod).eq("date", dateStr);

    const gradesMap = new Map<string, Map<string, { score: number | null; id: string; note: string }>>();
    grades?.forEach((g) => {
      if (!gradesMap.has(g.student_id)) gradesMap.set(g.student_id, new Map());
      gradesMap.get(g.student_id)!.set(g.category_id, { score: g.score != null ? Number(g.score) : null, id: g.id, note: (g as any).note || "" });
    });

    setCategories((cats as GradeCategory[]) || []);
    setStudentGrades((students || []).map((s) => {
      const studentGradesMap = gradesMap.get(s.id) || new Map();
      const gradeValues: Record<string, number | null> = {};
      const gradeIds: Record<string, string> = {};
      const slots: Record<string, GradeLevel[]> = {};
      const starred: Record<string, boolean> = {};
      const notes: Record<string, string> = {};
      (cats || []).forEach((c: any) => {
        const g = studentGradesMap.get(c.id);
        const score = g?.score ?? null;
        gradeValues[c.id] = score;
        if (g?.id) gradeIds[c.id] = g.id;
        notes[c.id] = g?.note || "";
        const max = Number(c.max_score);
        const isPartCat = isParticipation(c.name);
        const slotCount = getMaxSlots(c.id);
        const restored = restoreSlotsFromScore({ score, maxScore: max, slotCount, isParticipationCategory: isPartCat });
        slots[c.id] = restored.slots;
        starred[c.id] = restored.starred;
      });
      return { student_id: s.id, full_name: s.full_name, grades: gradeValues, grade_ids: gradeIds, slots, starred, notes };
    }));
  }, [selectedClass, selectedDate, selectedPeriod, getMaxSlots]);

  useEffect(() => {
    if (!selectedClass) return;
    setSelectedCategory("");
    loadData();
  }, [selectedClass, selectedDate, selectedPeriod]);

  // Load attendance
  const loadAttendance = useCallback(async () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data } = await supabase.from("attendance_records").select("student_id, status").eq("class_id", selectedClass).eq("date", dateStr);
    const map: Record<string, string> = {};
    (data || []).forEach((r) => { map[r.student_id] = r.status; });
    setAttendanceMap(map);
    setAttendanceLoaded(true);
  }, [selectedClass, selectedDate]);

  useEffect(() => { if (selectedClass) { setAttendanceLoaded(false); loadAttendance(); } }, [selectedClass, selectedDate]);

  // Realtime attendance
  useEffect(() => {
    if (!selectedClass) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const channel = supabase.channel(`attendance-daily-${selectedClass}-${dateStr}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records", filter: `class_id=eq.${selectedClass}` },
        (payload: any) => { if ((payload.new || payload.old)?.date === dateStr) loadAttendance(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedClass, selectedDate, loadAttendance]);

  // Slot manipulation
  const calcSlotsScore = (slotsArr: GradeLevel[], maxScore: number, slotCount: number): number | null => {
    // If ALL slots are null (empty), return null so no grade is saved
    if (slotsArr.every(lvl => lvl === null)) return null;
    const perSlot = Math.round(maxScore / slotCount);
    return slotsArr.reduce((sum, lvl) => sum + levelScore(lvl, perSlot), 0);
  };

  const cycleSlot = (studentId: string, categoryId: string, slotIndex: number, maxScore: number) => {
    const maxSlots = getMaxSlots(categoryId);
    setStudentGrades((prev) => prev.map((sg) => {
      if (sg.student_id !== studentId) return sg;
      const currentSlots = [...(sg.slots[categoryId] || [null])];
      currentSlots[slotIndex] = nextLevel(currentSlots[slotIndex]);
      // If cycling back to null cleared everything, also clear star
      const allEmpty = currentSlots.every(lvl => lvl === null);
      const starred = allEmpty ? false : sg.starred[categoryId];
      const score = starred ? maxScore : calcSlotsScore(currentSlots, maxScore, maxSlots);
      return { ...sg, slots: { ...sg.slots, [categoryId]: currentSlots }, starred: { ...sg.starred, [categoryId]: starred }, grades: { ...sg.grades, [categoryId]: score } };
    }));
  };

  const addSlot = (studentId: string, categoryId: string) => {
    setStudentGrades((prev) => prev.map((sg) => {
      if (sg.student_id !== studentId) return sg;
      const currentSlots = [...(sg.slots[categoryId] || [])];
      if (currentSlots.length >= getMaxSlots(categoryId)) return sg;
      currentSlots.push(null);
      return { ...sg, slots: { ...sg.slots, [categoryId]: currentSlots } };
    }));
  };

  const toggleStar = (studentId: string, categoryId: string, maxScore: number) => {
    setStudentGrades((prev) => prev.map((sg) => {
      if (sg.student_id !== studentId) return sg;
      const newStarred = !sg.starred[categoryId];
      const slotCount = getMaxSlots(categoryId);
      const score = newStarred ? maxScore : calcSlotsScore(sg.slots[categoryId] || [null], maxScore, slotCount);
      return { ...sg, starred: { ...sg.starred, [categoryId]: newStarred }, grades: { ...sg.grades, [categoryId]: score } };
    }));
  };

  const clearGrade = (studentId: string, categoryId: string) => {
    setStudentGrades((prev) => prev.map((sg) =>
      sg.student_id === studentId
        ? { ...sg, grades: { ...sg.grades, [categoryId]: null }, slots: { ...sg.slots, [categoryId]: [null] }, starred: { ...sg.starred, [categoryId]: false } }
        : sg
    ));
  };

  const setNumericGrade = (studentId: string, categoryId: string, value: string, maxScore: number) => {
    const num = value === "" ? null : Math.min(Math.max(0, Number(value)), maxScore);
    setStudentGrades((prev) => prev.map((sg) =>
      sg.student_id === studentId ? { ...sg, grades: { ...sg.grades, [categoryId]: num } } : sg
    ));
  };

  const setDeductionNote = (studentId: string, categoryId: string, note: string) => {
    setStudentGrades((prev) => prev.map((sg) =>
      sg.student_id === studentId ? { ...sg, notes: { ...sg.notes, [categoryId]: note } } : sg
    ));
  };

  // Computed
  const dailyCategories = categories.filter(c => isAllowedInDaily(c));
  const visibleCategories = selectedCategory && selectedCategory !== "all"
    ? dailyCategories.filter((c) => c.id === selectedCategory) : dailyCategories;
  const isSingleCategory = !!(selectedCategory && selectedCategory !== "all");

  const hasAttendanceRecords = attendanceLoaded && Object.keys(attendanceMap).length > 0;
  const hiddenStatuses = ["absent", "early_leave", "sick_leave"];

  const filteredStudentGrades = useMemo(() => {
    if (!attendanceLoaded || !hasAttendanceRecords) return studentGrades;
    if (showAbsent) return studentGrades;
    return studentGrades.filter((sg) => {
      const status = attendanceMap[sg.student_id];
      return status && !hiddenStatuses.includes(status);
    });
  }, [studentGrades, attendanceMap, attendanceLoaded, hasAttendanceRecords, showAbsent]);

  const absentCount = useMemo(() => {
    if (!hasAttendanceRecords) return 0;
    return studentGrades.filter(sg => hiddenStatuses.includes(attendanceMap[sg.student_id] || "")).length;
  }, [studentGrades, attendanceMap, hasAttendanceRecords]);

  const calcTotal = (grades: Record<string, number | null>) => {
    let total = 0, maxTotal = 0;
    categories.forEach((cat) => {
      if (cat.is_deduction) return; // deductions are standalone, not counted in total
      const score = grades[cat.id];
      maxTotal += Number(cat.max_score);
      if (score !== null && score !== undefined) total += score;
    });
    return maxTotal > 0 ? `${total} / ${maxTotal}` : "—";
  };

  // Save
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const catsToSave = selectedCategory && selectedCategory !== "all"
        ? dailyCategories.filter((c) => c.id === selectedCategory) : dailyCategories;

      const updateOps: PromiseLike<void>[] = [];
      const inserts: any[] = [];

      for (const sg of studentGrades) {
        for (const cat of catsToSave) {
          const score = sg.grades[cat.id];
          const note = sg.notes?.[cat.id] || "";
          const existingId = sg.grade_ids[cat.id];
          if (score !== null && score !== undefined) {
            if (existingId) {
              updateOps.push(supabase.from("grades").update({ score, note }).eq("id", existingId).then(res => { if (res.error) throw new Error(res.error.message); }));
            } else {
              inserts.push({ student_id: sg.student_id, category_id: cat.id, score, note, recorded_by: user.id, period: selectedPeriod, date: format(selectedDate, "yyyy-MM-dd") });
            }
          }
        }
      }

      await Promise.all(updateOps);

      let insertedData: any[] = [];
      if (inserts.length > 0) {
        const { data, error } = await supabase.from("grades").upsert(inserts, { onConflict: "student_id,category_id,date,period" }).select("id, student_id, category_id");
        if (error) throw new Error(error.message || "فشل إدخال الدرجات");
        insertedData = data || [];
      }

      if (insertedData.length > 0) {
        setStudentGrades(prev => prev.map(sg => {
          const newIds = { ...sg.grade_ids };
          insertedData.forEach((ins: any) => { if (ins.student_id === sg.student_id) newIds[ins.category_id] = ins.id; });
          return { ...sg, grade_ids: newIds };
        }));
      }

      const savedCounts: { name: string; count: number }[] = [];
      for (const sg of studentGrades) {
        let count = 0;
        for (const cat of catsToSave) { if (sg.grades[cat.id] !== null && sg.grades[cat.id] !== undefined) count++; }
        if (count > 0) savedCounts.push({ name: sg.full_name.split(" ").slice(0, 2).join(" "), count });
      }
      const totalGrades = savedCounts.reduce((s, r) => s + r.count, 0);
      const summaryLines = savedCounts.map(r => `${r.name}: ${r.count} درجة`).join("\n");
      toast({ title: `✅ تم حفظ ${totalGrades} درجة لـ ${savedCounts.length} طالب`, description: summaryLines });
    } catch (err: any) {
      console.error("Grade save error:", err);
      toast({ title: "فشل حفظ الدرجات", description: err?.message || "حدث خطأ غير متوقع أثناء الحفظ. حاول مرة أخرى.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return {
    classes, categories, studentGrades, saving, selectedDate, setSelectedDate,
    selectedCategory, setSelectedCategory,
    extraSlotsEnabled, showAbsent, setShowAbsent,
    attendanceLoaded, attendanceMap, hasAttendanceRecords,
    tableRef, dailyCategories, visibleCategories, isSingleCategory,
    filteredStudentGrades, absentCount, hiddenStatuses,
    goToPrevDay, goToNextDay, goToToday,
    getMaxSlots, isCatDisabled,
    cycleSlot, addSlot, toggleStar, clearGrade, setNumericGrade, setDeductionNote,
    calcTotal, handleSave,
  };
}
