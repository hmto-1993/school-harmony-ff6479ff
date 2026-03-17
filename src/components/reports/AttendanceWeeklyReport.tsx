import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, FileSpreadsheet, Upload, Settings2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { safeWriteXLSX, safeSavePDF } from "@/lib/download-utils";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";


interface AttendanceRecord {
  student_name: string;
  student_id?: string;
  date: string;
  status: string;
  notes: string | null;
}


interface Props {
  attendanceData: AttendanceRecord[];
  students: { id: string; full_name: string }[];
  periodsPerWeek: number;
  dateFrom: string;
  dateTo: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { color: string; printColor: string; label: string; dotChar: string }> = {
  present:    { color: "#4caf50", printColor: "#66bb6a", label: "حاضر",      dotChar: "●" },
  absent:     { color: "#e53935", printColor: "#ef5350", label: "غائب",      dotChar: "●" },
  sick_leave: { color: "#1e88e5", printColor: "#42a5f5", label: "مستأذن",    dotChar: "●" },
  late:       { color: "#fbc02d", printColor: "#ffca28", label: "متأخر",     dotChar: "●" },
  early_leave:{ color: "#1e88e5", printColor: "#42a5f5", label: "خروج مبكر", dotChar: "●" },
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

function getWeekNumber(date: Date, startDate: Date, academicGetWeek?: (d: Date) => number | null): number {
  // Use academic calendar week if available
  if (academicGetWeek) {
    const aw = academicGetWeek(date);
    if (aw !== null) return aw;
  }
  const diffTime = date.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

export default function AttendanceWeeklyReport({
  attendanceData,
  students,
  periodsPerWeek,
  dateFrom,
  dateTo,
  className: classDisplayName,
}: Props) {
  const { getWeekForDate, getWeeksInfo, currentWeek } = useAcademicWeek();
  const tableRef = useRef<HTMLDivElement>(null);
  const didInitializeWeekSelectionRef = useRef(false);
  const [alertThreshold, setAlertThreshold] = useState(DEFAULT_ALERT_THRESHOLD);
  const [selectedWeeks, setSelectedWeeks] = useState<Set<number | "all">>(new Set());

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


  const { weeks, studentRows, totalPeriodsHeld } = useMemo(() => {
    const fromDate = new Date(dateFrom);
    const dateSet = new Set(attendanceData.map((r) => r.date));
    const allDates = Array.from(dateSet).sort();

    const weekMap = new Map<number, string[]>();
    allDates.forEach((d) => {
      const wn = getWeekNumber(new Date(d), fromDate, getWeekForDate);
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
  }, [attendanceData, students, periodsPerWeek, dateFrom, dateTo, alertThreshold, getWeekForDate]);

  // All academic weeks for the selector
  const academicWeeks = useMemo(() => getWeeksInfo(), [getWeeksInfo]);

  // Initialize filter to current week on first load
  useEffect(() => {
    if (didInitializeWeekSelectionRef.current) return;

    const availableWeekNums = academicWeeks.length > 0
      ? academicWeeks.map((aw) => aw.weekNumber)
      : weeks.map((w) => w.weekNum);

    if (availableWeekNums.length === 0) return;

    const initialWeek = currentWeek && availableWeekNums.includes(currentWeek)
      ? currentWeek
      : availableWeekNums[0];

    setSelectedWeeks(new Set<number | "all">([initialWeek]));
    didInitializeWeekSelectionRef.current = true;
  }, [academicWeeks, weeks, currentWeek]);

  // When "all" is selected, show ALL academic calendar weeks (even without data)
  const filteredWeeks = useMemo(() => {
    if (selectedWeeks.has("all")) {
      // Use all academic weeks if available
      if (academicWeeks.length > 0) {
        return academicWeeks.map(aw => {
          const existing = weeks.find(w => w.weekNum === aw.weekNumber);
          return existing || { weekNum: aw.weekNumber, dates: [] };
        });
      }
      return weeks;
    }
    // For individual selection, include weeks even without data
    const result: WeekData[] = [];
    const sortedSelected = Array.from(selectedWeeks).filter((v): v is number => typeof v === "number").sort((a, b) => a - b);
    for (const wn of sortedSelected) {
      const existing = weeks.find(w => w.weekNum === wn);
      result.push(existing || { weekNum: wn, dates: [] });
    }
    return result;
  }, [weeks, selectedWeeks, academicWeeks]);

  const toggleWeek = (weekNum: number) => {
    setSelectedWeeks(prev => {
      const next = new Set(prev);
      next.delete("all"); // Remove "all" when toggling individual weeks
      if (next.has(weekNum)) next.delete(weekNum);
      else next.add(weekNum);
      // If user selected all weeks manually, switch to "all" (only when there are 2+ weeks)
      const allWeekNums = academicWeeks.length > 0
        ? academicWeeks.map((aw) => aw.weekNumber)
        : weeks.map((w) => w.weekNum);
      const selectedWeekCount = Array.from(next).filter((v): v is number => typeof v === "number").length;
      if (allWeekNums.length > 1 && selectedWeekCount === allWeekNums.length && allWeekNums.every((wn) => next.has(wn))) {
        return new Set<number | "all">(["all"]);
      }
      return next;
    });
  };

  const selectAllWeeks = () => setSelectedWeeks(new Set<number | "all">(["all"]));
  const deselectAllWeeks = () => setSelectedWeeks(new Set());

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const exportWeeks = filteredWeeks;
    const headers = [
      "م", "اسم الطالب",
      ...exportWeeks.flatMap((w) => {
        const colCount = w.dates.length > 0 ? Math.min(w.dates.length, periodsPerWeek) : 1;
        return Array.from({ length: colCount }, (_, i) => `أ${w.weekNum}-${i + 1}`);
      }),
      "حاضر", "غائب", "متأخر", "معذور", "تنبيه",
    ];
    const rows = studentRows.map((s, idx) => {
      const row: Record<string, any> = { "م": idx + 1, "اسم الطالب": s.name };
      exportWeeks.forEach((w) => {
        const slots = s.weeks[w.weekNum] || [];
        const colCount = w.dates.length > 0 ? Math.min(w.dates.length, periodsPerWeek) : 1;
        for (let i = 0; i < colCount; i++) {
          const st = slots[i];
          row[`أ${w.weekNum}-${i + 1}`] = st ? STATUS_CONFIG[st]?.label || st : "";
        }
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
    safeWriteXLSX(wb, `تقرير_الحضور_الأسبوعي_${dateFrom}_${dateTo}.xlsx`);
  };

  const handleExportPDF = async () => {
    const { createArabicPDF, getArabicTableStyles, finalizePDF } = await import("@/lib/arabic-pdf");
    const autoTableImport = await import("jspdf-autotable");
    const autoTable = autoTableImport.default;
    const { doc, startY, watermark } = await createArabicPDF({ orientation: "landscape", reportType: "attendance", includeHeader: true });
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
      { label: "حاضر", color: [34, 197, 94] },
      { label: "غائب", color: [239, 68, 68] },
      { label: "مستأذن", color: [59, 130, 246] },
      { label: "متأخر", color: [245, 158, 11] },
    ];
    let lx = pageWidth - 14;
    doc.text("مفتاح الرموز", lx, legendY, { align: "right" });
    lx -= doc.getTextWidth("مفتاح الرموز") + 6;
    legendEntries.forEach((e) => {
      doc.setFillColor(e.color[0], e.color[1], e.color[2]);
      doc.circle(lx, legendY - 1.2, 1.5, "F");
      lx -= 4;
      doc.setTextColor(60, 60, 60);
      doc.text(e.label, lx, legendY, { align: "right" });
      lx -= doc.getTextWidth(e.label) + 6;
    });
    doc.setTextColor(0, 0, 0);

    const exportWeeks = filteredWeeks;

    // Calculate optimal name column width based on longest name
    doc.setFont("Amiri", "bold");
    doc.setFontSize(9);
    const longestName = studentRows.reduce((max, s) => {
      const nameText = s.isAtRisk ? `${s.name} ⚠ تجاوز ${Math.round(alertThreshold * 100)}%` : s.name;
      return nameText.length > max.length ? nameText : max;
    }, "");
    const nameColWidth = Math.min(doc.getTextWidth(longestName) + 6, 70);
    doc.setFont("Amiri", "normal");

    const weekGroupHeaders = exportWeeks.map((w) => ({
      content: "",
      _weekLabel: `الأسبوع ${w.weekNum}`,
      colSpan: w.dates.length > 0 ? Math.min(w.dates.length, periodsPerWeek) : 1,
      styles: { halign: "center" as const, fillColor: [233, 236, 239] as [number, number, number], textColor: [73, 80, 87] as [number, number, number], fontSize: 7, minCellHeight: 18 },
    }));

    const summaryHeaders = [
      { content: "", styles: { halign: "center" as const, fillColor: [233, 236, 239] as [number, number, number], fontSize: 8, cellWidth: 8 } },
      { content: "", styles: { halign: "center" as const, fillColor: [233, 236, 239] as [number, number, number], fontSize: 8, cellWidth: 8 } },
      { content: "", styles: { halign: "center" as const, fillColor: [233, 236, 239] as [number, number, number], fontSize: 8, cellWidth: 8 } },
    ];

    // Store reversed week headers for vertical text rendering
    const reversedWeekHeaders = weekGroupHeaders.slice().reverse();
    
    // Build a map of header cell column indices to week labels
    const weekLabelMap = new Map<number, string>();
    {
      // First 3 cols are summary dots, then week cols, then name + #
      // In the head array: summaryHeaders(3) + reversedWeekHeaders + name + #
      // Column indices: 0,1,2 = summary; 3..3+reversedWeekHeaders.length-1 = weeks
      let colIdx = 3;
      reversedWeekHeaders.forEach((wh: any) => {
        weekLabelMap.set(colIdx, wh._weekLabel);
        colIdx += wh.colSpan;
      });
    }

    const head = [[
      ...summaryHeaders,
      ...reversedWeekHeaders,
      { content: "اسم الطالب", styles: { halign: "right" as const, cellWidth: nameColWidth } },
      { content: "م", styles: { halign: "center" as const, cellWidth: 8 } },
    ]];

    // Build a map of cell positions to dot colors for didDrawCell
    const dotColorMap = new Map<string, [number, number, number]>();

    const body = studentRows.map((s, idx) => {
      const statusCells = exportWeeks.slice().reverse().flatMap((w) => {
        const slots = s.weeks[w.weekNum] || [];
        const colCount = w.dates.length > 0 ? Math.min(w.dates.length, periodsPerWeek) : 1;
        return Array.from({ length: colCount }, (_, i) => {
          const st = slots[i];
          const cfg = st ? STATUS_CONFIG[st] : null;
          return { content: "", styles: { halign: "center" as const, fontSize: 7 }, _dotColor: cfg ? hexToRgb(cfg.printColor) : [210, 215, 220] as [number, number, number] };
        });
      });

      const nameContent = s.isAtRisk ? `${s.name}\n⚠ تجاوز ${Math.round(alertThreshold * 100)}%` : s.name;

      const row = [
        { content: String(s.totalLate), styles: { halign: "center" as const, fontSize: 8, textColor: hexToRgb("#d97706") as [number, number, number] } },
        { content: String(s.totalAbsent), styles: { halign: "center" as const, fontSize: 8, textColor: hexToRgb("#e53935") as [number, number, number] } },
        { content: String(s.totalPresent), styles: { halign: "center" as const, fontSize: 8, textColor: hexToRgb("#4caf50") as [number, number, number] } },
        ...statusCells,
        { content: nameContent, styles: { halign: "right" as const, fontStyle: "bold" as const, fontSize: 9, cellWidth: nameColWidth } },
        { content: String(idx + 1), styles: { halign: "center" as const, fontStyle: "bold" as const, cellWidth: 8 } },
      ];

      // Store dot colors by row/col for drawing later
      statusCells.forEach((cell: any, ci: number) => {
        if (cell._dotColor) {
          dotColorMap.set(`${idx}-${ci + 3}`, cell._dotColor);
        }
      });

      return row;
    });

    autoTable(doc, {
      startY: legendY + 5,
      head, body,
      ...tableStyles,
      margin: { left: 10, right: 10 },
      tableWidth: "auto",
      styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 1.5, lineColor: [206, 212, 218], lineWidth: 0.3 },
      headStyles: { ...tableStyles.headStyles, fontSize: 7, fillColor: [233, 236, 239], textColor: [73, 80, 87] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      didParseCell: (data: any) => {
        if (data.section === "body" && studentRows[data.row.index]?.isAtRisk && data.column.index <= 1) {
          data.cell.styles.fillColor = [254, 242, 242];
        }
      },
      didDrawCell: (data: any) => {
        if (data.section === "body") {
          const key = `${data.row.index}-${data.column.index}`;
          const color = dotColorMap.get(key);
          if (color) {
            const cx = data.cell.x + data.cell.width / 2;
            const cy = data.cell.y + data.cell.height / 2;
            doc.setFillColor(color[0], color[1], color[2]);
            doc.circle(cx, cy, 1.3, "F");
          }
        }
        // Draw colored dots in header summary columns too
        if (data.section === "head" && data.row.index === 0) {
          const headerDotColors: Record<number, [number, number, number]> = {
            0: hexToRgb("#fbc02d"),
            1: hexToRgb("#e53935"),
            2: hexToRgb("#4caf50"),
          };
          const hColor = headerDotColors[data.column.index];
          if (hColor) {
            const cx = data.cell.x + data.cell.width / 2;
            const cy = data.cell.y + data.cell.height / 2;
            doc.setFillColor(hColor[0], hColor[1], hColor[2]);
            doc.circle(cx, cy, 1.5, "F");
          }
        }
      },
    });

    finalizePDF(doc, `تقرير_الحضور_الأسبوعي_${dateFrom}_${dateTo}.pdf`, watermark);
  };

  // Print removed per user request

  if (studentRows.length === 0) return null;

  const atRiskCount = studentRows.filter((s) => s.isAtRisk).length;
  const slotsPerWeek = periodsPerWeek;

  return (
    <>
      <Card className="weekly-attendance-report border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-2 print:hidden">
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
            <div className="flex items-center gap-2">
              {atRiskCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {atRiskCount} طالب في خطر
                </Badge>
              )}
              {/* Week selector popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Settings2 className="h-4 w-4" />
                    الأسابيع ({selectedWeeks.has("all") ? "الجميع" : `${selectedWeeks.size}/${academicWeeks.length || weeks.length}`})
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-3" dir="rtl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">اختر الأسابيع</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={selectAllWeeks}>الكل</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={deselectAllWeeks}>لا شيء</Button>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-auto">
                    {/* "All" option */}
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 font-semibold border-b border-border pb-1.5 mb-1">
                      <Checkbox
                        checked={selectedWeeks.has("all")}
                        onCheckedChange={() => selectAllWeeks()}
                      />
                      الجميع
                    </label>
                    {/* Show all academic weeks if available, otherwise data weeks */}
                    {(academicWeeks.length > 0 ? academicWeeks.map(aw => ({
                      weekNum: aw.weekNumber,
                      hasData: weeks.some(w => w.weekNum === aw.weekNumber),
                      label: aw.type !== "normal" ? aw.label : undefined,
                    })) : weeks.map(w => ({ weekNum: w.weekNum, hasData: true, label: undefined }))).map(w => (
                      <label key={w.weekNum} className={cn(
                        "flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5",
                        !w.hasData && "opacity-50"
                      )}>
                        <Checkbox
                          checked={selectedWeeks.has("all") || selectedWeeks.has(w.weekNum)}
                          onCheckedChange={() => toggleWeek(w.weekNum)}
                        />
                        <span>الأسبوع {w.weekNum}</span>
                        {w.label && <span className="text-[10px] text-muted-foreground mr-auto">{w.label}</span>}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
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
          {/* ===== PRINT HEADER (hidden on screen) ===== */}
          <div className="hidden print:block mb-4">
            <div className="text-center mb-2">
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>تقرير الحضور الأسبوعي</h1>
              <p style={{ fontSize: 13, margin: "4px 0 0", color: "#555" }}>
                {classDisplayName} — من {dateFrom} إلى {dateTo}
              </p>
            </div>
          </div>

          {/* ===== LEGEND BAR ===== */}
          <div
            className="attendance-legend flex items-center justify-between rounded-md px-4 py-2 mb-3"
            dir="rtl"
            style={{
              background: "#f8f9fa",
              border: "1px solid #dee2e6",
            }}
          >
            <span className="text-xs font-bold" style={{ color: "#495057" }}>مفتاح الرموز</span>
            <div className="flex items-center gap-6">
              {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "early_leave").map(([key, val]) => (
                <span key={key} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#495057" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      backgroundColor: val.color,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1,
                      border: "2px solid rgba(0,0,0,0.15)",
                    }}
                  >
                    {key === "present" ? "✓" : key === "absent" ? "✕" : key === "late" ? "!" : "⏎"}
                  </span>
                  {val.label}
                </span>
              ))}
            </div>
          </div>

          {/* ===== TABLE ===== */}
          <div ref={tableRef} className="overflow-auto rounded-md max-h-[600px] print:max-h-none print:overflow-visible attendance-table-wrapper">
            <table
              className="w-full attendance-logbook-table"
              dir="rtl"
              style={{
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead className="sticky top-0 z-10 print:sticky-none">
                {/* Week group header row */}
                <tr>
                  <th
                    className="logbook-th"
                    rowSpan={2}
                    style={{ minWidth: 32, width: 36 }}
                  >م</th>
                  <th
                    className="logbook-th"
                    rowSpan={2}
                    style={{ textAlign: "right", whiteSpace: "nowrap" }}
                  >اسم الطالب</th>
                  {filteredWeeks.map((w) => (
                    <th
                      key={w.weekNum}
                      colSpan={slotsPerWeek}
                      className="logbook-th logbook-th-week"
                    >
                      <span className="logbook-week-label">الأسبوع {w.weekNum}</span>
                    </th>
                  ))}
                  <th className="logbook-th logbook-th-total" rowSpan={2}><span className="summary-dot" style={{ backgroundColor: "#4caf50" }}>●</span></th>
                  <th className="logbook-th logbook-th-total" rowSpan={2}><span className="summary-dot" style={{ backgroundColor: "#e53935" }}>●</span></th>
                  <th className="logbook-th logbook-th-total" rowSpan={2}><span className="summary-dot" style={{ backgroundColor: "#fbc02d" }}>●</span></th>
                </tr>
                {/* Session sub-header row */}
                <tr>
                  {filteredWeeks.map((w) =>
                    Array.from({ length: slotsPerWeek }, (_, i) => (
                      <th
                        key={`${w.weekNum}-s${i}`}
                        className="logbook-th logbook-th-session"
                      >
                        {i + 1}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {studentRows.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={cn(
                      s.isAtRisk ? "logbook-row-risk" : idx % 2 === 0 ? "logbook-row-even" : "logbook-row-odd",
                    )}
                  >
                    <td className="logbook-td logbook-td-num">{idx + 1}</td>
                    <td className="logbook-td logbook-td-name">
                      <span>{s.name}</span>
                      {s.isAtRisk && (
                        <span className="block text-[10px] mt-0.5" style={{ color: "#ef4444" }}>
                          <AlertTriangle className="inline h-3 w-3 ml-0.5" style={{ color: "#ef4444" }} />
                          تجاوز {Math.round(alertThreshold * 100)}%
                        </span>
                      )}
                    </td>
                    {filteredWeeks.map((w) =>
                      Array.from({ length: slotsPerWeek }, (_, i) => {
                        const status = s.weeks[w.weekNum]?.[i];
                        const cfg = status ? STATUS_CONFIG[status] : null;

                        return (
                          <td
                            key={`${w.weekNum}-${i}`}
                            className="logbook-td logbook-td-dot"
                          >
                            <span
                              className="session-dot"
                              style={{
                                backgroundColor: cfg ? cfg.color : "#e5e0d0",
                                borderColor: cfg ? cfg.color : "#ccc5b0",
                              }}
                            >
                              {cfg ? (
                                status === "present" ? "✓" : status === "absent" ? "✕" : status === "late" ? "!" : "⏎"
                              ) : ""}
                            </span>
                          </td>
                        );
                      })
                    )}
                    <td className="logbook-td logbook-td-total" style={{ color: "#16a34a", fontWeight: 700 }}>{s.totalPresent}</td>
                    <td className="logbook-td logbook-td-total" style={{ color: "#dc2626", fontWeight: 700 }}>{s.totalAbsent}</td>
                    <td className="logbook-td logbook-td-total" style={{ color: "#d97706", fontWeight: 700 }}>{s.totalLate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===== SUMMARY STATS (screen only) ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 print:hidden">
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
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2 text-sm print:hidden">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <span className="text-destructive font-medium">
                {atRiskCount} طالب تجاوز نسبة الغياب {Math.round(alertThreshold * 100)}% من إجمالي الحصص المنعقدة
              </span>
            </div>
          )}
        </CardContent>

      </Card>

      {/* ===== LOGBOOK STYLES ===== */}
      <style>{`
        /* Logbook table styling */
        .logbook-th {
          background: #e9ecef;
          color: #495057;
          font-weight: 700;
          text-align: center;
          padding: 8px 6px;
          border: 1.5px solid #ced4da;
          font-size: 13px;
          white-space: nowrap;
        }
        .logbook-th-week {
          background: #dee2e6;
          font-size: 11px;
          letter-spacing: 0 !important;
          padding: 2px;
          position: relative;
          height: 60px;
        }
        .logbook-week-label {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          display: inline-block;
          white-space: nowrap;
          font-size: 11px;
          line-height: 1;
        }
        .logbook-th-session {
          background: #e9ecef;
          font-size: 10px;
          padding: 3px 2px;
          min-width: 24px;
          width: 24px;
          color: #868e96;
          border: 1.5px solid #ced4da;
        }
        .logbook-th-total {
          background: #e9ecef;
          font-size: 11px;
          min-width: 22px;
          width: 22px;
          font-weight: 800;
          padding: 2px 1px;
        }
        .logbook-td {
          border: 1px solid #dee2e6;
          padding: 4px 3px;
          text-align: center;
          vertical-align: middle;
        }
        .logbook-td-num {
          font-weight: 700;
          color: #495057;
          width: 32px;
          background: #f8f9fa;
          font-size: 13px;
        }
        .logbook-td-name {
          text-align: right;
          padding-right: 8px;
          padding-left: 4px;
          font-weight: 600;
          color: #212529;
          white-space: nowrap;
          background: #f8f9fa;
          font-size: 13px;
          width: 1%;
          line-height: 1.3;
        }
        .logbook-td-dot {
          padding: 3px 1px;
          min-width: 24px;
        }
        .logbook-td-total {
          background: #f8f9fa;
          font-size: 11px;
          min-width: 22px;
          width: 22px;
          padding: 2px 1px;
        }
        .summary-dot {
          color: transparent;
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          vertical-align: middle;
        }
        .logbook-row-even { background: #ffffff; }
        .logbook-row-odd  { background: #f8f9fa; }
        .logbook-row-risk { background: #fff5f5; }
        .logbook-row-risk .logbook-td-name,
        .logbook-row-risk .logbook-td-num {
          background: #fff5f5;
        }

        /* Session dot circle */
        .session-dot {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: none;
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          line-height: 1;
        }

        /* Legend print styling */
        .attendance-legend { print-color-adjust: exact; -webkit-print-color-adjust: exact; }

        /* ===== PRINT STYLES ===== */
        @media print {
          .weekly-attendance-report {
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            backdrop-filter: none !important;
          }
          .attendance-table-wrapper {
            max-height: none !important;
            overflow: visible !important;
          }
          .logbook-th, .logbook-th-week, .logbook-th-session,
          .logbook-td, .logbook-td-num, .logbook-td-name,
          .logbook-row-even, .logbook-row-odd, .logbook-row-risk,
          .session-dot, .attendance-legend {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          thead { position: static !important; }
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          /* Hide browser header/footer */
          @page { margin-top: 5mm; margin-bottom: 5mm; }
        }
      `}</style>
    </>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}
