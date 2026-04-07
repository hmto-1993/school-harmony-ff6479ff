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
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { STATUS_CONFIG } from "./weekly-report-types";
import type { AttendanceRecord, WeekData, StudentRow } from "./weekly-report-types";
import { exportWeeklyExcel, exportWeeklyPDF } from "./weekly-report-exports";

const DEFAULT_ALERT_THRESHOLD = 0.2;

function getWeekNumber(date: Date, startDate: Date, academicGetWeek?: (d: Date) => number | null): number {
  if (academicGetWeek) {
    const aw = academicGetWeek(date);
    if (aw !== null) return aw;
  }
  const diffTime = date.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

interface Props {
  attendanceData: AttendanceRecord[];
  students: { id: string; full_name: string }[];
  periodsPerWeek: number;
  dateFrom: string;
  dateTo: string;
  className?: string;
}

export default function AttendanceWeeklyReport({ attendanceData, students, periodsPerWeek, dateFrom, dateTo, className: classDisplayName }: Props) {
  const { getWeekForDate, getWeeksInfo, currentWeek } = useAcademicWeek();
  const tableRef = useRef<HTMLDivElement>(null);
  const didInitializeWeekSelectionRef = useRef(false);
  const [alertThreshold, setAlertThreshold] = useState(DEFAULT_ALERT_THRESHOLD);
  const [absenceMode, setAbsenceMode] = useState<"percentage" | "sessions">("percentage");
  const [allowedSessions, setAllowedSessions] = useState(0);
  const [selectedWeeks, setSelectedWeeks] = useState<Set<number | "all">>(new Set());

  useEffect(() => {
    supabase.from("site_settings").select("id, value").in("id", ["absence_threshold", "absence_allowed_sessions", "absence_mode"]).then(({ data }) => {
      (data || []).forEach((s: any) => {
        if (s.id === "absence_threshold" && s.value) setAlertThreshold(Number(s.value) / 100 || DEFAULT_ALERT_THRESHOLD);
        if (s.id === "absence_allowed_sessions" && s.value) setAllowedSessions(Number(s.value) || 0);
        if (s.id === "absence_mode" && s.value) setAbsenceMode(s.value as any || "percentage");
      });
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
    const weeks: WeekData[] = Array.from(weekMap.entries()).sort(([a], [b]) => a - b).map(([weekNum, dates]) => ({ weekNum, dates }));
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
      let isAtRisk = false;
      if (absenceMode === "sessions" && allowedSessions > 0) isAtRisk = totalAbsent > allowedSessions;
      else isAtRisk = totalPeriodsHeld > 0 && totalAbsent / totalPeriodsHeld > alertThreshold;
      return { id: s.id, name: s.full_name, weeks: weeksData, totalPresent, totalAbsent, totalLate, totalExcused, totalPeriods: totalPeriodsHeld, isAtRisk };
    });
    return { weeks, studentRows, totalPeriodsHeld };
  }, [attendanceData, students, periodsPerWeek, dateFrom, dateTo, alertThreshold, absenceMode, allowedSessions, getWeekForDate]);

  const academicWeeks = useMemo(() => getWeeksInfo(), [getWeeksInfo]);

  useEffect(() => {
    if (didInitializeWeekSelectionRef.current) return;
    const availableWeekNums = academicWeeks.length > 0 ? academicWeeks.map((aw) => aw.weekNumber) : weeks.map((w) => w.weekNum);
    if (availableWeekNums.length === 0) return;
    const initialWeek = currentWeek && availableWeekNums.includes(currentWeek) ? currentWeek : availableWeekNums[0];
    setSelectedWeeks(new Set<number | "all">([initialWeek]));
    didInitializeWeekSelectionRef.current = true;
  }, [academicWeeks, weeks, currentWeek]);

  const filteredWeeks = useMemo(() => {
    if (selectedWeeks.has("all")) {
      if (academicWeeks.length > 0) return academicWeeks.map(aw => { const existing = weeks.find(w => w.weekNum === aw.weekNumber); return existing || { weekNum: aw.weekNumber, dates: [] }; });
      return weeks;
    }
    const result: WeekData[] = [];
    const sortedSelected = Array.from(selectedWeeks).filter((v): v is number => typeof v === "number").sort((a, b) => a - b);
    for (const wn of sortedSelected) { const existing = weeks.find(w => w.weekNum === wn); result.push(existing || { weekNum: wn, dates: [] }); }
    return result;
  }, [weeks, selectedWeeks, academicWeeks]);

  const toggleWeek = (weekNum: number) => {
    setSelectedWeeks(prev => {
      const next = new Set(prev);
      next.delete("all");
      if (next.has(weekNum)) next.delete(weekNum); else next.add(weekNum);
      const allWeekNums = academicWeeks.length > 0 ? academicWeeks.map((aw) => aw.weekNumber) : weeks.map((w) => w.weekNum);
      const selectedWeekCount = Array.from(next).filter((v): v is number => typeof v === "number").length;
      if (allWeekNums.length > 1 && selectedWeekCount === allWeekNums.length && allWeekNums.every((wn) => next.has(wn))) return new Set<number | "all">(["all"]);
      return next;
    });
  };
  const selectAllWeeks = () => setSelectedWeeks(new Set<number | "all">(["all"]));
  const deselectAllWeeks = () => setSelectedWeeks(new Set());

  const exportParams = { studentRows, filteredWeeks, periodsPerWeek, dateFrom, dateTo, classDisplayName, alertThreshold, absenceMode, allowedSessions };

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
              <p className="text-xs text-muted-foreground mt-1">من {dateFrom} إلى {dateTo} · {totalPeriodsHeld} حصة · الحد: {periodsPerWeek}/أسبوع</p>
            </div>
            <div className="flex items-center gap-2">
              {atRiskCount > 0 && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{atRiskCount} طالب في خطر</Badge>}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5"><Settings2 className="h-4 w-4" />الأسابيع ({selectedWeeks.has("all") ? "الجميع" : `${selectedWeeks.size}/${academicWeeks.length || weeks.length}`})</Button>
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
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 font-semibold border-b border-border pb-1.5 mb-1">
                      <Checkbox checked={selectedWeeks.has("all")} onCheckedChange={() => selectAllWeeks()} />الجميع
                    </label>
                    {(academicWeeks.length > 0 ? academicWeeks.map(aw => ({ weekNum: aw.weekNumber, hasData: weeks.some(w => w.weekNum === aw.weekNumber), label: aw.type !== "normal" ? aw.label : undefined })) : weeks.map(w => ({ weekNum: w.weekNum, hasData: true, label: undefined }))).map(w => (
                      <label key={w.weekNum} className={cn("flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5", !w.hasData && "opacity-50")}>
                        <Checkbox checked={selectedWeeks.has("all") || selectedWeeks.has(w.weekNum)} onCheckedChange={() => toggleWeek(w.weekNum)} />
                        <span>الأسبوع {w.weekNum}</span>
                        {w.label && <span className="text-[10px] text-muted-foreground mr-auto">{w.label}</span>}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-1.5"><Upload className="h-4 w-4" />تصدير</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportWeeklyExcel(exportParams)} className="gap-2"><FileSpreadsheet className="h-4 w-4" /> Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportWeeklyPDF(exportParams)} className="gap-2"><FileText className="h-4 w-4" /> PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="hidden print:block mb-4">
            <div className="text-center mb-2">
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>تقرير الحضور الأسبوعي</h1>
              <p style={{ fontSize: 13, margin: "4px 0 0", color: "#555" }}>{classDisplayName} — من {dateFrom} إلى {dateTo}</p>
            </div>
          </div>
          <div className="attendance-legend flex items-center justify-between rounded-md px-4 py-2 mb-3" dir="rtl" style={{ background: "#f8f9fa", border: "1px solid #dee2e6" }}>
            <span className="text-xs font-bold" style={{ color: "#495057" }}>مفتاح الرموز</span>
            <div className="flex items-center gap-6">
              {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "early_leave").map(([key, val]) => (
                <span key={key} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#495057" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", backgroundColor: val.color, color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1, border: "2px solid rgba(0,0,0,0.15)" }}>
                    {key === "present" ? "✓" : key === "absent" ? "✕" : key === "late" ? "!" : "⏎"}
                  </span>
                  {val.label}
                </span>
              ))}
            </div>
          </div>
          <div ref={tableRef} className="overflow-auto rounded-md max-h-[600px] print:max-h-none print:overflow-visible attendance-table-wrapper">
            <table className="w-full attendance-logbook-table" dir="rtl" style={{ borderCollapse: "collapse", fontSize: 13 }}>
              <thead className="sticky top-0 z-10 print:sticky-none">
                <tr>
                  <th className="logbook-th" rowSpan={2} style={{ minWidth: 32, width: 36 }}>م</th>
                  <th className="logbook-th" rowSpan={2} style={{ textAlign: "right", whiteSpace: "nowrap" }}>اسم الطالب</th>
                  {filteredWeeks.map((w) => (<th key={w.weekNum} colSpan={slotsPerWeek} className="logbook-th logbook-th-week"><span className="logbook-week-label">الأسبوع {w.weekNum}</span></th>))}
                  <th className="logbook-th logbook-th-total" rowSpan={2}><span className="summary-dot" style={{ backgroundColor: "#4caf50" }}>●</span></th>
                  <th className="logbook-th logbook-th-total" rowSpan={2}><span className="summary-dot" style={{ backgroundColor: "#e53935" }}>●</span></th>
                  <th className="logbook-th logbook-th-total" rowSpan={2}><span className="summary-dot" style={{ backgroundColor: "#fbc02d" }}>●</span></th>
                </tr>
                <tr>
                  {filteredWeeks.map((w) => Array.from({ length: slotsPerWeek }, (_, i) => (<th key={`${w.weekNum}-s${i}`} className="logbook-th logbook-th-session">{i + 1}</th>)))}
                </tr>
              </thead>
              <tbody>
                {studentRows.map((s, idx) => (
                  <tr key={s.id} className={cn(s.isAtRisk ? "logbook-row-risk" : idx % 2 === 0 ? "logbook-row-even" : "logbook-row-odd")}>
                    <td className="logbook-td logbook-td-num">{idx + 1}</td>
                    <td className="logbook-td logbook-td-name">
                      <span>{s.name}</span>
                      {s.isAtRisk && (<span className="block text-[10px] mt-0.5" style={{ color: "#ef4444" }}><AlertTriangle className="inline h-3 w-3 ml-0.5" style={{ color: "#ef4444" }} />تجاوز {absenceMode === "sessions" && allowedSessions > 0 ? `${allowedSessions} حصة` : `${Math.round(alertThreshold * 100)}%`}</span>)}
                    </td>
                    {filteredWeeks.map((w) => Array.from({ length: slotsPerWeek }, (_, i) => {
                      const status = s.weeks[w.weekNum]?.[i];
                      const cfg = status ? STATUS_CONFIG[status] : null;
                      return (<td key={`${w.weekNum}-${i}`} className="logbook-td logbook-td-dot"><span className="session-dot" style={{ backgroundColor: cfg ? cfg.color : "#e5e0d0", borderColor: cfg ? cfg.color : "#ccc5b0" }}>{cfg ? (status === "present" ? "✓" : status === "absent" ? "✕" : status === "late" ? "!" : "⏎") : ""}</span></td>);
                    }))}
                    <td className="logbook-td logbook-td-total" style={{ color: "#16a34a", fontWeight: 700 }}>{s.totalPresent}</td>
                    <td className="logbook-td logbook-td-total" style={{ color: "#dc2626", fontWeight: 700 }}>{s.totalAbsent}</td>
                    <td className="logbook-td logbook-td-total" style={{ color: "#d97706", fontWeight: 700 }}>{s.totalLate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 print:hidden">
            {[
              { label: "إجمالي الحضور", value: studentRows.reduce((a, s) => a + s.totalPresent, 0), color: "#22c55e" },
              { label: "إجمالي الغياب", value: studentRows.reduce((a, s) => a + s.totalAbsent, 0), color: "#ef4444" },
              { label: "إجمالي التأخر", value: studentRows.reduce((a, s) => a + s.totalLate, 0), color: "#f59e0b" },
              { label: "إجمالي الاستئذان", value: studentRows.reduce((a, s) => a + s.totalExcused, 0), color: "#3b82f6" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border/40 p-3 text-center" style={{ borderTop: `3px solid ${stat.color}` }}>
                <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          {atRiskCount > 0 && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2 text-sm print:hidden">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <span className="text-destructive font-medium">{atRiskCount} طالب تجاوز حد الغياب المسموح ({absenceMode === "sessions" && allowedSessions > 0 ? `${allowedSessions} حصة` : `${Math.round(alertThreshold * 100)}%`})</span>
            </div>
          )}
        </CardContent>
      </Card>
      <style>{`
        .logbook-th { background: #e9ecef; color: #495057; font-weight: 700; text-align: center; padding: 8px 6px; border: 1.5px solid #ced4da; font-size: 13px; white-space: nowrap; }
        .logbook-th-week { background: #dee2e6; font-size: 11px; padding: 2px; position: relative; height: 60px; }
        .logbook-week-label { writing-mode: vertical-rl; transform: rotate(180deg); display: inline-block; white-space: nowrap; font-size: 11px; line-height: 1; }
        .logbook-th-session { background: #e9ecef; font-size: 10px; padding: 3px 2px; min-width: 24px; width: 24px; color: #868e96; border: 1.5px solid #ced4da; }
        .logbook-th-total { background: #e9ecef; font-size: 11px; min-width: 22px; width: 22px; font-weight: 800; padding: 2px 1px; }
        .logbook-td { border: 1px solid #dee2e6; padding: 4px 3px; text-align: center; vertical-align: middle; }
        .logbook-td-num { font-weight: 700; color: #495057; width: 32px; background: #f8f9fa; font-size: 13px; }
        .logbook-td-name { text-align: right; padding-right: 8px; padding-left: 4px; font-weight: 600; color: #212529; white-space: nowrap; background: #f8f9fa; font-size: 13px; width: 1%; line-height: 1.3; }
        .logbook-td-dot { padding: 3px 1px; min-width: 24px; }
        .logbook-td-total { background: #f8f9fa; font-size: 11px; min-width: 22px; width: 22px; padding: 2px 1px; }
        .summary-dot { color: transparent; display: inline-block; width: 10px; height: 10px; border-radius: 50%; vertical-align: middle; }
        .logbook-row-even { background: #ffffff; }
        .logbook-row-odd { background: #f8f9fa; }
        .logbook-row-risk { background: #fff5f5; }
        .logbook-row-risk .logbook-td-name, .logbook-row-risk .logbook-td-num { background: #fff5f5; }
        .session-dot { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; border: none; color: #fff; font-size: 9px; font-weight: 800; line-height: 1; }
        .attendance-legend { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        @media print {
          .weekly-attendance-report { box-shadow: none !important; border: none !important; background: white !important; backdrop-filter: none !important; }
          .attendance-table-wrapper { max-height: none !important; overflow: visible !important; }
          .logbook-th, .logbook-th-week, .logbook-th-session, .logbook-td, .logbook-td-num, .logbook-td-name, .logbook-row-even, .logbook-row-odd, .logbook-row-risk, .session-dot, .attendance-legend { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          thead { position: static !important; }
          @page { size: A4 landscape; margin: 8mm; }
          @page { margin-top: 5mm; margin-bottom: 5mm; }
        }
      `}</style>
    </>
  );
}
