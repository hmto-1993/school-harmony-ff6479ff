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

interface Props {
  attendanceData: AttendanceRecord[];
  students: { id: string; full_name: string }[];
  periodsPerWeek: number;
  dateFrom: string;
  dateTo: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  present: { color: "#22c55e", label: "حاضر" },
  absent: { color: "#ef4444", label: "غائب" },
  sick_leave: { color: "#3b82f6", label: "مستأذن" },
  late: { color: "#f59e0b", label: "متأخر" },
  early_leave: { color: "#3b82f6", label: "خروج مبكر" },
};

const ALERT_THRESHOLD = 0.2;

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

      const isAtRisk = totalPeriodsHeld > 0 && totalAbsent / totalPeriodsHeld > ALERT_THRESHOLD;

      return {
        id: s.id, name: s.full_name, weeks: weeksData,
        totalPresent, totalAbsent, totalLate, totalExcused,
        totalPeriods: totalPeriodsHeld, isAtRisk,
      };
    });

    return { weeks, studentRows, totalPeriodsHeld };
  }, [attendanceData, students, periodsPerWeek, dateFrom, dateTo]);

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const headers = [
      "م", "اسم الطالب",
      ...weeks.flatMap((w) => Array.from({ length: periodsPerWeek }, (_, i) => `أ${w.weekNum}-${i + 1}`)),
      "حاضر", "غائب", "متأخر", "معذور", "تنبيه",
    ];
    const rows = studentRows.map((s, idx) => {
      const row: Record<string, any> = { "م": idx + 1, "اسم الطالب": s.name };
      weeks.forEach((w) => {
        const slots = s.weeks[w.weekNum] || [];
        for (let i = 0; i < periodsPerWeek; i++) {
          const st = slots[i];
          row[`أ${w.weekNum}-${i + 1}`] = st ? STATUS_CONFIG[st]?.label || st : "";
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

    // Legend bar
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

    const weekGroupHeaders = weeks.map((w) => ({
      content: `الأسبوع ${w.weekNum}`,
      colSpan: Math.min(w.dates.length, periodsPerWeek),
      styles: { halign: "center" as const, fillColor: [230, 236, 244] as [number, number, number], textColor: [50, 50, 50] as [number, number, number], fontSize: 7 },
    }));

    const head = [[
      { content: "م", styles: { halign: "center" as const } },
      { content: "اسم الطالب", styles: { halign: "right" as const } },
      ...weekGroupHeaders,
      { content: "حاضر", styles: { halign: "center" as const, fillColor: [220, 252, 231] as [number, number, number], textColor: [22, 163, 74] as [number, number, number] } },
      { content: "غائب", styles: { halign: "center" as const, fillColor: [254, 226, 226] as [number, number, number], textColor: [220, 38, 38] as [number, number, number] } },
      { content: "متأخر", styles: { halign: "center" as const, fillColor: [254, 249, 195] as [number, number, number], textColor: [161, 98, 7] as [number, number, number] } },
      { content: "معذور", styles: { halign: "center" as const, fillColor: [219, 234, 254] as [number, number, number], textColor: [37, 99, 235] as [number, number, number] } },
    ]];

    const body = studentRows.map((s, idx) => {
      const statusCells = weeks.flatMap((w) => {
        const slots = s.weeks[w.weekNum] || [];
        return Array.from({ length: Math.min(w.dates.length, periodsPerWeek) }, (_, i) => {
          const st = slots[i];
          const cfg = st ? STATUS_CONFIG[st] : null;
          return { content: cfg ? "●" : "", styles: { halign: "center" as const, fontSize: 9, textColor: cfg ? hexToRgb(cfg.color) as [number, number, number] : [200, 200, 200] as [number, number, number] } };
        });
      });
      return [
        { content: String(idx + 1), styles: { halign: "center" as const } },
        { content: s.name, styles: { halign: "right" as const, fontStyle: "bold" as const } },
        ...statusCells,
        { content: String(s.totalPresent), styles: { halign: "center" as const, fontStyle: "bold" as const, textColor: [22, 163, 74] as [number, number, number] } },
        { content: String(s.totalAbsent), styles: { halign: "center" as const, fontStyle: "bold" as const, textColor: (s.isAtRisk ? [255, 255, 255] : [220, 38, 38]) as [number, number, number], fillColor: s.isAtRisk ? [254, 202, 202] as [number, number, number] : undefined } },
        { content: String(s.totalLate), styles: { halign: "center" as const, fontStyle: "bold" as const, textColor: [161, 98, 7] as [number, number, number] } },
        { content: String(s.totalExcused), styles: { halign: "center" as const, fontStyle: "bold" as const, textColor: [37, 99, 235] as [number, number, number] } },
      ];
    });

    autoTable(doc, {
      startY: legendY + 5,
      head, body,
      ...tableStyles,
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
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
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
        {/* Legend bar - matches reference image */}
        <div
          className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-2 mb-3"
          style={{ backgroundColor: "#f8fafc" }}
          dir="rtl"
        >
          <span className="text-xs font-bold text-muted-foreground">مفتاح الرموز</span>
          <div className="flex items-center gap-5">
            {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "early_leave").map(([key, val]) => (
              <span key={key} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#475569" }}>
                <span style={{ color: val.color, fontSize: 18, lineHeight: 1 }}>●</span>
                {val.label}
              </span>
            ))}
          </div>
        </div>

        {/* Table */}
        <div ref={tableRef} className="overflow-auto rounded-lg border border-border/40 max-h-[600px]">
          <table className="w-full border-collapse" dir="rtl" style={{ fontSize: 13 }}>
            <thead className="sticky top-0 z-10">
              <tr style={{ backgroundColor: "#e8ecf1" }}>
                <th
                  className="border border-border/30 px-3 py-2.5 text-center font-bold text-muted-foreground"
                  rowSpan={2}
                  style={{ minWidth: 36, backgroundColor: "#e8ecf1" }}
                >م</th>
                <th
                  className="border border-border/30 px-3 py-2.5 text-right font-bold text-muted-foreground"
                  rowSpan={2}
                  style={{ minWidth: 160, backgroundColor: "#e8ecf1" }}
                >اسم الطالب</th>
                {weeks.map((w) => (
                  <th
                    key={w.weekNum}
                    colSpan={periodsPerWeek}
                    className="border border-border/30 px-2 py-2 text-center font-bold"
                    style={{ backgroundColor: "#e8ecf1", color: "#374151" }}
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
                  style={{
                    backgroundColor: s.isAtRisk ? "#fef2f2" : idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                  }}
                >
                  <td className="border border-border/20 px-2 py-2 text-center text-muted-foreground font-medium">{idx + 1}</td>
                  <td className="border border-border/20 px-3 py-2 text-right font-semibold whitespace-nowrap">
                    {s.name}
                    {s.isAtRisk && <AlertTriangle className="inline h-3.5 w-3.5 mr-1.5 text-destructive" />}
                  </td>
                  {weeks.map((w) =>
                    Array.from({ length: periodsPerWeek }, (_, i) => {
                      const status = s.weeks[w.weekNum]?.[i];
                      const cfg = status ? STATUS_CONFIG[status] : null;
                      return (
                        <td
                          key={`${w.weekNum}-${i}`}
                          className="border border-border/15 text-center"
                          style={{ padding: "4px 2px", minWidth: 28 }}
                        >
                          <span style={{ color: cfg?.color || "#d1d5db", fontSize: 18, lineHeight: 1 }}>●</span>
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}
