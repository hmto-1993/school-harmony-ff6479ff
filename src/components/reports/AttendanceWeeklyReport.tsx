import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, FileText, FileSpreadsheet, Upload, BookOpen, ClipboardCheck, Filter, Printer } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import LessonSlotDialog from "./LessonSlotDialog";

interface AttendanceRecord {
  student_name: string;
  student_id?: string;
  date: string;
  status: string;
  notes: string | null;
}

interface LessonPlanData {
  id: string;
  week_number: number;
  day_index: number;
  slot_index: number;
  lesson_title: string;
  objectives: string;
  teacher_reflection: string;
  is_completed: boolean;
}

interface Props {
  attendanceData: AttendanceRecord[];
  students: { id: string; full_name: string }[];
  periodsPerWeek: number;
  dateFrom: string;
  dateTo: string;
  className?: string;
  lessonPlans?: LessonPlanData[];
  onLessonUpdated?: () => void;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  present: { color: "#22c55e", label: "حاضر" },
  absent: { color: "#ef4444", label: "غائب" },
  sick_leave: { color: "#3b82f6", label: "مستأذن" },
  late: { color: "#f59e0b", label: "متأخر" },
  early_leave: { color: "#3b82f6", label: "خروج مبكر" },
};

const DEFAULT_ALERT_THRESHOLD = 0.2;

interface WeekData {
  weekNum: number;
  dates: string[];
}

interface StudentRow {
  id: string;
  name: string;
  weeks: Record<number, (string | null)[]>;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
  totalPeriods: number;
  isAtRisk: boolean;
}

function getWeekNumber(date: Date, startDate: Date): number {
  const diffTime = date.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

/** Render absent session dots: one red dot per absent session */
function AbsentDots({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-[3px] justify-center flex-wrap" title={`${count} حصة غياب`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ color: "#ef4444", fontSize: 16, lineHeight: 1 }}>●</span>
      ))}
    </span>
  );
}

