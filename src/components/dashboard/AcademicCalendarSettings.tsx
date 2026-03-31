import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademicWeek, ExamDate, HolidayDate } from "@/hooks/useAcademicWeek";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, Upload, FileText, Plus, Trash2, Loader2, Sparkles, GraduationCap, TreePalm } from "lucide-react";
import { MOE_PRESETS, type MOEPresetKey } from "./moeCalendarPresets";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import * as XLSX from "xlsx";

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
  const [deletingPresetKey, setDeletingPresetKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Fetch default academic year from site_settings
  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("id", "default_academic_year")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          setDefaultAcademicYear(data.value);
          if (!calendarData?.academic_year) {
            setAcademicYear(data.value);
          }
        }
      });
  }, []);

  const addExamDate = () => {
    setExamDates(prev => [...prev, { date: "", label: "", type: "midterm" }]);
  };

  const removeExamDate = (index: number) => {
    setExamDates(prev => prev.filter((_, i) => i !== index));
  };

  const updateExamDate = (index: number, field: keyof ExamDate, value: string) => {
    setExamDates(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const addHoliday = () => {
    setHolidays(prev => [...prev, { date: "", label: "" }]);
  };

  const removeHoliday = (index: number) => {
    setHolidays(prev => prev.filter((_, i) => i !== index));
  };

  const updateHoliday = (index: number, field: string, value: string) => {
    setHolidays(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
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

  const handleSave = async () => {
    if (!startDate) {
      toast({ title: "خطأ", description: "يرجى تحديد تاريخ بداية الفصل", variant: "destructive" });
      return;
    }
    setSaving(true);
    const combinedDates = [
      ...examDates.filter(e => e.date && e.label).map(e => ({ date: e.date, label: e.label, type: e.type })),
      ...holidays.filter(h => h.date && h.label).map(h => ({ date: h.date, end_date: h.end_date || undefined, label: h.label, type: "holiday" as const })),
    ];
    const payload = {
      start_date: startDate,
      total_weeks: totalWeeks,
      semester,
      academic_year: academicYear,
      exam_dates: JSON.parse(JSON.stringify(combinedDates)),
      created_by: user!.id,
    };

    let error;
    if (calendarData?.id) {
      ({ error } = await supabase.from("academic_calendar").update(payload).eq("id", calendarData.id));
    } else {
      ({ error } = await supabase.from("academic_calendar").insert([payload]));
    }

    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم حفظ التقويم الأكاديمي بنجاح" });
      await refetch();
      onClose();
    }
  };

  // CSV/Excel upload
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
          date: String(r.date),
          label: String(r.label),
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

  // PDF upload with AI
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

          {/* MOE Preset Tab */}
          <TabsContent value="moe" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">
              اختر الفصل الدراسي لاستيراد التقويم الأكاديمي الرسمي لوزارة التعليم السعودية تلقائياً
            </p>

            {/* Current year presets */}
            {(() => {
              const currentYear = defaultAcademicYear || "1447-1448";
              const currentPresets = Object.entries(MOE_PRESETS).filter(([, p]) => p.academic_year === currentYear);
              const oldPresets = Object.entries(MOE_PRESETS).filter(([, p]) => p.academic_year !== currentYear);

              return (
                <>
                  {currentPresets.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-primary font-semibold">العام الحالي ({currentYear} هـ)</Label>
                      {currentPresets.map(([key, preset]) => (
                        <Button
                          key={key}
                          variant="outline"
                          className="w-full justify-between h-auto py-3 px-4 border-primary/30 bg-primary/5"
                          onClick={() => {
                            setStartDate(preset.start_date);
                            setTotalWeeks(preset.total_weeks);
                            setSemester(preset.semester);
                            setAcademicYear(preset.academic_year);
                            setExamDates(preset.exam_dates);
                            setHolidays(preset.holidays.map(h => ({ date: h.date, end_date: h.end_date, label: h.label })));
                            toast({ title: "تم الاستيراد", description: `تم تحميل تقويم ${preset.label}` });
                          }}
                        >
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="text-sm font-medium">{preset.label}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {preset.start_date} → {preset.end_date} • {preset.total_weeks} أسبوع • {preset.holidays.length} إجازة
                            </span>
                          </div>
                          <Badge variant="default" className="text-[10px]">{preset.academic_year} هـ</Badge>
                        </Button>
                      ))}
                    </div>
                  )}

                  {oldPresets.length > 0 && (
                    <div className="space-y-2 mt-4 pt-3 border-t border-dashed">
                      <Label className="text-xs text-muted-foreground font-semibold">أعوام سابقة</Label>
                      {oldPresets.map(([key, preset]) => (
                        <div key={key} className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            className="flex-1 justify-between h-auto py-2 px-3 opacity-70 hover:opacity-100"
                            onClick={() => {
                              setStartDate(preset.start_date);
                              setTotalWeeks(preset.total_weeks);
                              setSemester(preset.semester);
                              setAcademicYear(preset.academic_year);
                              setExamDates(preset.exam_dates);
                              setHolidays(preset.holidays.map(h => ({ date: h.date, end_date: h.end_date, label: h.label })));
                              toast({ title: "تم الاستيراد", description: `تم تحميل تقويم ${preset.label}` });
                            }}
                          >
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-xs font-medium">{preset.label}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {preset.start_date} → {preset.end_date} • {preset.total_weeks} أسبوع
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[10px]">{preset.academic_year} هـ</Badge>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                disabled={deletingPresetKey === key}
                              >
                                {deletingPresetKey === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف تقويم {preset.label}؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  سيتم حذف أي تقويم محفوظ لهذا الفصل من قاعدة البيانات. هذا الإجراء لا يمكن التراجع عنه.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={async () => {
                                    setDeletingPresetKey(key);
                                    const { error } = await supabase
                                      .from("academic_calendar")
                                      .delete()
                                      .eq("semester", preset.semester)
                                      .eq("academic_year", preset.academic_year);
                                    setDeletingPresetKey(null);
                                    if (error) {
                                      toast({ title: "خطأ", description: error.message, variant: "destructive" });
                                    } else {
                                      toast({ title: "تم الحذف", description: `تم حذف تقويم ${preset.label}` });
                                      await refetch();
                                    }
                                  }}
                                >
                                  حذف التقويم
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            <p className="text-[10px] text-muted-foreground text-center">
              * التواريخ مبنية على التقويم الدراسي المعتمد من وزارة التعليم للعام ١٤٤٦-١٤٤٧هـ و ١٤٤٧-١٤٤٨هـ
            </p>
          </TabsContent>

          {/* Manual Tab */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">تاريخ بداية الفصل</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">عدد الأسابيع</Label>
                <Input type="number" min={1} max={52} value={totalWeeks} onChange={e => setTotalWeeks(+e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الفصل الدراسي</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">الأول</SelectItem>
                    <SelectItem value="second">الثاني</SelectItem>
                    <SelectItem value="third">الثالث</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">العام الدراسي</Label>
                <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="mt-1" placeholder="1446-1447" />
              </div>
            </div>
          </TabsContent>

          {/* CSV Tab */}
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

          {/* PDF Tab */}
          <TabsContent value="pdf" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">
              ارفع ملف PDF للتقويم الدراسي وسيتم استخراج الأسابيع ومواعيد الاختبارات تلقائياً بالذكاء الاصطناعي
            </p>
            <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => pdfInputRef.current?.click()}
              disabled={parsing}
            >
              {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {parsing ? "جاري التحليل..." : "رفع ملف PDF وتحليله"}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Exam dates editor */}
        <div className="space-y-3 mt-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">مواعيد الاختبارات</Label>
            <Button variant="ghost" size="sm" onClick={addExamDate} className="gap-1 text-xs h-7">
              <Plus className="h-3 w-3" /> إضافة
            </Button>
          </div>

          {examDates.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">لا توجد مواعيد اختبارات</p>
          )}

          {examDates.map((exam, i) => (
            <div key={i} className="flex items-end gap-2 bg-muted/30 rounded-lg p-2">
              <div className="flex-1">
                <Label className="text-[10px]">التاريخ</Label>
                <Input type="date" value={exam.date} onChange={e => updateExamDate(i, "date", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="flex-1">
                <Label className="text-[10px]">الوصف</Label>
                <Input value={exam.label} onChange={e => updateExamDate(i, "label", e.target.value)} className="h-8 text-xs" placeholder="اختبارات نصفية" />
              </div>
              <div className="w-24">
                <Label className="text-[10px]">النوع</Label>
                <Select value={exam.type} onValueChange={v => updateExamDate(i, "type", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="midterm">نصفي</SelectItem>
                    <SelectItem value="final">نهائي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeExamDate(i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Holidays editor */}
        <div className="space-y-3 mt-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <TreePalm className="h-4 w-4 text-emerald-500" />
              مواعيد الإجازات
            </Label>
            <Button variant="ghost" size="sm" onClick={addHoliday} className="gap-1 text-xs h-7">
              <Plus className="h-3 w-3" /> إضافة
            </Button>
          </div>

          {holidays.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">لا توجد إجازات</p>
          )}

          {holidays.map((holiday, i) => (
            <div key={i} className="flex items-end gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 flex-wrap">
              <div className="flex-1 min-w-[120px]">
                <Label className="text-[10px]">من تاريخ</Label>
                <Input type="date" value={holiday.date} onChange={e => updateHoliday(i, "date", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="flex-1 min-w-[120px]">
                <Label className="text-[10px]">إلى تاريخ <span className="text-muted-foreground">(اختياري)</span></Label>
                <Input type="date" value={holiday.end_date || ""} onChange={e => updateHoliday(i, "end_date", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="flex-1 min-w-[120px]">
                <Label className="text-[10px]">الوصف</Label>
                <Input value={holiday.label} onChange={e => updateHoliday(i, "label", e.target.value)} className="h-8 text-xs" placeholder="إجازة اليوم الوطني" />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeHoliday(i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Save & Delete */}
        <div className="flex gap-2 mt-4">
          <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
            حفظ التقويم
          </Button>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          {calendarData?.id && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deleting}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف التقويم الأكاديمي؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم حذف التقويم الأكاديمي وجميع مواعيد الاختبارات والإجازات المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    حذف التقويم
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
