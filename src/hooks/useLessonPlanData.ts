import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { safeWriteXLSX } from "@/lib/download-utils";

export interface ClassOption {
  id: string;
  name: string;
}

export interface LessonSlot {
  id?: string;
  lesson_title: string;
  objectives: string;
  teacher_reflection: string;
  is_completed: boolean;
}

export const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const DAY_NAME_TO_INDEX: Record<string, number> = {
  "الأحد": 0, "الاثنين": 1, "الثلاثاء": 2, "الأربعاء": 3, "الخميس": 4,
};
export const WEEKLY_DAY_INDEX = -1;

export function useLessonPlanData(classes: ClassOption[]) {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [periodsPerWeek, setPeriodsPerWeek] = useState(5);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4]);
  const [slots, setSlots] = useState<Record<string, LessonSlot>>({});
  const [weeklySlots, setWeeklySlots] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingPdf, setImportingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const isAllClasses = selectedClassId === "__all__";
  const effectiveClassId = isAllClasses ? (classes[0]?.id || "") : selectedClassId;

  // Load schedule for single class
  useEffect(() => {
    if (!effectiveClassId || isAllClasses) return;
    (async () => {
      const { data } = await supabase
        .from("class_schedules")
        .select("periods_per_week, days_of_week")
        .eq("class_id", effectiveClassId)
        .maybeSingle();
      if (data) {
        setPeriodsPerWeek(data.periods_per_week);
        setDaysOfWeek(data.days_of_week);
      } else {
        setPeriodsPerWeek(5);
        setDaysOfWeek([0, 1, 2, 3, 4]);
      }
    })();
  }, [effectiveClassId, isAllClasses]);

  // Load schedule for "all classes" mode
  useEffect(() => {
    if (!isAllClasses || classes.length === 0) return;
    const firstId = classes[0].id;
    (async () => {
      const { data } = await supabase
        .from("class_schedules")
        .select("periods_per_week, days_of_week")
        .eq("class_id", firstId)
        .maybeSingle();
      if (data) {
        setPeriodsPerWeek(data.periods_per_week);
        setDaysOfWeek(data.days_of_week);
      } else {
        setPeriodsPerWeek(5);
        setDaysOfWeek([0, 1, 2, 3, 4]);
      }
    })();
  }, [isAllClasses, classes]);

  const fetchLessons = useCallback(async () => {
    if (!effectiveClassId) return;
    setLoading(true);
    const { data } = await supabase
      .from("lesson_plans")
      .select("*")
      .eq("class_id", effectiveClassId)
      .eq("week_number", weekNumber);

    const map: Record<string, LessonSlot> = {};
    const newWeeklySlots = new Set<number>();
    (data || []).forEach((lp: any) => {
      const key = `${lp.day_index}-${lp.slot_index}`;
      map[key] = {
        id: lp.id,
        lesson_title: lp.lesson_title || "",
        objectives: lp.objectives || "",
        teacher_reflection: lp.teacher_reflection || "",
        is_completed: lp.is_completed || false,
      };
      if (lp.day_index === WEEKLY_DAY_INDEX) {
        newWeeklySlots.add(lp.slot_index);
      }
    });
    setSlots(map);
    setWeeklySlots(newWeeklySlots);
    setLoading(false);
  }, [effectiveClassId, weekNumber]);

  useEffect(() => {
    if (effectiveClassId) fetchLessons();
  }, [fetchLessons, effectiveClassId]);

  const slotsPerDay = Math.max(1, Math.ceil(periodsPerWeek / Math.max(daysOfWeek.length, 1)));

  const updateSlot = (dayIdx: number, slotIdx: number, field: keyof LessonSlot, value: string | boolean) => {
    const key = `${dayIdx}-${slotIdx}`;
    setSlots((prev) => ({
      ...prev,
      [key]: {
        ...prev[key] || { lesson_title: "", objectives: "", teacher_reflection: "", is_completed: false },
        [field]: value,
      },
    }));
  };

  const toggleWeeklySlot = (slotIdx: number) => {
    setWeeklySlots(prev => {
      const next = new Set(prev);
      if (next.has(slotIdx)) {
        next.delete(slotIdx);
        const weeklyKey = `${WEEKLY_DAY_INDEX}-${slotIdx}`;
        const weeklyData = slots[weeklyKey];
        if (weeklyData?.lesson_title?.trim()) {
          const firstDay = daysOfWeek[0] ?? 0;
          const dailyKey = `${firstDay}-${slotIdx}`;
          setSlots(prev => {
            const updated = { ...prev };
            updated[dailyKey] = { ...weeklyData };
            delete updated[weeklyKey];
            return updated;
          });
        } else {
          setSlots(prev => {
            const updated = { ...prev };
            delete updated[weeklyKey];
            return updated;
          });
        }
      } else {
        next.add(slotIdx);
        let foundData: LessonSlot | null = null;
        const keysToRemove: string[] = [];
        for (const dayIdx of daysOfWeek) {
          const dailyKey = `${dayIdx}-${slotIdx}`;
          if (slots[dailyKey]?.lesson_title?.trim() && !foundData) {
            foundData = { ...slots[dailyKey] };
          }
          keysToRemove.push(dailyKey);
        }
        const weeklyKey = `${WEEKLY_DAY_INDEX}-${slotIdx}`;
        setSlots(prev => {
          const updated = { ...prev };
          keysToRemove.forEach(k => delete updated[k]);
          if (foundData) {
            updated[weeklyKey] = foundData;
          } else {
            updated[weeklyKey] = { lesson_title: "", objectives: "", teacher_reflection: "", is_completed: false };
          }
          return updated;
        });
      }
      return next;
    });
  };

  const saveToClasses = async (targetClasses: ClassOption[], slotsData: Record<string, LessonSlot>, wk: number) => {
    if (!user) return 0;
    let totalInserted = 0;
    for (const cls of targetClasses) {
      await supabase.from("lesson_plans").delete().eq("class_id", cls.id).eq("week_number", wk).eq("created_by", user.id);
      const rows = Object.entries(slotsData)
        .filter(([, s]) => s.lesson_title.trim())
        .map(([key, s]) => {
          const [dayIdx, slotIdx] = key.split("-").map(Number);
          return {
            class_id: cls.id, week_number: wk, day_index: dayIdx, slot_index: slotIdx,
            lesson_title: s.lesson_title, objectives: s.objectives,
            teacher_reflection: s.teacher_reflection, is_completed: s.is_completed, created_by: user.id,
          };
        });
      if (rows.length > 0) {
        const { error } = await supabase.from("lesson_plans").insert(rows);
        if (!error) totalInserted += rows.length;
      }
    }
    return totalInserted;
  };

  const handleSave = async () => {
    if (!user || !selectedClassId) return;
    setSaving(true);
    const targets = isAllClasses ? classes : classes.filter(c => c.id === selectedClassId);
    await saveToClasses(targets, slots, weekNumber);
    toast({
      title: "✅ تم الحفظ",
      description: isAllClasses ? `تم حفظ الخطة في ${targets.length} فصل` : `تم حفظ خطة الأسبوع ${weekNumber}`,
    });
    setSaving(false);
    fetchLessons();
  };

  const handleBroadcast = async () => {
    if (!user || !selectedClassId || isAllClasses) return;
    const otherClasses = classes.filter((c) => c.id !== selectedClassId);
    if (otherClasses.length === 0) {
      toast({ title: "تنبيه", description: "لا توجد فصول أخرى للتعميم عليها" });
      return;
    }
    const filledSlots = Object.entries(slots).filter(([, s]) => s.lesson_title.trim());
    if (filledSlots.length === 0) {
      toast({ title: "تنبيه", description: "لا توجد دروس لتعميمها", variant: "destructive" });
      return;
    }
    setSaving(true);
    await saveToClasses(otherClasses, slots, weekNumber);
    toast({ title: "✅ تم التعميم", description: `تم تعميم ${filledSlots.length} درس على ${otherClasses.length} فصل` });
    setSaving(false);
  };

  const handleBulkFill = async (lessonsData: Array<{ weekNumber: number; lessonTitle: string; objectives: string; dayName?: string; isWeekly?: boolean }>) => {
    if (!user || !selectedClassId) return;
    setSaving(true);
    const targets = isAllClasses ? classes : classes.filter(c => c.id === selectedClassId);
    const byWeek: Record<number, typeof lessonsData> = {};
    lessonsData.forEach((m) => {
      if (!byWeek[m.weekNumber]) byWeek[m.weekNumber] = [];
      byWeek[m.weekNumber].push(m);
    });
    let totalInserted = 0;
    for (const [wk, lessons] of Object.entries(byWeek)) {
      const wkNum = Number(wk);
      const weekSlots: Record<string, LessonSlot> = {};
      let dailyIdx = 0;
      lessons.forEach((lesson) => {
        if (lesson.isWeekly) {
          let slotIdx = 0;
          while (weekSlots[`${WEEKLY_DAY_INDEX}-${slotIdx}`]) slotIdx++;
          weekSlots[`${WEEKLY_DAY_INDEX}-${slotIdx}`] = { lesson_title: lesson.lessonTitle, objectives: lesson.objectives, teacher_reflection: "", is_completed: false };
        } else {
          let dayIdx: number;
          if (lesson.dayName && DAY_NAME_TO_INDEX[lesson.dayName] !== undefined) {
            dayIdx = DAY_NAME_TO_INDEX[lesson.dayName];
          } else {
            dayIdx = daysOfWeek[dailyIdx % daysOfWeek.length];
          }
          const slotIdx = Math.floor(dailyIdx / daysOfWeek.length);
          weekSlots[`${dayIdx}-${slotIdx}`] = { lesson_title: lesson.lessonTitle, objectives: lesson.objectives, teacher_reflection: "", is_completed: false };
          dailyIdx++;
        }
      });
      totalInserted += await saveToClasses(targets, weekSlots, wkNum);
    }
    toast({
      title: "✅ تم الاستيراد",
      description: `تم استيراد ${totalInserted} درس في ${Object.keys(byWeek).length} أسبوع${isAllClasses ? ` لـ ${targets.length} فصل` : ""}`,
    });
    setSaving(false);
    fetchLessons();
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { "رقم الأسبوع": 1, "عنوان الدرس": "مثال: درس الجمع", "اسم الوحدة": "الوحدة الأولى", "اليوم": "الأحد", "أسبوعي": "" },
      { "رقم الأسبوع": 1, "عنوان الدرس": "مثال: درس الطرح", "اسم الوحدة": "الوحدة الأولى", "اليوم": "الاثنين", "أسبوعي": "" },
      { "رقم الأسبوع": 2, "عنوان الدرس": "مثال: درس يمتد أسبوع كامل", "اسم الوحدة": "الوحدة الثانية", "اليوم": "", "أسبوعي": "نعم" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "خطة الدروس");
    safeWriteXLSX(wb, "lesson_plan_template.xlsx");
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedClassId) return;
    setImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      if (rows.length === 0) {
        toast({ title: "خطأ", description: "الملف فارغ", variant: "destructive" });
        setImporting(false);
        return;
      }
      const mapped = rows.map((r) => {
        const weeklyVal = String(r["أسبوعي"] || r["Weekly"] || r["is_weekly"] || "").trim().toLowerCase();
        const isWeekly = weeklyVal === "نعم" || weeklyVal === "yes" || weeklyVal === "true" || weeklyVal === "1";
        return {
          weekNumber: Number(r["رقم الأسبوع"] || r["Week Number"] || r["week_number"] || weekNumber),
          lessonTitle: String(r["عنوان الدرس"] || r["Lesson Title"] || r["lesson_title"] || "").trim(),
          objectives: String(r["اسم الوحدة"] || r["Unit Name"] || r["unit_name"] || r["الأهداف"] || r["Objectives"] || "").trim(),
          dayName: String(r["اليوم"] || r["Day"] || "").trim() || undefined,
          isWeekly,
        };
      }).filter((r) => r.lessonTitle);
      if (mapped.length === 0) {
        toast({ title: "خطأ", description: "لم يتم العثور على دروس صالحة في الملف", variant: "destructive" });
        setImporting(false);
        return;
      }
      await handleBulkFill(mapped);
    } catch {
      toast({ title: "خطأ", description: "فشل قراءة الملف", variant: "destructive" });
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedClassId) return;
    setImportingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const pdfBase64 = btoa(binary);
      toast({ title: "⏳ جارٍ التحليل", description: "يتم تحليل ملف PDF بالذكاء الاصطناعي..." });
      const { data, error } = await supabase.functions.invoke("parse-pdf-lessons", { body: { pdfBase64 } });
      if (error || data?.error) {
        toast({ title: "خطأ", description: data?.error || "فشل تحليل الملف", variant: "destructive" });
        setImportingPdf(false);
        return;
      }
      const lessons: any[] = data?.lessons || [];
      if (lessons.length === 0) {
        toast({ title: "تنبيه", description: "لم يتم العثور على دروس في الملف", variant: "destructive" });
        setImportingPdf(false);
        return;
      }
      const mapped = lessons.map((l: any) => ({
        weekNumber: Number(l.week_number) || 1,
        lessonTitle: String(l.lesson_title || "").trim(),
        objectives: String(l.objectives || "").trim(),
        dayName: l.day_name || undefined,
        isWeekly: l.is_weekly === true,
      })).filter((r) => r.lessonTitle);
      await handleBulkFill(mapped);
    } catch {
      toast({ title: "خطأ", description: "فشل قراءة ملف PDF", variant: "destructive" });
    }
    setImportingPdf(false);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  return {
    selectedClassId, setSelectedClassId,
    weekNumber, setWeekNumber,
    periodsPerWeek, daysOfWeek,
    slots, weeklySlots, slotsPerDay,
    loading, saving, importing, importingPdf,
    isAllClasses, effectiveClassId,
    fileInputRef, pdfInputRef,
    updateSlot, toggleWeeklySlot,
    handleSave, handleBroadcast,
    handleDownloadTemplate, handleFileImport, handlePdfImport,
  };
}
