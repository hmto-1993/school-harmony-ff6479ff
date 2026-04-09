import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, CircleCheck, CircleMinus, CircleX, Star, Undo2, Plus, ChevronRight, ChevronLeft, Printer, FileText, AlertTriangle, Clock, Eye, EyeOff } from "lucide-react";
import ScrollToSaveButton from "@/components/shared/ScrollToSaveButton";
import GradesExportDialog, { ExportTableGroup } from "./GradesExportDialog";
import { cn } from "@/lib/utils";
import { isToday, format } from "date-fns";
import { HijriDatePicker } from "@/components/ui/hijri-date-picker";
import { printGradesTable, exportGradesTableAsPDF } from "@/lib/grades-print";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useDailyGradeData, GradeLevel } from "@/hooks/useDailyGradeData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const DEDUCTION_REASONS = [
  "النوم", "الحديث", "أصوات مزعجة", "عدم احترام", "استخدام الجوال",
  "عدم إحضار الكتاب", "عدم حل الواجب", "الأكل في الحصة", "التأخر عن الحصة",
  "العبث بالممتلكات", "الإزعاج", "أخرى",
];

// ── SVG Grade Icons (bypass global .lucide color override) ─────────
function GradeSvgIcon({ type, size = 24 }: { type: "excellent" | "average" | "zero" | "star" | "empty"; size?: number }) {
  if (type === "star") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0" style={{ color: "#d97706" }}>
        <path d="M12 3.75l2.55 5.17 5.7.83-4.13 4.03.98 5.68L12 16.78 6.9 19.46l.98-5.68-4.13-4.03 5.7-.83L12 3.75z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "excellent") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0" style={{ color: "#059669" }} fill="none">
        <path d="M6 12.5l4 4 8-8.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "average") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0" style={{ color: "#ea580c" }} fill="none">
        <path d="M6 12h12" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "zero") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0" style={{ color: "#e11d48" }} fill="none">
        <path d="M7 7l10 10" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M17 7l-10 10" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.35)" }} fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}

