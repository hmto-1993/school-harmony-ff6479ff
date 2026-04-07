import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademicWeek, ExamDate, HolidayDate } from "@/hooks/useAcademicWeek";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, Upload, FileText, Loader2, Sparkles, GraduationCap } from "lucide-react";
import { MOE_PRESETS } from "./moeCalendarPresets";
import * as XLSX from "xlsx";
import CalendarMoeTab from "./calendar/CalendarMoeTab";
import CalendarManualTab from "./calendar/CalendarManualTab";

interface Props {
  onClose: () => void;
}

export default function AcademicCalendarSettings({ onClose }: Props) {
  const { user } = useAuth();
  const { calendarData, refetch } = useAcademicWeek();

  const [defaultAcademicYear, setDefaultAcademicYear] = useState<string>("");
  const [startDate, setStartDate] = useState(calendarData?.start_date || "");
  const [totalWeeks, setTotalWeeks] = useState(calendarData?.total_weeks || 18);
  const [semester, setSemester] = useState(calendarData?.semester || "first");
  const [academicYear, setAcademicYear] = useState(calendarData?.academic_year || "1447-1448");
  const [examDates, setExamDates] = useState<ExamDate[]>(calendarData?.exam_dates || []);
  const [holidays, setHolidays] = useState<HolidayDate[]>(calendarData?.holidays || []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("id", "default_academic_year").maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          setDefaultAcademicYear(data.value);
          if (!calendarData?.academic_year) setAcademicYear(data.value);
        }
      });
  }, []);

  const buildPayload = (sd: string, tw: number, sem: string, ay: string, exams: ExamDate[], hols: HolidayDate[]) => {
    const combinedDates = [
      ...exams.filter(e => e.date && e.label).map(e => ({ date: e.date, label: e.label, type: e.type })),
      ...hols.filter(h => h.date && h.label).map(h => ({ date: h.date, end_date: h.end_date || undefined, label: h.label, type: "holiday" as const })),
    ];
    return {
      start_date: sd, total_weeks: tw, semester: sem, academic_year: ay,
      exam_dates: JSON.parse(JSON.stringify(combinedDates)),
      created_by: user!.id,
    };
  };

  const saveCalendar = async (payload: any) => {
    let error;
    if (calendarData?.id) {
      ({ error } = await supabase.from("academic_calendar").update(payload).eq("id", calendarData.id));
    } else {
      ({ error } = await supabase.from("academic_calendar").insert([payload]));
    }
    return error;
  };

  const applyPreset = async (preset: typeof MOE_PRESETS[string]) => {
    const newHolidays = preset.holidays.map(h => ({ date: h.date, end_date: h.end_date, label: h.label }));
    setStartDate(preset.start_date);
    setTotalWeeks(preset.total_weeks);
    setSemester(preset.semester);
    setAcademicYear(preset.academic_year);
    setExamDates(preset.exam_dates);
    setHolidays(newHolidays);

    setSaving(true);
    const payload = buildPayload(preset.start_date, preset.total_weeks, preset.semester, preset.academic_year, preset.exam_dates, newHolidays);
    const error = await saveCalendar(payload);
    setSaving(false);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: `تم حفظ تقويم ${preset.label} بنجاح` });
      await refetch();
    }
  };

  const handleSave = async () => {
    if (!startDate) {
      toast({ title: "خطأ", description: "يرجى تحديد تاريخ بداية الفصل", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = buildPayload(startDate, totalWeeks, semester, academicYear, examDates, holidays);
    const error = await saveCalendar(payload);
    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم حفظ التقويم الأكاديمي بنجاح" });
      await refetch();
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!calendarData?.id) return;
    setDeleting(true);
    const { error } = await supabase.from("academic_calendar").delete().eq("id", calendarData.id);
    setDeleting(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحذف", description: "تم حذف التقويم الأكاديمي بنجاح" });
      await refetch();
      onClose();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      const parsed: ExamDate[] = rows
        .filter(r => r.date && r.label)
        .map(r => ({
          date: String(r.date), label: String(r.label),
          type: (String(r.type || "").toLowerCase().includes("final") ? "final" : "midterm") as "midterm" | "final",
        }));
      if (parsed.length > 0) {
        setExamDates(prev => [...prev, ...parsed]);
        toast({ title: "تم الاستيراد", description: `تم استيراد ${parsed.length} تاريخ` });
      } else {
        toast({ title: "تنبيه", description: "لم يتم العثور على بيانات صالحة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في قراءة الملف", variant: "destructive" });
    }
    e.target.value = "";
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const text = await file.text();
      const { data, error } = await supabase.functions.invoke("parse-academic-calendar", {
        body: { text: text.slice(0, 15000), source_type: "PDF" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data.start_date) setStartDate(data.start_date);
      if (data.total_weeks) setTotalWeeks(data.total_weeks);
      if (data.semester) setSemester(data.semester);
      if (data.academic_year) setAcademicYear(data.academic_year);
      if (data.exam_dates?.length) setExamDates(data.exam_dates);
      toast({ title: "تم التحليل", description: "تم استخراج بيانات التقويم من الملف بنجاح" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل في تحليل الملف", variant: "destructive" });
    }
    setParsing(false);
    e.target.value = "";
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            إعدادات التقويم الأكاديمي
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="moe" className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="moe" className="text-xs gap-1"><GraduationCap className="h-3 w-3" /> وزارة التعليم</TabsTrigger>
            <TabsTrigger value="manual" className="text-xs gap-1"><CalendarDays className="h-3 w-3" /> يدوي</TabsTrigger>
            <TabsTrigger value="csv" className="text-xs gap-1"><Upload className="h-3 w-3" /> ملف Excel</TabsTrigger>
            <TabsTrigger value="pdf" className="text-xs gap-1"><FileText className="h-3 w-3" /> ملف PDF</TabsTrigger>
          </TabsList>

          <TabsContent value="moe">
            <CalendarMoeTab
              defaultAcademicYear={defaultAcademicYear}
              saving={saving}
              onApplyPreset={applyPreset}
            />
          </TabsContent>

          <TabsContent value="manual">
            <CalendarManualTab
              startDate={startDate} setStartDate={setStartDate}
              totalWeeks={totalWeeks} setTotalWeeks={setTotalWeeks}
              semester={semester} setSemester={setSemester}
              academicYear={academicYear} setAcademicYear={setAcademicYear}
              examDates={examDates} holidays={holidays}
              addExamDate={() => setExamDates(prev => [...prev, { date: "", label: "", type: "midterm" }])}
              removeExamDate={(i) => setExamDates(prev => prev.filter((_, idx) => idx !== i))}
              updateExamDate={(i, field, value) => setExamDates(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))}
              addHoliday={() => setHolidays(prev => [...prev, { date: "", label: "" }])}
              removeHoliday={(i) => setHolidays(prev => prev.filter((_, idx) => idx !== i))}
              updateHoliday={(i, field, value) => setHolidays(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: value } : h))}
              saving={saving} deleting={deleting}
              hasCalendarData={!!calendarData?.id}
              onSave={handleSave} onClose={onClose} onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="csv" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">
              ارفع ملف Excel أو CSV يحتوي على أعمدة: <Badge variant="outline" className="mx-1 text-[10px]">date</Badge>
              <Badge variant="outline" className="mx-1 text-[10px]">label</Badge>
              <Badge variant="outline" className="mx-1 text-[10px]">type</Badge>
            </p>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              اختر ملف Excel / CSV
            </Button>
          </TabsContent>

          <TabsContent value="pdf" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">
              ارفع ملف PDF للتقويم الدراسي وسيتم استخراج الأسابيع ومواعيد الاختبارات تلقائياً بالذكاء الاصطناعي
            </p>
            <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
            <Button variant="outline" className="w-full gap-2" onClick={() => pdfInputRef.current?.click()} disabled={parsing}>
              {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {parsing ? "جاري التحليل..." : "رفع ملف PDF وتحليله"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
