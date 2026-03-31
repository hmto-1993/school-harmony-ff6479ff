import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Save, BookOpen, ChevronRight, ChevronLeft, Check, Loader2, Upload, Download, FileText, CopyPlus, FileUp } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { safeWriteXLSX } from "@/lib/download-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
}

interface LessonSlot {
  id?: string;
  lesson_title: string;
  objectives: string;
  teacher_reflection: string;
  is_completed: boolean;
}

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const DAY_NAME_TO_INDEX: Record<string, number> = {
  "الأحد": 0, "الاثنين": 1, "الثلاثاء": 2, "الأربعاء": 3, "الخميس": 4,
};

export default function LessonPlanSettings({ classes }: { classes: ClassOption[] }) {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [periodsPerWeek, setPeriodsPerWeek] = useState(5);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4]);
  const [slots, setSlots] = useState<Record<string, LessonSlot>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingPdf, setImportingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // "all" means all classes
  const isAllClasses = selectedClassId === "__all__";
  const effectiveClassId = isAllClasses ? (classes[0]?.id || "") : selectedClassId;

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

  // For "all classes" mode, load schedule from first class
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
    (data || []).forEach((lp: any) => {
      const key = `${lp.day_index}-${lp.slot_index}`;
      map[key] = {
        id: lp.id,
        lesson_title: lp.lesson_title || "",
        objectives: lp.objectives || "",
        teacher_reflection: lp.teacher_reflection || "",
        is_completed: lp.is_completed || false,
      };
    });
    setSlots(map);
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

  // Save to one or all classes
  const saveToClasses = async (targetClasses: ClassOption[], slotsData: Record<string, LessonSlot>, wk: number) => {
    if (!user) return 0;
    let totalInserted = 0;

    for (const cls of targetClasses) {
      await supabase
        .from("lesson_plans")
        .delete()
        .eq("class_id", cls.id)
        .eq("week_number", wk)
        .eq("created_by", user.id);

      const rows = Object.entries(slotsData)
        .filter(([, s]) => s.lesson_title.trim())
        .map(([key, s]) => {
          const [dayIdx, slotIdx] = key.split("-").map(Number);
          return {
            class_id: cls.id,
            week_number: wk,
            day_index: dayIdx,
            slot_index: slotIdx,
            lesson_title: s.lesson_title,
            objectives: s.objectives,
            teacher_reflection: s.teacher_reflection,
            is_completed: s.is_completed,
            created_by: user.id,
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
    const totalInserted = await saveToClasses(targets, slots, weekNumber);

    toast({
      title: "✅ تم الحفظ",
      description: isAllClasses
        ? `تم حفظ الخطة في ${targets.length} فصل`
        : `تم حفظ خطة الأسبوع ${weekNumber}`,
    });
    setSaving(false);
    fetchLessons();
  };

  // Broadcast current week's plan to all other classes
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
    const totalInserted = await saveToClasses(otherClasses, slots, weekNumber);

    toast({
      title: "✅ تم التعميم",
      description: `تم تعميم ${filledSlots.length} درس على ${otherClasses.length} فصل`,
    });
    setSaving(false);
  };

  // Bulk fill all weeks at once
  const handleBulkFill = async (lessonsData: Array<{ weekNumber: number; lessonTitle: string; objectives: string; dayName?: string }>) => {
    if (!user || !selectedClassId) return;
    setSaving(true);

    const targets = isAllClasses ? classes : classes.filter(c => c.id === selectedClassId);

    // Group by week
    const byWeek: Record<number, typeof lessonsData> = {};
    lessonsData.forEach((m) => {
      if (!byWeek[m.weekNumber]) byWeek[m.weekNumber] = [];
      byWeek[m.weekNumber].push(m);
    });

    let totalInserted = 0;

    for (const [wk, lessons] of Object.entries(byWeek)) {
      const wkNum = Number(wk);

      // Build slots for this week
      const weekSlots: Record<string, LessonSlot> = {};
      lessons.forEach((lesson, idx) => {
        let dayIdx: number;
        if (lesson.dayName && DAY_NAME_TO_INDEX[lesson.dayName] !== undefined) {
          dayIdx = DAY_NAME_TO_INDEX[lesson.dayName];
        } else {
          dayIdx = daysOfWeek[idx % daysOfWeek.length];
        }
        const slotIdx = Math.floor(idx / daysOfWeek.length);
        const key = `${dayIdx}-${slotIdx}`;
        weekSlots[key] = {
          lesson_title: lesson.lessonTitle,
          objectives: lesson.objectives,
          teacher_reflection: "",
          is_completed: false,
        };
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
      { "رقم الأسبوع": 1, "عنوان الدرس": "مثال: درس الجمع", "اسم الوحدة": "الوحدة الأولى" },
      { "رقم الأسبوع": 1, "عنوان الدرس": "مثال: درس الطرح", "اسم الوحدة": "الوحدة الأولى" },
      { "رقم الأسبوع": 2, "عنوان الدرس": "مثال: درس الضرب", "اسم الوحدة": "الوحدة الثانية" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "خطة الدروس");
    safeWriteXLSX(wb, "lesson_plan_template.xlsx");
  };

  // Import from Excel/CSV — now supports bulk fill
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

      const mapped = rows.map((r) => ({
        weekNumber: Number(r["رقم الأسبوع"] || r["Week Number"] || r["week_number"] || weekNumber),
        lessonTitle: String(r["عنوان الدرس"] || r["Lesson Title"] || r["lesson_title"] || "").trim(),
        objectives: String(r["اسم الوحدة"] || r["Unit Name"] || r["unit_name"] || r["الأهداف"] || r["Objectives"] || "").trim(),
        dayName: String(r["اليوم"] || r["Day"] || "").trim() || undefined,
      })).filter((r) => r.lessonTitle);

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

  // Import from PDF via AI
  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedClassId) return;
    setImportingPdf(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const pdfBase64 = btoa(binary);

      toast({ title: "⏳ جارٍ التحليل", description: "يتم تحليل ملف PDF بالذكاء الاصطناعي..." });

      const { data, error } = await supabase.functions.invoke("parse-pdf-lessons", {
        body: { pdfBase64 },
      });

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
      })).filter((r) => r.lessonTitle);

      await handleBulkFill(mapped);

    } catch {
      toast({ title: "خطأ", description: "فشل قراءة ملف PDF", variant: "destructive" });
    }

    setImportingPdf(false);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const hasContent = selectedClassId && !loading;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5 min-w-[180px]">
          <Label className="text-xs font-semibold">الفصل</Label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                <span className="font-bold text-primary">🏫 الجميع</span>
              </SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold">الأسبوع</Label>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekNumber(Math.max(1, weekNumber - 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Badge variant="secondary" className="text-sm px-3 min-w-[40px] justify-center">{weekNumber}</Badge>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekNumber(weekNumber + 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !selectedClassId} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isAllClasses ? "حفظ للجميع" : "حفظ الخطة"}
        </Button>
        {!isAllClasses && (
          <Button
            variant="secondary"
            disabled={saving || !selectedClassId || Object.keys(slots).length === 0}
            className="gap-1.5"
            onClick={handleBroadcast}
          >
            <BookOpen className="h-4 w-4" />
            تعميم على جميع الفصول
          </Button>
        )}

        {/* Import / Template */}
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileImport} className="hidden" />
        <input ref={pdfInputRef} type="file" accept=".pdf" onChange={handlePdfImport} className="hidden" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={!selectedClassId || importing || importingPdf}>
              {(importing || importingPdf) ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              استيراد خطة
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Download className="h-4 w-4" />
              من ملف Excel / CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => pdfInputRef.current?.click()} className="gap-2">
              <FileText className="h-4 w-4" />
              من ملف PDF (ذكاء اصطناعي)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleDownloadTemplate}>
          <Upload className="h-4 w-4" />
          تحميل النموذج
        </Button>
      </div>

      {isAllClasses && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          <CopyPlus className="h-4 w-4 inline-block ml-1.5" />
          وضع الجميع: سيتم تطبيق الخطة والاستيراد على <strong>جميع الفصول ({classes.length})</strong> دفعة واحدة.
        </div>
      )}

      {/* Grid */}
      {hasContent && (
        <div className="overflow-auto rounded-xl border border-border/40">
          <table className="w-full border-collapse" dir="rtl" style={{ fontSize: 13 }}>
            <thead>
              <tr className="bg-muted">
                <th className="border border-border/30 px-3 py-2 text-center font-bold text-muted-foreground" style={{ minWidth: 80 }}>اليوم</th>
                <th className="border border-border/30 px-3 py-2 text-center font-bold text-muted-foreground" style={{ minWidth: 40 }}>الحصة</th>
                <th className="border border-border/30 px-3 py-2 text-right font-bold text-muted-foreground" style={{ minWidth: 200 }}>عنوان الدرس</th>
                <th className="border border-border/30 px-3 py-2 text-right font-bold text-muted-foreground" style={{ minWidth: 200 }}>الأهداف</th>
                <th className="border border-border/30 px-3 py-2 text-right font-bold text-muted-foreground" style={{ minWidth: 150 }}>ملاحظات المعلم</th>
                <th className="border border-border/30 px-3 py-2 text-center font-bold text-muted-foreground" style={{ minWidth: 60 }}>مكتمل</th>
              </tr>
            </thead>
            <tbody>
              {daysOfWeek.map((dayIdx) =>
                Array.from({ length: slotsPerDay }, (_, slotIdx) => {
                  const key = `${dayIdx}-${slotIdx}`;
                  const slot = slots[key] || { lesson_title: "", objectives: "", teacher_reflection: "", is_completed: false };
                  return (
                    <tr key={key} className={cn(slotIdx % 2 === 0 ? "bg-card" : "bg-muted/30")}>
                      {slotIdx === 0 && (
                        <td
                          rowSpan={slotsPerDay}
                          className="border border-border/20 px-3 py-2 text-center font-bold text-foreground bg-muted/50"
                        >
                          {DAY_NAMES[dayIdx] || `يوم ${dayIdx + 1}`}
                        </td>
                      )}
                      <td className="border border-border/20 px-2 py-2 text-center font-semibold text-muted-foreground">
                        {slotIdx + 1}
                      </td>
                      <td className="border border-border/20 p-1">
                        <Input
                          value={slot.lesson_title}
                          onChange={(e) => updateSlot(dayIdx, slotIdx, "lesson_title", e.target.value)}
                          placeholder="عنوان الدرس"
                          className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1"
                        />
                      </td>
                      <td className="border border-border/20 p-1">
                        <Input
                          value={slot.objectives}
                          onChange={(e) => updateSlot(dayIdx, slotIdx, "objectives", e.target.value)}
                          placeholder="الأهداف"
                          className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1"
                        />
                      </td>
                      <td className="border border-border/20 p-1">
                        <Input
                          value={slot.teacher_reflection}
                          onChange={(e) => updateSlot(dayIdx, slotIdx, "teacher_reflection", e.target.value)}
                          placeholder="ملاحظات"
                          className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1"
                        />
                      </td>
                      <td className="border border-border/20 px-2 py-2 text-center">
                        <button
                          onClick={() => updateSlot(dayIdx, slotIdx, "is_completed", !slot.is_completed)}
                          className={cn(
                            "h-6 w-6 rounded-md border-2 inline-flex items-center justify-center transition-colors",
                            slot.is_completed
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {slot.is_completed && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedClassId && loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!selectedClassId && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <BookOpen className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm">اختر الفصل لبدء إعداد خطة الدروس</p>
        </div>
      )}

      {/* Preview Widget */}
      {hasContent && Object.keys(slots).some(k => slots[k]?.lesson_title?.trim()) && (
        <LessonPlanPreview slots={slots} daysOfWeek={daysOfWeek} weekNumber={weekNumber} />
      )}
    </div>
  );
}

/* Mini preview of how the widget will look in the dashboard */
function LessonPlanPreview({
  slots,
  daysOfWeek,
  weekNumber,
}: {
  slots: Record<string, LessonSlot>;
  daysOfWeek: number[];
  weekNumber: number;
}) {
  const DAY_LABELS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const todayDayIndex = new Date().getDay();

  // Group filled lessons by day
  const byDay = new Map<number, { title: string; completed: boolean }[]>();
  Object.entries(slots).forEach(([key, slot]) => {
    if (!slot.lesson_title.trim()) return;
    const [dayIdx] = key.split("-").map(Number);
    if (!byDay.has(dayIdx)) byDay.set(dayIdx, []);
    byDay.get(dayIdx)!.push({ title: slot.lesson_title, completed: slot.is_completed });
  });

  const allLessons = Array.from(byDay.values()).flat();
  const completedCount = allLessons.filter(l => l.completed).length;
  const total = allLessons.length;

  return (
    <div className="mt-6">
      <Label className="text-xs font-bold text-muted-foreground mb-2 block">معاينة الويدجت في لوحة التحكم</Label>
      <div className="max-w-sm mx-auto">
        <Card className="border-0 ring-1 ring-info/20 bg-gradient-to-br from-info/5 via-card to-info/10 overflow-hidden">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-info to-info/70 shadow-md">
                <BookOpen className="h-4 w-4 text-info-foreground" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm font-bold text-foreground">
                  دروس الأسبوع {weekNumber}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">خطة الدروس الأسبوعية</p>
              </div>
              {total > 0 && (
                <Badge className="bg-info/15 text-info hover:bg-info/20 border-0 text-xs">
                  {completedCount}/{total}
                </Badge>
              )}
            </div>
            {total > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <Progress value={(completedCount / total) * 100} className="h-2 flex-1 bg-muted/50 [&>div]:bg-gradient-to-l [&>div]:from-success [&>div]:to-success/70" />
                <span className="text-[10px] font-semibold text-muted-foreground min-w-[32px] text-left">
                  {Math.round((completedCount / total) * 100)}%
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
              {Array.from(byDay.entries())
                .sort(([a], [b]) => a - b)
                .map(([dayIdx, dayLessons]) => (
                <div key={dayIdx}>
                  <p className={cn(
                    "text-[11px] font-bold mb-1",
                    dayIdx === todayDayIndex ? "text-info" : "text-muted-foreground"
                  )}>
                    {DAY_LABELS[dayIdx] || `يوم ${dayIdx}`}
                    {dayIdx === todayDayIndex && (
                      <span className="mr-1 text-[10px] font-normal">(اليوم)</span>
                    )}
                  </p>
                  <div className="space-y-1">
                    {dayLessons.map((l, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs",
                          l.completed
                            ? "bg-success/10 text-success"
                            : "bg-muted/50 text-foreground"
                        )}
                      >
                        {l.completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className={cn("truncate flex-1", l.completed && "line-through opacity-70")}>
                          {l.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