const LevelIcon = React.forwardRef<HTMLDivElement, { level: GradeLevel; size?: string }>(
  ({ level, size = "h-6 w-6", ...props }, ref) => {
    const sizeNum = size.includes("3") ? 14 : size.includes("4") ? 16 : size.includes("5") ? 20 : 24;
    const type = level === "excellent" ? "excellent" : level === "average" ? "average" : level === "zero" ? "zero" : "empty";
    return <div ref={ref} {...props} className={cn("inline-flex items-center justify-center", size)}><GradeSvgIcon type={type} size={sizeNum} /></div>;
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
  const {
    classes, categories, saving, selectedDate, setSelectedDate,
    selectedCategory, setSelectedCategory,
    extraSlotsEnabled, showAbsent, setShowAbsent,
    attendanceLoaded, attendanceMap, hasAttendanceRecords,
    tableRef, dailyCategories, visibleCategories, isSingleCategory,
    filteredStudentGrades, absentCount, hiddenStatuses,
    goToPrevDay, goToNextDay, goToToday,
    getMaxSlots, isCatDisabled,
    cycleSlot, addSlot, toggleStar, clearGrade, setNumericGrade, setDeductionNote,
    calcTotal, handleSave,
  } = useDailyGradeData({ selectedClass, selectedPeriod });

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

  const handlePrintTable = async () => { await printGradesTable(getDailyPrintOptions()); };
  const handleExportPDF = async () => {
    try {
      await exportGradesTableAsPDF({ ...getDailyPrintOptions(), fileName: `الإدخال_اليومي_${format(selectedDate, "yyyy-MM-dd")}` });
      toast({ title: "تم التصدير", description: "تم تصدير ملف PDF بنجاح" });
    } catch { toast({ title: "خطأ", description: "فشل تصدير PDF", variant: "destructive" }); }
  };

  // ── Render ─────────────────────────────────────────────────────
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
              )}
              {selectedClass && categories.length > 0 && (
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="تصدير PDF" onClick={handleExportPDF}><FileText className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="طباعة" onClick={handlePrintTable}><Printer className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ScrollToSaveButton targetId="grades-save" label="حفظ ↓" />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevDay}><ChevronRight className="h-4 w-4" /></Button>
            <HijriDatePicker date={selectedDate} onDateChange={setSelectedDate} />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextDay} disabled={isToday(selectedDate)}><ChevronLeft className="h-4 w-4" /></Button>
            {!isToday(selectedDate) && <Button variant="ghost" size="sm" className="text-xs" onClick={goToToday}>اليوم</Button>}
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
            {/* Legend */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4 text-sm no-print">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <GradeSvgIcon type="excellent" size={20} /><span className="text-emerald-700 dark:text-emerald-300 font-medium">ممتاز</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <GradeSvgIcon type="average" size={20} /><span className="text-amber-700 dark:text-amber-300 font-medium">متوسط</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                <GradeSvgIcon type="zero" size={20} /><span className="text-rose-700 dark:text-rose-300 font-medium">صفر</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20">
                <GradeSvgIcon type="star" size={20} /><span className="text-yellow-700 dark:text-yellow-300 font-medium">متميز</span>
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

            {/* Tabs for regular vs deduction */}
            {(() => {
              const regularCats = visibleCategories.filter(c => !c.is_deduction);
              // Deduction cats always show ALL deduction categories, ignoring the category dropdown filter
              const deductionCats = dailyCategories.filter(c => c.is_deduction);
              const hasDeductions = deductionCats.length > 0;

              const renderTable = (cats: typeof visibleCategories, isDeductionTab: boolean) => (
                <div ref={!isDeductionTab ? tableRef : undefined} className="overflow-x-auto rounded-xl border border-border/40 shadow-sm" dir="rtl">
                  <table className="w-full text-sm border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                        <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-l border-primary/20 first:rounded-tr-xl">#</th>
                        <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-l border-primary/20 min-w-[120px] max-w-[160px]">الطالب</th>
                        {cats.map((cat) => (
                          <th key={cat.id} className={cn("text-center p-3 font-semibold text-xs border-b-2 border-l border-primary/20 min-w-[100px]", isDeductionTab ? "text-destructive bg-destructive/5" : "text-primary")}>
                            <div>{cat.name}{isDeductionTab && <span className="block text-[9px] font-normal opacity-70">خصم</span>}</div>
                          </th>
                        ))}
                        {!isDeductionTab && !isSingleCategory && <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl min-w-[80px]">المجموع</th>}
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
                        return (
                          <tr key={sg.student_id} className={cn(
                            "group transition-all duration-200 cursor-default",
                            isHidden ? "opacity-50 bg-destructive/5 dark:bg-destructive/10" : cn("hover:bg-primary/10 dark:hover:bg-primary/15", isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20"),
                            !isLast && "border-b border-border/20"
                          )}>
                            <td className="p-3 text-muted-foreground font-medium border-l border-border/30 transition-colors duration-200 group-hover:text-primary">{i + 1}</td>
                            <td className="p-3 font-semibold border-l border-border/30 whitespace-nowrap text-sm transition-all duration-200 group-hover:bg-primary/5 group-hover:text-primary">
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
                              </span>
                            </td>
                            {cats.map((cat) => {
                              const maxScore = Number(cat.max_score);
                              const slotsArr = sg.slots[cat.id] || [null];
                              const isStarred = sg.starred[cat.id] || false;

                              if (isDeductionTab) {
                                const deductionScore = sg.grades[cat.id];
                                const deductionNote = sg.notes?.[cat.id] || "";
                                return (
                                  <td key={cat.id} className="p-2 text-center border-l border-border/30">
                                    <div className="flex flex-col items-center gap-1">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={maxScore}
                                        value={deductionScore ?? ""}
                                        onChange={(e) => setNumericGrade(sg.student_id, cat.id, e.target.value, maxScore)}
                                        className="w-16 h-7 text-center text-xs border-destructive/40 focus:border-destructive"
                                        placeholder="0"
                                      />
                                      <Select value={deductionNote || undefined} onValueChange={(val) => setDeductionNote(sg.student_id, cat.id, val)}>
                                        <SelectTrigger className="w-28 h-6 text-[10px] border-muted-foreground/20 px-1">
                                          <SelectValue placeholder="السبب..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {DEDUCTION_REASONS.map(r => (
                                            <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td key={cat.id} className="p-3 text-center border-l border-border/30">
                                  <div className="flex items-center justify-center gap-1">
                                    {slotsArr.map((slotLevel, si) => (
                                      <button key={si} type="button" onClick={() => cycleSlot(sg.student_id, cat.id, si, maxScore)}
                                        className={cn("p-1 rounded-lg transition-all hover:scale-110 cursor-pointer",
                                          slotLevel === "excellent" && "bg-emerald-50 dark:bg-emerald-500/15",
                                          slotLevel === "average" && "bg-amber-50 dark:bg-amber-500/15",
                                          slotLevel === "zero" && "bg-rose-50 dark:bg-rose-500/15",
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
                                      className={cn("p-1 rounded-lg transition-all hover:scale-110", isStarred ? "bg-yellow-50 dark:bg-yellow-500/15 opacity-100" : "opacity-40 hover:opacity-70 star-empty")} title="متميز" data-starred={isStarred ? "true" : "false"}>
                                      <GradeSvgIcon type="star" size={20} />
                                    </button>
                                    <button type="button" onClick={() => clearGrade(sg.student_id, cat.id)} className="p-0.5 rounded-md transition-all hover:scale-110 opacity-40 hover:opacity-100" title="تراجع">
                                      <Undo2 className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                  </div>
                                </td>
                              );
                            })}
                            {!isDeductionTab && !isSingleCategory && <td className="p-3 text-center font-bold border-l border-border/30">{calcTotal(sg.grades)}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );

              return hasDeductions ? (
                <Tabs defaultValue="grades" className="w-full">
                  <TabsList className="mb-3 w-full sm:w-auto justify-end">
                    <TabsTrigger value="grades">📊 التقييم</TabsTrigger>
                    <TabsTrigger value="deductions">⚠️ المخالفات</TabsTrigger>
                  </TabsList>
                  <TabsContent value="grades">{renderTable(regularCats, false)}</TabsContent>
                  <TabsContent value="deductions">{renderTable(deductionCats, true)}</TabsContent>
                </Tabs>
              ) : renderTable(regularCats, false);
            })()}
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