export default function AttendanceWeeklyReport({
  attendanceData,
  students,
  periodsPerWeek,
  dateFrom,
  dateTo,
  className: classDisplayName,
  lessonPlans = [],
  onLessonUpdated,
}: Props) {
  const tableRef = useRef<HTMLDivElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"attendance" | "lessons">("attendance");
  const [alertThreshold, setAlertThreshold] = useState(DEFAULT_ALERT_THRESHOLD);
  const [selectedWeeks, setSelectedWeeks] = useState<Set<number>>(new Set());
  const [slotDialog, setSlotDialog] = useState<{ open: boolean; weekNum: number; dayIndex: number; slotIndex: number; lesson: LessonPlanData | null }>({ open: false, weekNum: 0, dayIndex: 0, slotIndex: 0, lesson: null });

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("id", "absence_threshold")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setAlertThreshold(Number(data.value) / 100 || DEFAULT_ALERT_THRESHOLD);
      });
  }, []);

  const lessonLookup = useMemo(() => {
    const map = new Map<string, LessonPlanData>();
    lessonPlans.forEach((lp) => {
      map.set(`${lp.week_number}-${lp.day_index}-${lp.slot_index}`, lp);
    });
    return map;
  }, [lessonPlans]);

  const { weeks, studentRows, totalPeriodsHeld } = useMemo(() => {
    const fromDate = new Date(dateFrom);
    const dateSet = new Set(attendanceData.map((r) => r.date));
    const allDates = Array.from(dateSet).sort();

    const weekMap = new Map<number, string[]>();
    allDates.forEach((d) => {
      const wn = getWeekNumber(new Date(d), fromDate);
      if (!weekMap.has(wn)) weekMap.set(wn, []);
      weekMap.get(wn)!.push(d);
    });

    const weeks: WeekData[] = Array.from(weekMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([weekNum, dates]) => ({ weekNum, dates }));

    const totalPeriodsHeld = allDates.length;

    const attByStudent = new Map<string, Map<string, string>>();
    attendanceData.forEach((r) => {
      if (!r.student_id) return;
      if (!attByStudent.has(r.student_id)) attByStudent.set(r.student_id, new Map());
      attByStudent.get(r.student_id)!.set(r.date, r.status);
    });

    const studentRows: StudentRow[] = students.map((s) => {
      const studentAtt = attByStudent.get(s.id) || new Map<string, string>();
      let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalExcused = 0;

      const weeksData: Record<number, (string | null)[]> = {};
      weeks.forEach((w) => {
        const slots: (string | null)[] = [];
        w.dates.forEach((d) => {
          const status = studentAtt.get(d) || null;
          slots.push(status);
          if (status === "present") totalPresent++;
          else if (status === "absent") totalAbsent++;
          else if (status === "late") totalLate++;
          else if (status === "early_leave" || status === "sick_leave") totalExcused++;
        });
        while (slots.length < periodsPerWeek) slots.push(null);
        weeksData[w.weekNum] = slots;
      });

      const isAtRisk = totalPeriodsHeld > 0 && totalAbsent / totalPeriodsHeld > alertThreshold;

      return {
        id: s.id, name: s.full_name, weeks: weeksData,
        totalPresent, totalAbsent, totalLate, totalExcused,
        totalPeriods: totalPeriodsHeld, isAtRisk,
      };
    });

    return { weeks, studentRows, totalPeriodsHeld };
  }, [attendanceData, students, periodsPerWeek, dateFrom, dateTo, alertThreshold]);

  // Initialize selectedWeeks to all weeks
  useEffect(() => {
    if (weeks.length > 0 && selectedWeeks.size === 0) {
      setSelectedWeeks(new Set(weeks.map((w) => w.weekNum)));
    }
  }, [weeks]);

  const filteredWeeks = useMemo(
    () => weeks.filter((w) => selectedWeeks.has(w.weekNum)),
    [weeks, selectedWeeks]
  );

  const toggleWeek = (weekNum: number) => {
    setSelectedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) next.delete(weekNum);
      else next.add(weekNum);
      return next;
    });
  };

  const selectAllWeeks = () => setSelectedWeeks(new Set(weeks.map((w) => w.weekNum)));
  const deselectAllWeeks = () => setSelectedWeeks(new Set());

  /** Count absent sessions for a student in a given week */
  const countAbsent = (s: StudentRow, weekNum: number): number => {
    const slots = s.weeks[weekNum] || [];
    return slots.filter((st) => st === "absent").length;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const headers = [
      "م", "اسم الطالب",
      ...filteredWeeks.flatMap((w) => [`أسبوع ${w.weekNum} (غياب)`]),
      "حاضر", "غائب", "متأخر", "معذور", "تنبيه",
    ];
    const rows = studentRows.map((s, idx) => {
      const row: Record<string, any> = { "م": idx + 1, "اسم الطالب": s.name };
      filteredWeeks.forEach((w) => {
        row[`أسبوع ${w.weekNum} (غياب)`] = countAbsent(s, w.weekNum);
      });
      row["حاضر"] = s.totalPresent;
      row["غائب"] = s.totalAbsent;
      row["متأخر"] = s.totalLate;
      row["معذور"] = s.totalExcused;
      row["تنبيه"] = s.isAtRisk ? `⚠ تجاوز ${Math.round(alertThreshold * 100)}%` : "";
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الحضور الأسبوعي");
    XLSX.writeFile(wb, `تقرير_الحضور_الأسبوعي_${dateFrom}_${dateTo}.xlsx`);
  };

  const handleExportPDF = async () => {
    const { createArabicPDF, getArabicTableStyles } = await import("@/lib/arabic-pdf");
    const autoTableImport = await import("jspdf-autotable");
    const autoTable = autoTableImport.default;
    const { doc, startY } = await createArabicPDF({ orientation: "landscape", reportType: "attendance", includeHeader: true });
    const tableStyles = getArabicTableStyles();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setFont("Amiri", "bold");
    doc.text("تقرير الحضور الأسبوعي", pageWidth / 2, startY, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("Amiri", "normal");
    doc.text(`${classDisplayName || ""} | من: ${dateFrom}  إلى: ${dateTo}`, pageWidth / 2, startY + 6, { align: "center" });

    const legendY = startY + 12;
    doc.setFontSize(7);
    const legendEntries = [
      { label: "● = حصة غياب واحدة", color: [239, 68, 68] },
      { label: "●● = حصتا غياب", color: [239, 68, 68] },
    ];
    let lx = pageWidth - 14;
    doc.text("مفتاح الرموز", lx, legendY, { align: "right" });
    lx -= doc.getTextWidth("مفتاح الرموز") + 6;
    legendEntries.forEach((e) => {
      doc.setTextColor(e.color[0], e.color[1], e.color[2]);
      doc.text(e.label, lx, legendY, { align: "right" });
      lx -= doc.getTextWidth(e.label) + 8;
    });
    doc.setTextColor(0, 0, 0);

    // RTL order for PDF: [م] right -> [اسم الطالب] -> [weeks...]
    // In the PDF table, columns go left-to-right, but we reverse for RTL
    const head = [[
      { content: "م", styles: { halign: "center" as const } },
      { content: "اسم الطالب", styles: { halign: "right" as const } },
      ...filteredWeeks.map((w) => ({
        content: `الأسبوع ${w.weekNum}`,
        styles: { halign: "center" as const, fillColor: [230, 236, 244] as [number, number, number], textColor: [50, 50, 50] as [number, number, number], fontSize: 7 },
      })),
    ]];

    const body = studentRows.map((s, idx) => {
      return [
        { content: String(idx + 1), styles: { halign: "center" as const, fontStyle: "bold" as const } },
        { content: s.name, styles: { halign: "right" as const, fontStyle: "bold" as const, fontSize: 9 } },
        ...filteredWeeks.map((w) => {
          const absentCount = countAbsent(s, w.weekNum);
          const dots = absentCount > 0 ? "●".repeat(absentCount) : "—";
          return {
            content: dots,
            styles: {
              halign: "center" as const,
              fontSize: absentCount > 0 ? 10 : 8,
              textColor: absentCount > 0 ? [239, 68, 68] as [number, number, number] : [180, 180, 180] as [number, number, number],
            },
          };
        }),
      ];
    });

    autoTable(doc, {
      startY: legendY + 5,
      head, body,
      ...tableStyles,
      tableWidth: "auto",
      styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 1.5, lineColor: [220, 225, 230], lineWidth: 0.2 },
      headStyles: { ...tableStyles.headStyles, fontSize: 7, fillColor: [230, 236, 244], textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data: any) => {
        if (data.section === "body" && studentRows[data.row.index]?.isAtRisk && data.column.index <= 1) {
          data.cell.styles.fillColor = [254, 242, 242];
        }
      },
    });

    doc.save(`تقرير_الحضور_الأسبوعي_${dateFrom}_${dateTo}.pdf`);
  };

  if (studentRows.length === 0) return null;

  const atRiskCount = studentRows.filter((s) => s.isAtRisk).length;

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body * { visibility: hidden !important; }
          #weekly-attendance-print-area,
          #weekly-attendance-print-area * { visibility: visible !important; }
          #weekly-attendance-print-area {
            position: absolute; top: 0; right: 0; left: 0;
            width: 100%; direction: rtl;
          }
          #weekly-attendance-print-area table {
            width: 100% !important;
            font-size: 10px !important;
            page-break-inside: auto;
          }
          #weekly-attendance-print-area th,
          #weekly-attendance-print-area td {
            padding: 3px 4px !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80" dir="rtl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                📊 تقرير الحضور الأسبوعي
                {classDisplayName && <Badge variant="secondary" className="text-xs font-normal">{classDisplayName}</Badge>}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                من {dateFrom} إلى {dateTo} · {totalPeriodsHeld} حصة · الحد: {periodsPerWeek}/أسبوع
              </p>
            </div>
            <div className="flex items-center gap-2 no-print">
              {atRiskCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {atRiskCount} طالب في خطر
                </Badge>
              )}

              {/* Week Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Filter className="h-4 w-4" />
                    الأسابيع ({selectedWeeks.size}/{weeks.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-3" dir="rtl">
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-foreground">اختر الأسابيع للعرض</p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={selectAllWeeks}>تحديد الكل</Button>
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={deselectAllWeeks}>إلغاء الكل</Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {weeks.map((w) => (
                        <label key={w.weekNum} className="flex items-center gap-2 cursor-pointer text-sm">
                          <Checkbox
                            checked={selectedWeeks.has(w.weekNum)}
                            onCheckedChange={() => toggleWeek(w.weekNum)}
                          />
                          <span>الأسبوع {w.weekNum}</span>
                          <span className="text-xs text-muted-foreground mr-auto">({w.dates.length} حصة)</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* View Toggle */}
              {lessonPlans.length > 0 && (
                <div className="flex rounded-lg border border-border/50 overflow-hidden">
                  <button
                    onClick={() => setViewMode("attendance")}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                      viewMode === "attendance" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    الحضور
                  </button>
                  <button
                    onClick={() => setViewMode("lessons")}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                      viewMode === "lessons" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    الدروس
                  </button>
                </div>
              )}

              {/* Print Button */}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                طباعة
              </Button>

              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Upload className="h-4 w-4" />
                    تصدير
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportExcel} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                    <FileText className="h-4 w-4" /> PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div id="weekly-attendance-print-area" ref={printAreaRef} dir="rtl">
            {/* Legend bar - updated for dot system */}
            <div className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-2 mb-3 bg-muted/50">
              <span className="text-xs font-bold text-muted-foreground">مفتاح الرموز</span>
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span style={{ color: "#ef4444", fontSize: 14 }}>●</span>
                  = حصة غياب واحدة
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span style={{ color: "#ef4444", fontSize: 14 }}>●●</span>
                  = حصتا غياب
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span style={{ color: "#ef4444", fontSize: 14 }}>●●●</span>
                  = ثلاث حصص غياب
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span style={{ color: "#d1d5db", fontSize: 14 }}>—</span>
                  = لا غياب
                </span>
              </div>
            </div>

            {/* Table: RTL flow: [م] -> [اسم الطالب] -> [الأسبوع 1] -> [الأسبوع 2] -> ... */}
            <div ref={tableRef} className="overflow-auto rounded-lg border border-border/40 max-h-[600px]">
              <table className="w-full border-collapse" dir="rtl" style={{ fontSize: 13 }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted">
                    <th
                      className="border border-border/30 px-1 py-2.5 text-center font-bold text-muted-foreground bg-muted"
                      style={{ width: 28, maxWidth: 28 }}
                    >م</th>
                    <th
                      className="border border-border/30 px-3 py-2.5 text-right font-bold text-muted-foreground bg-muted"
                      style={{ minWidth: 140 }}
                    >اسم الطالب</th>
                    {filteredWeeks.map((w) => (
                      <th
                        key={w.weekNum}
                        className="border border-border/30 px-2 py-2 text-center font-bold bg-muted text-foreground"
                        style={{ minWidth: 70 }}
                      >
                        الأسبوع {w.weekNum}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((s, idx) => (
                    <tr
                      key={s.id}
                      className={cn(
                        s.isAtRisk ? "bg-destructive/10" : idx % 2 === 0 ? "bg-card" : "bg-muted/30",
                      )}
                    >
                      <td className="border border-border/20 px-1 py-2.5 text-center text-foreground font-semibold" style={{ width: 28, maxWidth: 28 }}>{idx + 1}</td>
                      <td className="border border-border/20 px-4 py-2.5 text-right font-bold whitespace-nowrap text-foreground">
                        {s.name}
                        {s.isAtRisk && <AlertTriangle className="inline h-3.5 w-3.5 mr-1.5 text-destructive" />}
                      </td>
                      {filteredWeeks.map((w) => {
                        if (viewMode === "lessons") {
                          // Lessons view: show first lesson of that week
                          const dayIndex = 0;
                          const slotInDay = 0;
                          const lessonKey = `${w.weekNum}-${dayIndex}-${slotInDay}`;
                          const lesson = lessonLookup.get(lessonKey);
                          const handleSlotClick = () => {
                            setSlotDialog({ open: true, weekNum: w.weekNum, dayIndex, slotIndex: slotInDay, lesson: lesson || null });
                          };
                          return (
                            <td
                              key={w.weekNum}
                              className="border border-border/15 text-center cursor-pointer hover:bg-primary/5"
                              style={{ padding: "6px 4px", minWidth: 60 }}
                              onClick={handleSlotClick}
                              title={lesson?.lesson_title || undefined}
                            >
                              {lesson ? (
                                <span className={cn("text-[10px] leading-tight block truncate max-w-[80px] mx-auto", lesson.is_completed ? "text-primary font-bold" : "text-foreground")}>
                                  {lesson.lesson_title}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        }

                        // Attendance view: red dots for absent sessions
                        const absentCount = countAbsent(s, w.weekNum);
                        return (
                          <td
                            key={w.weekNum}
                            className="border border-border/15 text-center"
                            style={{ padding: "6px 4px", minWidth: 60 }}
                          >
                            {absentCount > 0 ? (
                              <AbsentDots count={absentCount} />
                            ) : (
                              <span style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1 }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 no-print">
            {[
              { label: "إجمالي الحضور", value: studentRows.reduce((a, s) => a + s.totalPresent, 0), color: "#22c55e" },
              { label: "إجمالي الغياب", value: studentRows.reduce((a, s) => a + s.totalAbsent, 0), color: "#ef4444" },
              { label: "إجمالي التأخر", value: studentRows.reduce((a, s) => a + s.totalLate, 0), color: "#f59e0b" },
              { label: "إجمالي الاستئذان", value: studentRows.reduce((a, s) => a + s.totalExcused, 0), color: "#3b82f6" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-border/40 p-3 text-center"
                style={{ borderTop: `3px solid ${stat.color}` }}
              >
                <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {atRiskCount > 0 && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2 text-sm no-print">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <span className="text-destructive font-medium">
                {atRiskCount} طالب تجاوز نسبة الغياب {Math.round(alertThreshold * 100)}% من إجمالي الحصص المنعقدة
              </span>
            </div>
          )}
        </CardContent>

        <LessonSlotDialog
          open={slotDialog.open}
          onOpenChange={(open) => setSlotDialog((prev) => ({ ...prev, open }))}
          lesson={slotDialog.lesson}
          weekNum={slotDialog.weekNum}
          dayIndex={slotDialog.dayIndex}
          slotIndex={slotDialog.slotIndex}
          onUpdated={() => onLessonUpdated?.()}
        />
      </Card>
    </>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}
