import { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, FileSpreadsheet, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  student_name: string;
  student_id?: string;
  date: string;
  status: string;
  notes: string | null;
}

interface ClassSchedule {
  periodsPerWeek: number;
}

interface Props {
  attendanceData: AttendanceRecord[];
  students: { id: string; full_name: string }[];
  periodsPerWeek: number;
  dateFrom: string;
  dateTo: string;
  className?: string;
}

const STATUS_SYMBOLS: Record<string, { symbol: string; color: string; bg: string; label: string }> = {
  present: { symbol: "✓", color: "#059669", bg: "#ecfdf5", label: "حاضر" },
  absent: { symbol: "✗", color: "#dc2626", bg: "#fef2f2", label: "غائب" },
  late: { symbol: "⧖", color: "#d97706", bg: "#fffbeb", label: "متأخر" },
  early_leave: { symbol: "↩", color: "#2563eb", bg: "#eff6ff", label: "خروج مبكر" },
  sick_leave: { symbol: "⊕", color: "#7c3aed", bg: "#f5f3ff", label: "إجازة مرضية" },
};

const ALERT_THRESHOLD = 0.2; // 20%

interface WeekData {
  weekNum: number;
  dates: string[];
}

interface StudentRow {
  id: string;
  name: string;
  weeks: Record<number, (string | null)[]>; // weekNum -> array of statuses per slot
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

export default function AttendanceWeeklyReport({
  attendanceData,
  students,
  periodsPerWeek,
  dateFrom,
  dateTo,
  className: classDisplayName,
}: Props) {
  const tableRef = useRef<HTMLDivElement>(null);

  const { weeks, studentRows, totalPeriodsHeld } = useMemo(() => {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    // Group attendance by date to know which dates had sessions
    const dateSet = new Set(attendanceData.map((r) => r.date));
    const allDates = Array.from(dateSet).sort();

    // Group dates into weeks
    const weekMap = new Map<number, string[]>();
    allDates.forEach((d) => {
      const wn = getWeekNumber(new Date(d), fromDate);
      if (!weekMap.has(wn)) weekMap.set(wn, []);
      weekMap.get(wn)!.push(d);
    });

    const weeks: WeekData[] = Array.from(weekMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([weekNum, dates]) => ({ weekNum, dates }));

    const totalPeriodsHeld = allDates.length; // Each unique date = 1 period

    // Build student-level data
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
        // Pad remaining slots to periodsPerWeek
        while (slots.length < periodsPerWeek) slots.push(null);
        weeksData[w.weekNum] = slots;
      });

      const isAtRisk = totalPeriodsHeld > 0 && totalAbsent / totalPeriodsHeld > ALERT_THRESHOLD;

      return {
        id: s.id,
        name: s.full_name,
        weeks: weeksData,
        totalPresent,
        totalAbsent,
        totalLate,
        totalExcused,
        totalPeriods: totalPeriodsHeld,
        isAtRisk,
      };
    });

    return { weeks, studentRows, totalPeriodsHeld };
  }, [attendanceData, students, periodsPerWeek, dateFrom, dateTo]);

  // Export functions
  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const headers = [
      "#",
      "اسم الطالب",
      ...weeks.flatMap((w) =>
        Array.from({ length: periodsPerWeek }, (_, i) => `أ${w.weekNum}-${i + 1}`)
      ),
      "حاضر",
      "غائب",
      "متأخر",
      "معذور",
      "تنبيه",
    ];
    const rows = studentRows.map((s, idx) => {
      const row: Record<string, any> = {
        "#": idx + 1,
        "اسم الطالب": s.name,
      };
      weeks.forEach((w) => {
        const slots = s.weeks[w.weekNum] || [];
        for (let i = 0; i < periodsPerWeek; i++) {
          const key = `أ${w.weekNum}-${i + 1}`;
          const st = slots[i];
          row[key] = st ? STATUS_SYMBOLS[st]?.label || st : "";
        }
      });
      row["حاضر"] = s.totalPresent;
      row["غائب"] = s.totalAbsent;
      row["متأخر"] = s.totalLate;
      row["معذور"] = s.totalExcused;
      row["تنبيه"] = s.isAtRisk ? "⚠ تجاوز 20%" : "";
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

    // Legend
    doc.setFontSize(7);
    const legendY = startY + 11;
    const legendItems = Object.values(STATUS_SYMBOLS);
    let legendX = pageWidth - 14;
    legendItems.forEach((item) => {
      const text = `${item.symbol} ${item.label}`;
      doc.setTextColor(item.color);
      doc.text(text, legendX, legendY, { align: "right" });
      legendX -= doc.getTextWidth(text) + 8;
    });
    doc.setTextColor(0, 0, 0);

    // Build table
    const weekHeaders = weeks.flatMap((w) =>
      Array.from({ length: Math.min(w.dates.length, periodsPerWeek) }, (_, i) => `${i + 1}`)
    );
    const weekGroupHeaders = weeks.map((w) => ({
      content: `أسبوع ${w.weekNum}`,
      colSpan: Math.min(w.dates.length, periodsPerWeek),
      styles: { halign: "center" as const, fillColor: [59, 130, 246] as [number, number, number], fontSize: 7 },
    }));

    const head = [
      [
        { content: "#", styles: { halign: "center" as const } },
        { content: "الطالب", styles: { halign: "right" as const } },
        ...weekGroupHeaders,
        { content: "حاضر", styles: { halign: "center" as const, fillColor: [16, 185, 129] as [number, number, number] } },
        { content: "غائب", styles: { halign: "center" as const, fillColor: [239, 68, 68] as [number, number, number] } },
        { content: "متأخر", styles: { halign: "center" as const, fillColor: [245, 158, 11] as [number, number, number] } },
        { content: "معذور", styles: { halign: "center" as const, fillColor: [124, 58, 237] as [number, number, number] } },
      ],
    ];

    const body = studentRows.map((s, idx) => {
      const statusCells = weeks.flatMap((w) => {
        const slots = s.weeks[w.weekNum] || [];
        return Array.from({ length: Math.min(w.dates.length, periodsPerWeek) }, (_, i) => {
          const st = slots[i];
          return st ? STATUS_SYMBOLS[st]?.symbol || "" : "";
        });
      });

      return [
        { content: String(idx + 1), styles: { halign: "center" as const } },
        { content: s.name, styles: { halign: "right" as const, fontStyle: "bold" as const } },
        ...statusCells.map((sym) => ({
          content: sym,
          styles: {
            halign: "center" as const,
            fontSize: 8,
            textColor: (sym === "✓" ? [16, 185, 129] : sym === "✗" ? [239, 68, 68] : sym === "⧖" ? [245, 158, 11] : [100, 100, 100]) as [number, number, number],
          },
        })),
        { content: String(s.totalPresent), styles: { halign: "center" as const, fontStyle: "bold" as const, textColor: [16, 185, 129] as [number, number, number] } },
        { content: String(s.totalAbsent), styles: { halign: "center" as const, fontStyle: "bold" as const, textColor: (s.isAtRisk ? [255, 255, 255] : [239, 68, 68]) as [number, number, number], fillColor: s.isAtRisk ? [239, 68, 68] as [number, number, number] : undefined } },
        { content: String(s.totalLate), styles: { halign: "center" as const, fontStyle: "bold" as const, textColor: [245, 158, 11] as [number, number, number] } },
        { content: String(s.totalExcused), styles: { halign: "center" as const, fontStyle: "bold" as const, textColor: [124, 58, 237] as [number, number, number] } },
      ];
    });

    autoTable(doc, {
      startY: legendY + 4,
      head,
      body,
      ...tableStyles,
      styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 1.5 },
      headStyles: { ...tableStyles.headStyles, fontSize: 7 },
      didParseCell: (data: any) => {
        // Highlight at-risk rows
        if (data.section === "body") {
          const rowIdx = data.row.index;
          if (studentRows[rowIdx]?.isAtRisk) {
            if (data.column.index <= 1) {
              data.cell.styles.fillColor = [254, 242, 242];
            }
          }
        }
      },
    });

    doc.save(`تقرير_الحضور_الأسبوعي_${dateFrom}_${dateTo}.pdf`);
  };

  if (studentRows.length === 0) return null;

  const atRiskCount = studentRows.filter((s) => s.isAtRisk).length;

  return (
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              📊 تقرير الحضور الأسبوعي
              {classDisplayName && (
                <Badge variant="secondary" className="text-xs font-normal">{classDisplayName}</Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              من {dateFrom} إلى {dateTo} · {totalPeriodsHeld} حصة منعقدة · الحد الأسبوعي: {periodsPerWeek} حصص
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {atRiskCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {atRiskCount} طالب في خطر
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-4 w-4" />
                  تصدير
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                  <FileText className="h-4 w-4" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-3 text-xs print:mb-2">
          {Object.entries(STATUS_SYMBOLS).map(([key, val]) => (
            <span key={key} className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: val.bg, color: val.color }}>
              <span className="font-bold text-sm">{val.symbol}</span>
              {val.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/10 text-destructive">
            <AlertTriangle className="h-3 w-3" />
            تجاوز 20% غياب
          </span>
        </div>

        {/* Table */}
        <div ref={tableRef} className="overflow-auto rounded-xl border border-border/30 max-h-[500px]">
          <table className="w-full text-sm border-collapse" dir="rtl">
            <thead className="sticky top-0 z-10">
              {/* Week group header */}
              <tr style={{ backgroundColor: "#f1f5f9" }}>
                <th className="border-b border-border/30 p-2 text-center text-xs font-semibold text-muted-foreground" rowSpan={2} style={{ minWidth: 32 }}>#</th>
                <th className="border-b border-border/30 p-2 text-right text-xs font-semibold text-muted-foreground" rowSpan={2} style={{ minWidth: 140 }}>اسم الطالب</th>
                {weeks.map((w) => (
                  <th
                    key={w.weekNum}
                    colSpan={periodsPerWeek}
                    className="border-b border-x border-border/30 p-1.5 text-center text-xs font-bold text-primary-foreground"
                    style={{ backgroundColor: "hsl(195, 100%, 42%)" }}
                  >
                    أسبوع {w.weekNum}
                  </th>
                ))}
                <th className="border-b border-border/30 p-1.5 text-center text-xs font-bold" style={{ backgroundColor: "#ecfdf5", color: "#059669", minWidth: 50 }} rowSpan={2}>حاضر</th>
                <th className="border-b border-border/30 p-1.5 text-center text-xs font-bold" style={{ backgroundColor: "#fef2f2", color: "#dc2626", minWidth: 50 }} rowSpan={2}>غائب</th>
                <th className="border-b border-border/30 p-1.5 text-center text-xs font-bold" style={{ backgroundColor: "#fffbeb", color: "#d97706", minWidth: 50 }} rowSpan={2}>متأخر</th>
                <th className="border-b border-border/30 p-1.5 text-center text-xs font-bold" style={{ backgroundColor: "#f5f3ff", color: "#7c3aed", minWidth: 50 }} rowSpan={2}>معذور</th>
              </tr>
              {/* Slot sub-headers */}
              <tr style={{ backgroundColor: "#f8fafc" }}>
                {weeks.map((w) =>
                  Array.from({ length: periodsPerWeek }, (_, i) => (
                    <th key={`${w.weekNum}-${i}`} className="border-b border-x border-border/30 p-1 text-center text-[10px] text-muted-foreground font-medium" style={{ minWidth: 28 }}>
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
                    "transition-colors",
                    s.isAtRisk ? "print:bg-red-50" : idx % 2 === 0 ? "" : ""
                  )}
                  style={s.isAtRisk ? { backgroundColor: "#fef2f2" } : idx % 2 !== 0 ? { backgroundColor: "#f8fafc" } : undefined}
                >
                  <td className="border-b border-border/20 p-1.5 text-center text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="border-b border-border/20 p-2 text-right font-semibold text-sm whitespace-nowrap">
                    {s.name}
                    {s.isAtRisk && <AlertTriangle className="inline h-3.5 w-3.5 mr-1 text-destructive" />}
                  </td>
                  {weeks.map((w) =>
                    Array.from({ length: periodsPerWeek }, (_, i) => {
                      const status = s.weeks[w.weekNum]?.[i];
                      const info = status ? STATUS_SYMBOLS[status] : null;
                      return (
                        <td
                          key={`${w.weekNum}-${i}`}
                          className="border-b border-x border-border/10 p-0.5 text-center"
                          style={info ? { backgroundColor: info.bg, color: info.color } : undefined}
                        >
                          {info && <span className="font-bold text-sm">{info.symbol}</span>}
                        </td>
                      );
                    })
                  )}
                  <td className="border-b border-border/20 p-1.5 text-center font-bold" style={{ color: "#059669" }}>{s.totalPresent}</td>
                  <td className="border-b border-border/20 p-1.5 text-center font-bold" style={{ color: "#dc2626", backgroundColor: s.isAtRisk ? "#fecaca" : undefined }}>{s.totalAbsent}</td>
                  <td className="border-b border-border/20 p-1.5 text-center font-bold" style={{ color: "#d97706" }}>{s.totalLate}</td>
                  <td className="border-b border-border/20 p-1.5 text-center font-bold" style={{ color: "#7c3aed" }}>{s.totalExcused}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
