import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, CircleCheck, CircleMinus, CircleX, Undo2, Plus, ChevronRight, ChevronLeft, Printer, FileText, AlertTriangle, Clock, Eye, EyeOff, FileWarning, Settings, Minus, MessageCircle, Radar, ClipboardList } from "lucide-react";
import ScrollToSaveButton from "@/components/shared/ScrollToSaveButton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import GradesExportDialog, { ExportTableGroup } from "./GradesExportDialog";
import { cn } from "@/lib/utils";
import { isToday, format } from "date-fns";
import { HijriDatePicker } from "@/components/ui/hijri-date-picker";
import { printGradesTable, exportGradesTableAsPDF } from "@/lib/grades-print";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useDailyGradeData, GradeLevel } from "@/hooks/useDailyGradeData";
import { useViolationHistory, buildReferralReason } from "@/hooks/useViolationHistory";
import { useViolationReasons } from "@/hooks/useViolationReasons";
import ViolationReasonsDialog from "./ViolationReasonsDialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { formTemplates } from "@/components/forms/form-templates";
import FormDialog from "@/components/forms/FormDialog";
import SmartRadar from "./SmartRadar";
import ClassAlphaDashboard from "./classwork/ClassAlphaDashboard";
import { supabase } from "@/integrations/supabase/client";

// ── LevelIcon ──────────────────────────────────────────────────────
const LevelIcon = React.forwardRef<HTMLDivElement, { level: GradeLevel; size?: string }>(
  ({ level, size = "h-6 w-6", ...props }, ref) => {
    if (level === "excellent") return (
      <div ref={ref} {...props}>
        <svg viewBox="0 0 24 24" fill="none" className={cn(size, "shrink-0 text-emerald-600 dark:text-emerald-400")} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.12" />
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
          <path d="M8.6 12.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
    if (level === "average") return (
      <div ref={ref} {...props}>
        <svg viewBox="0 0 24 24" fill="none" className={cn(size, "shrink-0 text-orange-500 dark:text-orange-400")} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.12" />
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    );
    if (level === "zero") return (
      <div ref={ref} {...props}>
        <svg viewBox="0 0 24 24" fill="none" className={cn(size, "shrink-0 text-rose-500 dark:text-rose-400")} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.12" />
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
          <path d="M9 9l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M15 9l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    );
    return <div ref={ref} {...props} className={cn(size, "rounded-full border-2 border-dashed border-muted-foreground/30")} />;
  }
);
LevelIcon.displayName = "LevelIcon";

// ── Component ──────────────────────────────────────────────────────
interface DailyGradeEntryProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
  selectedPeriod?: number;
}

export default function DailyGradeEntry({ selectedClass, onClassChange, selectedPeriod = 1 }: DailyGradeEntryProps) {
  const { toast } = useToast();
  const [gradeTab, setGradeTab] = React.useState<"assessment" | "violations">("assessment");
  const [referralStudentId, setReferralStudentId] = React.useState<string | null>(null);
  const [referralFormOpen, setReferralFormOpen] = React.useState(false);
  const [referralPreFill, setReferralPreFill] = React.useState<Record<string, string>>({});
  const [reasonsDialogOpen, setReasonsDialogOpen] = React.useState(false);
  const [radarOpen, setRadarOpen] = React.useState(false);
  const [radarMuted, setRadarMuted] = React.useState(false);
  const [radarSettings, setRadarSettings] = React.useState({ speed: "medium" as const, sessionMemory: true, visualEffect: "radar" as const, quizEnabled: false, surpriseMode: false, quizDuration: 20, questionSource: "local" as "local" | "bank" });
  const [earnedGradeInput, setEarnedGradeInput] = React.useState<{ studentId: string; open: boolean }>({ studentId: "", open: false });
  const { reasons: violationReasons, saveReasons, DEFAULT_REASONS } = useViolationReasons();

  // Load radar settings
  React.useEffect(() => {
    supabase.from("site_settings").select("id, value").in("id", ["radar_speed", "radar_session_memory", "radar_visual_effect", "radar_quiz_enabled", "radar_surprise_mode", "radar_quiz_duration", "radar_question_source"]).then(({ data }) => {
      const s: any = { speed: "medium", sessionMemory: true, visualEffect: "radar", quizEnabled: false, surpriseMode: false, quizDuration: 20, questionSource: "local" };
      (data || []).forEach((r: any) => {
        if (r.id === "radar_speed") s.speed = r.value;
        if (r.id === "radar_session_memory") s.sessionMemory = r.value !== "false";
        if (r.id === "radar_visual_effect") s.visualEffect = r.value;
        if (r.id === "radar_quiz_enabled") s.quizEnabled = r.value === "true";
        if (r.id === "radar_surprise_mode") s.surpriseMode = r.value === "true";
        if (r.id === "radar_quiz_duration") s.quizDuration = Number(r.value) || 20;
        if (r.id === "radar_question_source") s.questionSource = r.value === "bank" ? "bank" : "local";
      });
      setRadarSettings(s);
    });
  }, []);

  // Cumulative interaction totals per student for the current class
  // (used by Smart Radar's "target lowest" toggle).
  const [cumulativeTotals, setCumulativeTotals] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    if (!selectedClass || !radarOpen) return;
    let cancelled = false;
    (async () => {
      const { data: classStudents } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", selectedClass);
      const ids = ((classStudents as any[]) || []).map((r: any) => r.id);
      if (ids.length === 0) { if (!cancelled) setCumulativeTotals({}); return; }
      const [{ data: gradeRows }, { data: cats }] = await Promise.all([
        supabase.from("grades").select("student_id, score, category_id").in("student_id", ids),
        supabase.from("grade_categories").select("id, is_deduction"),
      ]);
      const deductionMap = new Map<string, boolean>();
      ((cats as any[]) || []).forEach((c: any) => deductionMap.set(c.id, !!c.is_deduction));
      const totals: Record<string, number> = {};
      ids.forEach((id: string) => { totals[id] = 0; });
      ((gradeRows as any[]) || []).forEach((g: any) => {
        const v = Number(g.score) || 0;
        const isDeduction = deductionMap.get(g.category_id);
        totals[g.student_id] = (totals[g.student_id] || 0) + (isDeduction ? -v : v);
      });
      if (!cancelled) setCumulativeTotals(totals);
    })();
    return () => { cancelled = true; };
  }, [selectedClass, radarOpen]);
  const {
    classes, categories, saving, selectedDate, setSelectedDate,
    selectedCategory, setSelectedCategory,
    extraSlotsEnabled, showAbsent, setShowAbsent,
    attendanceLoaded, attendanceMap, hasAttendanceRecords,
    tableRef, dailyCategories, visibleCategories, isSingleCategory,
    filteredStudentGrades, absentCount, hiddenStatuses,
    goToPrevDay, goToNextDay, goToToday,
    getMaxSlots, isCatDisabled,
    cycleSlot, addSlot, toggleStar, clearGrade, setNumericGrade, setGradeWithSlot, setDeductionNote,
    calcTotal, handleSave, quickSaveGrade,
  } = useDailyGradeData({ selectedClass, selectedPeriod });

  const assessmentCats = visibleCategories.filter(c => !c.is_deduction);
  const violationCats = visibleCategories.filter(c => c.is_deduction);
  const hasViolations = dailyCategories.some(c => c.is_deduction);
  const activeCats = gradeTab === "assessment" ? assessmentCats : violationCats;
  const showTotal = gradeTab === "assessment" && !isSingleCategory && assessmentCats.length > 1;

  // Violation history for referral automation
  const deductionCatIds = React.useMemo(() => categories.filter(c => c.is_deduction).map(c => c.id), [categories]);
  const { history: violationHistory } = useViolationHistory(selectedClass, deductionCatIds, gradeTab === "violations" && hasViolations);

  const referralForm = React.useMemo(() => formTemplates.find(f => f.id === "confidential_referral"), []);

  const handleOpenReferral = React.useCallback((studentId: string, studentName: string) => {
    const summary = violationHistory[studentId];
    const { reasonText } = buildReferralReason(summary, studentName);
    setReferralStudentId(studentId);
    setReferralPreFill({ referral_reason: reasonText });
    setReferralFormOpen(true);
  }, [violationHistory]);

  // ── Print / Export helpers ─────────────────────────────────────
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

  const formatDailyPDFCell = (sg: (typeof filteredStudentGrades)[number], catId: string) => {
    const cat = visibleCategories.find(c => c.id === catId);
    // For deductions (violations): show numeric deduction (e.g. -2) instead of icons
    if (cat?.is_deduction) {
      const score = sg.grades[catId];
      if (score == null || score === 0) return "—";
      return `-${Number(score)}`;
    }
    if (sg.starred[catId]) return "كامل";
    const labels = (sg.slots[catId] || [null]).map(level => {
      if (level === "excellent") return "ممتاز";
      if (level === "average") return "متوسط";
      if (level === "zero") return "صفر";
      return "—";
    });
    return labels.join("\n");
  };

  const exportDailyInteractionPDF = async () => {
    const className = classes.find(c => c.id === selectedClass)?.name || "الفصل";
    const dateStr = format(selectedDate, "yyyy/MM/dd");
    const fileDate = format(selectedDate, "yyyy-MM-dd");
    const orientation = visibleCategories.length > 4 ? "landscape" as const : "portrait" as const;

    const [{ createArabicPDF, getArabicTableStyles, finalizePDF }, autoTableImport] = await Promise.all([
      import("@/lib/arabic-pdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = autoTableImport.default;
    const { doc, startY, watermark, advanced } = await createArabicPDF({
      orientation,
      reportType: "grades",
      includeHeader: true,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFont("Amiri", "bold");
    doc.setFontSize(13);
    doc.text(`${className} — إدخال الدرجات اليومية`, pageWidth / 2, startY, { align: "center" });
    doc.setFont("Amiri", "normal");
    doc.setFontSize(9);
    doc.text(`${dateStr} — الفترة ${selectedPeriod === 1 ? "الأولى" : "الثانية"}`, pageWidth / 2, startY + 7, { align: "center" });

    const headers = [
      "#",
      "الطالب",
      ...visibleCategories.map(c => `${c.name}\nمن ${Number(c.max_score)}`),
      ...(!isSingleCategory ? ["المجموع"] : []),
    ];
    const rows = filteredStudentGrades.map((sg, i) => [
      String(i + 1),
      sg.full_name,
      ...visibleCategories.map(cat => formatDailyPDFCell(sg, cat.id)),
      ...(!isSingleCategory ? [String(calcTotal(sg.grades))] : []),
    ]);
    const reversedHeaders = [...headers].reverse();
    const nameColumnIndex = reversedHeaders.indexOf("الطالب");
    const numberColumnIndex = reversedHeaders.indexOf("#");
    const tableStyles = getArabicTableStyles(advanced);

    autoTable(doc, {
      startY: startY + 12,
      head: [reversedHeaders],
      body: rows.map(row => [...row].reverse()),
      ...tableStyles,
      rowPageBreak: "avoid",
      showHead: "everyPage",
      margin: { top: 10, right: 5, bottom: 10, left: 5 },
      styles: {
        ...tableStyles.styles,
        fontSize: visibleCategories.length > 4 ? 7 : 8,
        cellPadding: 1.4,
        overflow: "linebreak",
        minCellHeight: 7,
      },
      columnStyles: {
        ...(nameColumnIndex >= 0 ? { [nameColumnIndex]: { halign: "right" as const, cellWidth: orientation === "landscape" ? 52 : 42 } } : {}),
        ...(numberColumnIndex >= 0 ? { [numberColumnIndex]: { cellWidth: 8 } } : {}),
      },
    });

    finalizePDF(doc, `الإدخال_اليومي_${fileDate}.pdf`, watermark, advanced);
  };

  const studentsWithViolations = React.useMemo(() => filteredStudentGrades.filter(sg =>
    violationCats.some(cat => {
      const score = sg.grades[cat.id];
      return score != null && score !== 0;
    })
  ), [filteredStudentGrades, violationCats]);

  // Top performers (net score) for smart-card green glow
  const topPerformerIds = React.useMemo(() => {
    const scored = filteredStudentGrades.map(sg => {
      let earned = 0;
      for (const cat of categories) {
        const v = sg.grades[cat.id];
        if (v == null) continue;
        earned += cat.is_deduction ? -Number(v) : Number(v);
      }
      return { id: sg.student_id, earned };
    });
    return new Set(
      scored.filter(s => s.earned > 0).sort((a, b) => b.earned - a.earned).slice(0, 3).map(s => s.id)
    );
  }, [filteredStudentGrades, categories]);

  const buildViolationsTableHTML = () => {
    const headerCells = [
      '<th style="width:30px;">#</th>',
      '<th style="text-align:right;">الطالب</th>',
      '<th>نوع المخالفة</th>',
    ].join('');

    const bodyRows = studentsWithViolations.map((sg, i) => {
      const violations = violationCats
        .filter(cat => sg.grades[cat.id] != null && sg.grades[cat.id]! !== 0)
        .map(cat => sg.notes?.[cat.id] || cat.name)
        .join('، ');
      return `<tr><td>${i + 1}</td><td>${sg.full_name}</td><td>${violations}</td></tr>`;
    }).join('');

    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  };

  const handlePrintTable = async () => { await printGradesTable(getDailyPrintOptions()); };
  const handleExportPDF = async () => {
    try {
      const opts = getDailyPrintOptions();
      const fileDate = format(selectedDate, "yyyy-MM-dd");
      await exportGradesTableAsPDF({ ...opts, fileName: `الإدخال_اليومي_${fileDate}` });
      toast({ title: "تم التصدير", description: "تم تصدير ملف PDF بنجاح" });
    } catch (e: any) {
      console.error("[DailyGradeEntry] Export PDF failed:", e);
      toast({ title: "خطأ", description: e?.message || "فشل تصدير PDF", variant: "destructive" });
    }
  };

  const getViolationsPDFOptions = () => {
    const className = classes.find(c => c.id === selectedClass)?.name || "الفصل";
    const dateStr = format(selectedDate, "yyyy/MM/dd");
    return {
      orientation: "portrait" as const,
      title: `${className} — المخالفات`,
      subtitle: `${dateStr} — الفترة ${selectedPeriod === 1 ? "الأولى" : "الثانية"}`,
      reportType: "violations" as const,
      tableHTML: buildViolationsTableHTML(),
      fileName: `المخالفات_${format(selectedDate, "yyyy-MM-dd")}`,
    };
  };

  const handleExportViolationsPDF = async () => {
    if (studentsWithViolations.length === 0) {
      toast({ title: "لا توجد مخالفات", description: "لا يوجد طلاب عليهم مخالفات للتصدير" });
      return;
    }
    try {
      await exportGradesTableAsPDF(getViolationsPDFOptions());
      toast({ title: "تم التصدير", description: "تم تصدير ملف المخالفات PDF بنجاح" });
    } catch (e: any) {
      console.error("[DailyGradeEntry] Export violations PDF failed:", e);
      toast({ title: "خطأ", description: e?.message || "فشل تصدير PDF", variant: "destructive" });
    }
  };

  const handleShareViolationsWhatsApp = async () => {
    if (studentsWithViolations.length === 0) {
      toast({ title: "لا توجد مخالفات", description: "لا يوجد طلاب عليهم مخالفات للمشاركة" });
      return;
    }
    try {
      const opts = getViolationsPDFOptions();
      const blob = await exportGradesTableAsPDF({ ...opts, returnBlob: true }) as Blob;
      const { sharePDFViaWhatsApp } = await import("@/lib/whatsapp-share");
      const result = await sharePDFViaWhatsApp(blob, `${opts.fileName}.pdf`, `📋 ${opts.title}`);
      toast({ title: result === "shared" ? "تم المشاركة" : "تم تصدير PDF", description: result === "shared" ? "تم مشاركة ملف PDF بنجاح" : "تم تحميل الملف، يمكنك إرفاقه في واتساب" });
    } catch (e: any) {
      console.error("[DailyGradeEntry] Share violations WhatsApp failed:", e);
      toast({ title: "خطأ", description: e?.message || "فشل المشاركة", variant: "destructive" });
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Card className="border border-border/40 shadow-card bg-card/70 backdrop-blur-xl overflow-hidden">
      <CardHeader className="pb-3 no-print relative">
        {/* Decorative blob */}
        <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-3">
          {/* Top row: Title + Date Nav */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
                <ClipboardList className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold leading-tight">إدخال الدرجات اليومية</CardTitle>
                <p className="text-[11px] text-muted-foreground">رصد سريع وذكي لتفاعل الحصة</p>
              </div>
            </div>

            {/* Date Navigator Pill */}
            <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-background/70 backdrop-blur-md p-1 shadow-sm">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={goToPrevDay} title="اليوم السابق">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <HijriDatePicker date={selectedDate} onDateChange={setSelectedDate} />
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={goToNextDay} disabled={isToday(selectedDate)} title="اليوم التالي">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {!isToday(selectedDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg"
                  onClick={goToToday}
                >
                  اليوم
                </Button>
              )}
            </div>
          </div>

          {/* Bottom row: Tools toolbar */}
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/30">
            {/* Smart Radar — primary action (assessment only) */}
            {gradeTab === "assessment" && (
              <Button
                variant={radarOpen ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 gap-1.5 text-xs font-bold rounded-lg transition-all duration-300",
                  radarOpen
                    ? "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md shadow-primary/30"
                    : "border-primary/30 text-primary hover:bg-primary/10"
                )}
                onClick={() => setRadarOpen(!radarOpen)}
              >
                <Radar className={cn("h-3.5 w-3.5", radarOpen && "animate-pulse")} />
                الرادار الذكي
              </Button>
            )}

            {/* Category Filter */}
            {categories.length > 0 && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs font-semibold bg-background/70 border-border/50 rounded-lg">
                  <SelectValue placeholder="جميع الفئات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {dailyCategories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {/* Spacer pushes actions left */}
            <div className="flex-1" />

            {/* Action chips */}
            <ScrollToSaveButton targetId="grades-save" label="حفظ ↓" />

            {selectedClass && categories.length > 0 && gradeTab !== "violations" && (
              <>
                <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-background/60 p-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary" title="تصدير PDF" onClick={handleExportPDF}>
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary" title="طباعة" onClick={handlePrintTable}>
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <GradesExportDialog
                  title="الإدخال اليومي"
                  fileName="الإدخال_اليومي"
                  tableRef={tableRef}
                  groups={(() => {
                    const className = `${classes.find(c => c.id === selectedClass)?.name || "الفصل"} — ${format(selectedDate, "yyyy/MM/dd")}`;
                    const headers = ["#", "الطالب", ...visibleCategories.map(c => c.name), ...(!isSingleCategory ? ["المجموع"] : [])];
                    const rows = filteredStudentGrades.map((sg, i) => [
                      String(i + 1), sg.full_name,
                      ...visibleCategories.map(c => {
                        const slotsArr = sg.slots[c.id] || [null];
                        const isStarred = sg.starred[c.id] || false;
                        if (isStarred) return "★";
                        const levelSymbol = (l: GradeLevel) => l === "excellent" ? "✓" : l === "average" ? "~" : l === "zero" ? "✗" : "";
                        return slotsArr.map(levelSymbol).filter(Boolean).join(" ") || "-";
                      }),
                      ...(!isSingleCategory ? [calcTotal(sg.grades)] : []),
                    ]);
                    return [{ className, headers, rows }] as ExportTableGroup[];
                  })()}
                />
              </>
            )}

            {selectedClass && categories.length > 0 && gradeTab === "violations" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-bold rounded-lg">
                    <FileText className="h-3.5 w-3.5" />تصدير
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportViolationsPDF} className="gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />تصدير PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareViolationsWhatsApp} className="gap-2 cursor-pointer text-success">
                    <MessageCircle className="h-4 w-4" />إرسال عبر واتساب
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            {/* Alpha Leaderboard — live podium for top 3 */}
            <div className="mb-4">
              <ClassAlphaDashboard
                classId={selectedClass}
                className={classes.find(c => c.id === selectedClass)?.name || "الفصل"}
                students={filteredStudentGrades.map(sg => {
                  let earned = 0;
                  let violations = 0;
                  for (const cat of categories) {
                    const v = sg.grades[cat.id];
                    if (v == null) continue;
                    if (cat.is_deduction) {
                      earned -= Number(v);
                      if (Number(v) > 0) violations += 1;
                    } else {
                      earned += Number(v);
                    }
                  }
                  return {
                    student_id: sg.student_id,
                    full_name: sg.full_name,
                    earnedTotal: earned,
                    violationsCount: violations,
                  };
                })}
              />
            </div>
            {/* Smart Radar */}
            {radarOpen && gradeTab === "assessment" && (
              <div className="mb-4 no-print">
                <SmartRadar
                  students={filteredStudentGrades.map(sg => ({ student_id: sg.student_id, full_name: sg.full_name, totalScore: cumulativeTotals[sg.student_id] ?? 0 }))}
                  settings={radarSettings}
                  muted={radarMuted}
                  participatedStudentIds={(() => {
                    const partCat = assessmentCats.find(c => c.name.includes("المشاركة"));
                    if (!partCat) return [];
                    return filteredStudentGrades
                      .filter(sg => sg.grades[partCat.id] != null)
                      .map(sg => sg.student_id);
                  })()}
                  onToggleMute={() => setRadarMuted(p => !p)}
                  onSelectForGrade={(studentId) => {
                    setEarnedGradeInput({ studentId, open: true });
                  }}
                  onSelectForParticipation={async (studentId, level) => {
                    const partCat = assessmentCats.find(c => c.name.includes("المشاركة"));
                    if (!partCat) {
                      toast({ title: "لا توجد فئة مشاركة", description: "يرجى اضافة فئة تحمل اسم المشاركة في اعدادات الفئات", variant: "destructive" });
                      return;
                    }
                    const maxScore = Number(partCat.max_score);
                    let finalScore: number;
                    if (level === "star") {
                      toggleStar(studentId, partCat.id, maxScore);
                      finalScore = maxScore;
                    } else {
                      const gradeLevel = level as "excellent" | "average" | "zero";
                      const score = setGradeWithSlot(studentId, partCat.id, gradeLevel, maxScore);
                      finalScore = score ?? 0;
                    }
                    try {
                      await quickSaveGrade(studentId, partCat.id, finalScore);
                      const labelMap = { excellent: "ممتاز", average: "متوسط", zero: "صفر", star: "متميز" };
                      toast({ title: "✅ تم حفظ المشاركة", description: `تقييم: ${labelMap[level]}` });
                    } catch {
                      toast({ title: "فشل الحفظ", description: "تم رصد الدرجة محلياً، اضغط حفظ لإعادة المحاولة", variant: "destructive" });
                    }
                  }}
                  onQuizCorrect={async (studentId, score) => {
                    const numCat = assessmentCats[0];
                    if (numCat) {
                      const currentScore = filteredStudentGrades.find(s => s.student_id === studentId)?.grades[numCat.id] || 0;
                      const newScore = Math.min((currentScore || 0) + score, Number(numCat.max_score));
                      setNumericGrade(studentId, numCat.id, String(newScore), Number(numCat.max_score));
                      try {
                        await quickSaveGrade(studentId, numCat.id, newScore);
                        toast({ title: "✅ تم حفظ الدرجة", description: `تم اضافة ${score} درجة الى الدرجات المكتسبة` });
                      } catch {
                        toast({ title: "فشل الحفظ", description: "تم رصد الدرجة محلياً، اضغط حفظ لإعادة المحاولة", variant: "destructive" });
                      }
                    }
                  }}
                  onClose={() => setRadarOpen(false)}
                />
              </div>
            )}

            {/* Earned Grade Input Dialog */}
            {earnedGradeInput.open && (
              <div className="mb-4 no-print animate-fade-in">
                <div className="rounded-xl border-2 border-primary/30 bg-card p-4 shadow-lg" dir="rtl">
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-black">?</span>
                    ادخل درجة السؤال للطالب: {filteredStudentGrades.find(s => s.student_id === earnedGradeInput.studentId)?.full_name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      placeholder="الدرجة"
                      className="w-24 h-9"
                      id="earned-grade-input"
                      autoFocus
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          const val = (e.target as HTMLInputElement).value;
                          if (val) {
                            const numCat = assessmentCats[0];
                            if (numCat) {
                              const finalScore = Math.min(Math.max(0, Number(val)), Number(numCat.max_score));
                              setNumericGrade(earnedGradeInput.studentId, numCat.id, String(finalScore), Number(numCat.max_score));
                              try {
                                await quickSaveGrade(earnedGradeInput.studentId, numCat.id, finalScore);
                                toast({ title: "✅ تم حفظ الدرجة", description: `تم اضافة ${val} درجة` });
                              } catch {
                                toast({ title: "فشل الحفظ", description: "تم رصد الدرجة محلياً، اضغط حفظ لإعادة المحاولة", variant: "destructive" });
                              }
                            }
                            setEarnedGradeInput({ studentId: "", open: false });
                          }
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={async () => {
                        const input = document.getElementById("earned-grade-input") as HTMLInputElement;
                        const val = input?.value;
                        if (val) {
                          const numCat = assessmentCats[0];
                          if (numCat) {
                            const finalScore = Math.min(Math.max(0, Number(val)), Number(numCat.max_score));
                            setNumericGrade(earnedGradeInput.studentId, numCat.id, String(finalScore), Number(numCat.max_score));
                            try {
                              await quickSaveGrade(earnedGradeInput.studentId, numCat.id, finalScore);
                              toast({ title: "✅ تم حفظ الدرجة", description: `تم اضافة ${val} درجة` });
                            } catch {
                              toast({ title: "فشل الحفظ", description: "تم رصد الدرجة محلياً، اضغط حفظ لإعادة المحاولة", variant: "destructive" });
                            }
                          }
                        }
                        setEarnedGradeInput({ studentId: "", open: false });
                      }}
                    >
                      <Save className="h-3.5 w-3.5" />
                      حفظ
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEarnedGradeInput({ studentId: "", open: false })}>
                      الغاء
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className={cn("grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4 text-sm no-print", gradeTab === "violations" && hasViolations && "hidden")}>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <CircleCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /><span className="text-emerald-700 dark:text-emerald-300 font-medium">ممتاز</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
                <CircleMinus className="h-5 w-5 text-orange-500 dark:text-orange-400" /><span className="text-orange-700 dark:text-orange-300 font-medium">متوسط</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                <CircleX className="h-5 w-5 text-rose-500 dark:text-rose-400" /><span className="text-rose-700 dark:text-rose-300 font-medium">صفر</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20">
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
                  <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.27l-5.8 3.18 1.1-6.5-4.7-4.6 6.5-.95L12 2.5z" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" strokeLinejoin="round" />
                </svg><span className="text-yellow-700 dark:text-yellow-300 font-medium">متميز</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/20">
                <Undo2 className="h-4 w-4 text-slate-500 dark:text-slate-400" /><span className="text-slate-600 dark:text-slate-300 font-medium">تراجع</span>
              </div>
            </div>

            {/* Attendance alerts */}
            {attendanceLoaded && !hasAttendanceRecords && (
              <Alert className="mb-4 border-warning/50 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning text-sm font-medium">يرجى رصد الحضور أولاً ليظهر الطلاب في قائمة التفاعل</AlertDescription>
              </Alert>
            )}
            {hasAttendanceRecords && filteredStudentGrades.length === 0 && (
              <Alert className="mb-4 border-muted-foreground/30">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-muted-foreground text-sm">جميع الطلاب مسجّلون كغائبين في هذا اليوم</AlertDescription>
              </Alert>
            )}
            {hasAttendanceRecords && absentCount > 0 && (
              <div className="mb-3 flex items-center justify-between flex-wrap gap-2 no-print">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-success" />
                  يُعرض {filteredStudentGrades.length - (showAbsent ? absentCount : 0)} طالب حاضر من أصل {filteredStudentGrades.length + (showAbsent ? 0 : absentCount)}
                  {showAbsent && <span className="text-destructive/70 mr-1">({absentCount} غائب)</span>}
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowAbsent(prev => !prev)}>
                  {showAbsent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showAbsent ? "إخفاء الغائبين" : `إظهار الغائبين (${absentCount})`}
                </Button>
              </div>
            )}

            {/* Tabs */}
            {hasViolations && (
              <div className="mb-4 no-print">
                <div className="flex items-center gap-2 mb-2">
                  <Tabs value={gradeTab} onValueChange={(v) => setGradeTab(v as "assessment" | "violations")} dir="rtl" className="flex-1">
                    <TabsList className="w-auto justify-start">
                      <TabsTrigger value="assessment" className="gap-1.5">
                        <CircleCheck className="h-4 w-4" />التقييم
                      </TabsTrigger>
                      <TabsTrigger value="violations" className="gap-1.5">
                        <AlertTriangle className="h-4 w-4" />المخالفات
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {gradeTab === "violations" && (
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setReasonsDialogOpen(true)}>
                      <Settings className="h-3.5 w-3.5" />
                      إدارة الأسباب
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Table */}
            <div ref={tableRef} className="overflow-auto overscroll-contain max-h-[70vh] rounded-xl border border-border/60 shadow-sm bg-card">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                    <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-l-2 border-border border-primary/20 first:rounded-tr-xl">#</th>
                    <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-l-2 border-border border-primary/20 min-w-[110px]">الطالب</th>
                    {activeCats.map((cat) => (
                      <th key={cat.id} className={cn("text-center p-3 font-semibold text-xs border-b-2 border-l-2 border-border border-primary/20 min-w-[100px]", cat.is_deduction ? "text-destructive bg-destructive/5" : "text-primary")}>
                        <div>{cat.name}{cat.is_deduction && <span className="block text-[9px] font-normal opacity-70">خصم</span>}</div>
                      </th>
                    ))}
                    {showTotal && <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-l-2 border-border border-primary/20 min-w-[80px]">المجموع</th>}
                    {gradeTab === "assessment" && <th className="text-center p-3 font-semibold text-xs border-b-2 border-primary/20 last:rounded-tl-xl min-w-[90px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">الدرجات المكتسبة</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudentGrades.map((sg, i) => {
                    const isEven = i % 2 === 0;
                    const isLast = i === filteredStudentGrades.length - 1;
                    const studentStatus = hasAttendanceRecords ? attendanceMap[sg.student_id] : undefined;
                    const isHidden = studentStatus && hiddenStatuses.includes(studentStatus);
                    const isLate = studentStatus === "late";
                    const statusLabel: Record<string, string> = { absent: "غائب", early_leave: "منصرف مبكراً", sick_leave: "إجازة مرضية" };

                    // Violation referral logic
                    const violationSummary = gradeTab === "violations" ? violationHistory[sg.student_id] : undefined;
                    const referralInfo = gradeTab === "violations" ? buildReferralReason(violationSummary, sg.full_name) : { hasReferral: false, repeatedTypes: [], reasonText: "" };

                    // Check if student has any active violation today
                    const hasActiveViolation = gradeTab === "violations" && violationCats.some(cat => {
                      const score = sg.grades[cat.id];
                      return score != null && score !== 0;
                    });

                    // Smart card status: pulsating red for 3+ violations, green glow for top performers
                    const violationsCount = violationCats.reduce((acc, cat) => {
                      const score = sg.grades[cat.id];
                      return acc + (score != null && score !== 0 ? 1 : 0);
                    }, 0);
                    const isCriticalViolator = violationsCount >= 3;
                    const isTopPerformer = !isHidden && !isCriticalViolator && topPerformerIds.has(sg.student_id);

                    return (
                      <tr key={sg.student_id} className={cn(
                        "group transition-all duration-200 cursor-default border-b border-border/30 smart-card-glass",
                        isHidden && "opacity-50 bg-destructive/5 dark:bg-destructive/10",
                        !isHidden && "hover:bg-sky-100/60 dark:hover:bg-sky-900/30",
                        referralInfo.hasReferral && "bg-destructive/5 dark:bg-destructive/10",
                        hasActiveViolation && !referralInfo.hasReferral && !isCriticalViolator && "bg-amber-50/60 dark:bg-amber-500/8 border-amber-200/40 dark:border-amber-500/15",
                        isCriticalViolator && "smart-card-glow-red",
                        isTopPerformer && "smart-card-glow-green",
                      )}>
                        <td className="p-3 text-muted-foreground font-medium border-l-2 border-border transition-colors duration-200 group-hover:text-primary">{i + 1}</td>
                        <td className="p-3 font-semibold border-l-2 border-border whitespace-nowrap text-sm transition-all duration-200 group-hover:text-primary group-hover:bg-sky-100/40 dark:group-hover:bg-sky-900/20">
                          <span className="flex items-center gap-1.5">
                            {sg.full_name}
                            {isLate && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                                <Clock className="h-3 w-3" />متأخر
                              </span>
                            )}
                            {isHidden && studentStatus && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive dark:bg-destructive/20 border border-destructive/20">
                                {statusLabel[studentStatus] || studentStatus}
                              </span>
                            )}
                            {/* Referral alert badge for 3+ violations */}
                            {referralInfo.hasReferral && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReferral(sg.student_id, sg.full_name)}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30 animate-pulse hover:animate-none hover:bg-destructive/25 transition-colors"
                                    >
                                      <FileWarning className="h-3 w-3" />
                                      إحالة
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-right" dir="rtl">
                                    <p className="text-xs font-bold mb-1">تكرار مخالفات - يتطلب إحالة إدارية</p>
                                    {referralInfo.repeatedTypes.map(rt => (
                                      <p key={rt.type} className="text-[11px]">
                                        {rt.type}: {rt.count} مرات
                                      </p>
                                    ))}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </span>
                        </td>
                        {activeCats.map((cat) => {
                          const maxScore = Number(cat.max_score);
                          const slotsArr = sg.slots[cat.id] || [null];
                          const isStarred = sg.starred[cat.id] || false;
                          const isDeduction = cat.is_deduction;

                          if (isDeduction) {
                            const deductionScore = sg.grades[cat.id];
                            const deductionNote = sg.notes?.[cat.id] || "";
                            const currentScore = deductionScore ?? 0;
                            return (
                              <td key={cat.id} className="p-2 text-center border-l-2 border-border">
                                <div className="flex flex-col items-center gap-1.5">
                                  {/* Quick Chips */}
                                  <div className="flex flex-wrap gap-1 justify-center">
                                    {violationReasons.map((reason) => {
                                      const isActive = deductionNote === reason.label;
                                      return (
                                        <button
                                          key={reason.label}
                                          type="button"
                                          onClick={() => {
                                            if (isActive) {
                                              setDeductionNote(sg.student_id, cat.id, "");
                                              setNumericGrade(sg.student_id, cat.id, "0", maxScore);
                                            } else {
                                              setDeductionNote(sg.student_id, cat.id, reason.label);
                                              setNumericGrade(sg.student_id, cat.id, String(reason.defaultScore), maxScore);
                                            }
                                          }}
                                          className={cn(
                                            "px-2 py-1 rounded-md text-[10px] font-bold border transition-all min-w-[40px] min-h-[28px] touch-manipulation",
                                            isActive
                                              ? "bg-destructive/15 text-destructive border-destructive/40 shadow-sm"
                                              : "bg-muted/60 text-muted-foreground border-border/50 hover:bg-muted hover:border-border"
                                          )}
                                        >
                                          {reason.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {/* Score with +/- */}
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => setNumericGrade(sg.student_id, cat.id, String(Math.max(0, currentScore - 1)), maxScore)}
                                      className="h-6 w-6 rounded border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors touch-manipulation"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={maxScore}
                                      value={currentScore === 0 ? "0" : (currentScore || "")}
                                      onChange={(e) => setNumericGrade(sg.student_id, cat.id, e.target.value, maxScore)}
                                      className="w-12 h-6 text-center text-xs border-destructive/40 focus:border-destructive px-1"
                                      placeholder="0"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setNumericGrade(sg.student_id, cat.id, String(Math.min(maxScore, currentScore + 1)), maxScore)}
                                      className="h-6 w-6 rounded border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors touch-manipulation"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={cat.id} className="p-3 text-center border-l-2 border-border">
                              <div className="flex items-center justify-center gap-1">
                                {slotsArr.map((slotLevel, si) => (
                                  <button key={si} type="button" onClick={() => cycleSlot(sg.student_id, cat.id, si, maxScore)}
                                    className={cn("p-1 rounded-lg transition-all hover:scale-110 cursor-pointer",
                                      !slotLevel && "grade-empty",
                                    )} title="اضغط للتبديل" data-grade-level={slotLevel || "empty"}>
                                    <LevelIcon level={slotLevel} />
                                  </button>
                                ))}
                                {extraSlotsEnabled && !isCatDisabled(cat.id) && slotsArr.length < getMaxSlots(cat.id) && (
                                  <button type="button" onClick={() => addSlot(sg.student_id, cat.id)} className="p-0.5 rounded-md transition-all hover:scale-110 opacity-40 hover:opacity-80" title="إضافة تقييم">
                                    <Plus className="h-5 w-5 text-muted-foreground" />
                                  </button>
                                )}
                                <span className="w-px h-5 bg-border mx-0.5" />
                                <button type="button" onClick={() => toggleStar(sg.student_id, cat.id, maxScore)}
                                  className={cn("p-1 rounded-lg transition-all hover:scale-110", isStarred ? "opacity-100" : "opacity-40 hover:opacity-70 star-empty")} title="متميز" data-starred={isStarred ? "true" : "false"}>
                                  <svg viewBox="0 0 24 24" className={cn("h-5 w-5 shrink-0", isStarred ? "" : "text-muted-foreground")} aria-hidden="true">
                                    <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.27l-5.8 3.18 1.1-6.5-4.7-4.6 6.5-.95L12 2.5z"
                                      fill={isStarred ? "#FBBF24" : "currentColor"}
                                      stroke={isStarred ? "#D97706" : "currentColor"}
                                      strokeWidth="1.2" strokeLinejoin="round"
                                      opacity={isStarred ? 1 : 0.4}
                                    />
                                  </svg>
                                </button>
                                <button type="button" onClick={() => clearGrade(sg.student_id, cat.id)} className="p-0.5 rounded-md transition-all hover:scale-110 opacity-40 hover:opacity-100" title="تراجع">
                                  <Undo2 className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </div>
                            </td>
                          );
                        })}
                        {showTotal && <td className="p-3 text-center font-bold border-l-2 border-border">{calcTotal(sg.grades)}</td>}
                        {gradeTab === "assessment" && (
                          <td className="p-2 text-center border-l-2 border-border bg-emerald-500/5">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={sg.grades[assessmentCats[0]?.id] != null && typeof sg.grades[assessmentCats[0]?.id] === "number" ? "" : ""}
                              placeholder="--"
                              className="w-14 h-7 text-center text-xs mx-auto border-emerald-300 dark:border-emerald-600 focus:border-emerald-500"
                              onChange={(e) => {
                                const numCat = assessmentCats[0];
                                if (numCat) setNumericGrade(sg.student_id, numCat.id, e.target.value, Number(numCat.max_score));
                              }}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div id="grades-save" className="flex justify-end mt-4">
              <Button
                onClick={() => {
                  const main = document.querySelector("main");
                  const scrollEl: HTMLElement | Window = main && main.scrollHeight > main.clientHeight ? (main as HTMLElement) : window;
                  const y = scrollEl === window ? window.scrollY : (scrollEl as HTMLElement).scrollTop;
                  handleSave();
                  requestAnimationFrame(() => {
                    if (scrollEl === window) window.scrollTo({ top: y });
                    else (scrollEl as HTMLElement).scrollTop = y;
                    setTimeout(() => {
                      if (scrollEl === window) window.scrollTo({ top: y });
                      else (scrollEl as HTMLElement).scrollTop = y;
                    }, 50);
                  });
                }}
                disabled={saving}
                className="shadow-md shadow-primary/20"
              >
                <Save className="h-4 w-4 ml-2" />
                {saving ? "جارٍ الحفظ..." : "حفظ الدرجات"}
              </Button>
            </div>

            {/* Referral Form Dialog */}
            {referralForm && (
              <FormDialog
                form={referralForm}
                open={referralFormOpen}
                onOpenChange={(v) => { setReferralFormOpen(v); if (!v) setReferralStudentId(null); }}
                preSelectedStudentIds={referralStudentId ? [referralStudentId] : undefined}
                initialFieldValues={referralPreFill}
              />
            )}

            {/* Violation Reasons Settings Dialog */}
            <ViolationReasonsDialog
              open={reasonsDialogOpen}
              onOpenChange={setReasonsDialogOpen}
              reasons={violationReasons}
              defaultReasons={DEFAULT_REASONS}
              onSave={saveReasons}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
