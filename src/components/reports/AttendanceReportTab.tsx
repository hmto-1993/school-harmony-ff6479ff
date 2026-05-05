import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BarChart3, ClipboardCheck, Calendar, Users, UserCircle, Eye } from "lucide-react";
import AttendanceChart from "@/components/reports/AttendanceChart";
import AttendanceWeeklyReport from "@/components/reports/AttendanceWeeklyReport";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";
import PrintWatermark from "@/components/shared/PrintWatermark";
import ReportExportDialog from "@/components/reports/ReportExportDialog";
import { safeWriteXLSX } from "@/lib/download-utils";
import { toast } from "@/hooks/use-toast";
import type { AttendanceRow } from "@/hooks/useReportSending";

const STATUS_FILTER_LABELS: Record<string, string> = {
  present: "الحاضرون",
  absent: "الغائبون",
  late: "المتأخرون",
  absent_late: "الغائبون والمتأخرون",
};

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  early_leave: "خروج مبكر",
  sick_leave: "إجازة مرضية",
};

const STATUS_ORDER: Record<string, number> = {
  present: 0,
  late: 1,
  early_leave: 2,
  sick_leave: 3,
  absent: 4,
};

interface AttendanceReportTabProps {
  attendanceData: AttendanceRow[];
  loadingAttendance: boolean;
  selectedClass: string;
  fetchAttendance: () => void;
  onPreview: () => void;
  exportAttendanceExcel: () => void;
  exportAttendancePDF: () => void;
  shareAttendanceWhatsApp: () => void;
  reportType: "daily" | "periodic" | "semester";
  students: { id: string; full_name: string; parent_phone: string | null }[];
  periodsPerWeek: number;
  dateFrom: string;
  dateTo: string;
  className: string;
}

type StatusFilter = "all" | "present" | "absent" | "late" | "absent_late";

export default function AttendanceReportTab({
  attendanceData,
  loadingAttendance,
  selectedClass,
  fetchAttendance,
  onPreview,
  exportAttendanceExcel,
  exportAttendancePDF,
  shareAttendanceWhatsApp,
  reportType,
  students,
  periodsPerWeek,
  dateFrom,
  dateTo,
  className,
}: AttendanceReportTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const isAllClasses = selectedClass === "all";

  const attendanceSummary = useMemo(() => {
    const total = attendanceData.length;
    const present = attendanceData.filter((r) => r.status === "present").length;
    const absent = attendanceData.filter((r) => r.status === "absent").length;
    const late = attendanceData.filter((r) => r.status === "late").length;
    return { total, present, absent, late };
  }, [attendanceData]);

  // Group data by class when "all" is selected
  const groupedByClass = useMemo(() => {
    if (!isAllClasses) return null;
    const map = new Map<string, AttendanceRow[]>();
    attendanceData.forEach((row) => {
      const cn = row.class_name || "غير محدد";
      if (!map.has(cn)) map.set(cn, []);
      map.get(cn)!.push(row);
    });
    // Sort students within each class: present first, then absent
    map.forEach((rows, key) => {
      rows.sort((a, b) => (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5));
    });
    return map;
  }, [isAllClasses, attendanceData]);

  const filterRows = (rows: AttendanceRow[]) => {
    if (statusFilter === "all") return rows;
    if (statusFilter === "absent_late") return rows.filter((r) => r.status === "absent" || r.status === "late");
    return rows.filter((r) => r.status === statusFilter);
  };

  // Per-student totals (absent + late) — shown when filter is absent/late/absent_late
  const studentTotals = useMemo(() => {
    const showTotals = statusFilter === "absent" || statusFilter === "late" || statusFilter === "absent_late";
    if (!showTotals) return [];
    const map = new Map<string, { name: string; class_name: string; absent: number; late: number }>();
    attendanceData.forEach((r) => {
      if (r.status !== "absent" && r.status !== "late") return;
      const key = `${r.student_name}__${r.class_name || ""}`;
      const cur = map.get(key) || { name: r.student_name, class_name: r.class_name || "", absent: 0, late: 0 };
      if (r.status === "absent") cur.absent += 1;
      else cur.late += 1;
      map.set(key, cur);
    });
    return Array.from(map.values())
      .filter((s) => {
        if (statusFilter === "absent") return s.absent > 0;
        if (statusFilter === "late") return s.late > 0;
        return s.absent + s.late > 0;
      })
      .sort((a, b) => (b.absent + b.late) - (a.absent + a.late));
  }, [attendanceData, statusFilter]);

  const renderTable = (rows: AttendanceRow[], showClassName = false) => {
    const filtered = filterRows(rows);
    if (filtered.length === 0) {
      return (
        <p className="text-center text-muted-foreground text-sm py-4">لا توجد سجلات</p>
      );
    }
    return (
      <div className="max-h-[400px] overflow-auto rounded-xl border border-border/30">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-l from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10">
              <TableHead className="text-right font-semibold">اسم الطالب</TableHead>
              {showClassName && <TableHead className="text-right font-semibold">الفصل</TableHead>}
              <TableHead className="text-right font-semibold">التاريخ</TableHead>
              <TableHead className="text-right font-semibold">الحالة</TableHead>
              <TableHead className="text-right font-semibold">ملاحظات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row, i) => (
              <TableRow key={i} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                <TableCell className="font-medium">{row.student_name}</TableCell>
                {showClassName && <TableCell className="text-muted-foreground text-sm">{row.class_name}</TableCell>}
                <TableCell className="text-muted-foreground">{row.date}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      row.status === "present"
                        ? "bg-success/15 text-success hover:bg-success/20 border-0"
                        : row.status === "absent"
                        ? "bg-destructive/15 text-destructive hover:bg-destructive/20 border-0"
                        : "bg-warning/15 hover:bg-warning/20 border-0"
                    }
                    style={row.status !== "present" && row.status !== "absent" ? { color: "hsl(var(--warning))" } : undefined}
                  >
                    {STATUS_LABELS[row.status] || row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {row.notes || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderClassSection = (className: string, rows: AttendanceRow[]) => {
    const filtered = filterRows(rows);
    const classPresent = rows.filter(r => r.status === "present").length;
    const classAbsent = rows.filter(r => r.status === "absent").length;
    const classLate = rows.filter(r => r.status === "late").length;

    return (
      <Card key={className} className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-1 rounded-full bg-primary" />
              <h3 className="font-bold text-base text-foreground">{className}</h3>
              <span className="text-xs text-muted-foreground">({rows.length} سجل)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
                <ClipboardCheck className="h-3 w-3" />{classPresent}
              </Badge>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                <Users className="h-3 w-3" />{classAbsent}
              </Badge>
              {classLate > 0 && (
                <Badge variant="outline" className="border-warning/20 gap-1" style={{ background: "hsl(var(--warning) / 0.1)", color: "hsl(var(--warning))" }}>
                  <Calendar className="h-3 w-3" />{classLate}
                </Badge>
              )}
            </div>
          </div>
          {renderTable(rows, false)}
        </CardContent>
      </Card>
    );
  };

  const filterActive = statusFilter !== "all";
  const filteredAttendance = useMemo(
    () => filterRows(attendanceData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attendanceData, statusFilter]
  );

  // Wrapped export functions — choose dataset by selected scope
  const STATUS_LABELS_AR: Record<string, string> = {
    present: "حاضر", absent: "غائب", late: "متأخر",
    early_leave: "خروج مبكر", sick_leave: "إجازة مرضية",
  };

  const handleExportExcel = async (scope: "all" | "filtered") => {
    if (scope === "all") return exportAttendanceExcel();
    if (filteredAttendance.length === 0) {
      toast({ title: "لا توجد بيانات", description: "لا يوجد سجلات في الفلتر الحالي", variant: "destructive" });
      return;
    }
    const XLSX = await import("xlsx");
    const includeClass = filteredAttendance.some((r) => !!r.class_name);
    const ws = XLSX.utils.json_to_sheet(
      filteredAttendance.map((r) => {
        const row: Record<string, any> = { "اسم الطالب": r.student_name };
        if (includeClass) row["الفصل"] = r.class_name || "";
        row["التاريخ"] = r.date;
        row["الحالة"] = STATUS_LABELS_AR[r.status] || r.status;
        row["ملاحظات"] = r.notes || "";
        return row;
      })
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الحضور");
    safeWriteXLSX(wb, `تقرير_الحضور_${STATUS_FILTER_LABELS[statusFilter] || ""}_${dateFrom}_${dateTo}.xlsx`);
  };

  const handleExportPDF = async (scope: "all" | "filtered") => {
    if (scope === "all") return exportAttendancePDF();
    if (filteredAttendance.length === 0) {
      toast({ title: "لا توجد بيانات", description: "لا يوجد سجلات في الفلتر الحالي", variant: "destructive" });
      return;
    }
    const { buildAttendancePDF, savePDFBlob } = await import("@/lib/report-pdf-builders");
    const { blob, fileName } = await buildAttendancePDF(filteredAttendance, dateFrom, dateTo);
    savePDFBlob(blob, fileName);
  };

  const handleShareWhatsApp = async (scope: "all" | "filtered") => {
    if (scope === "all") return shareAttendanceWhatsApp();
    if (filteredAttendance.length === 0) {
      toast({ title: "لا توجد بيانات", description: "لا يوجد سجلات في الفلتر الحالي", variant: "destructive" });
      return;
    }
    const { buildAttendancePDF, sharePDFBlob } = await import("@/lib/report-pdf-builders");
    const { blob, fileName } = await buildAttendancePDF(filteredAttendance, dateFrom, dateTo);
    const result = await sharePDFBlob(blob, fileName, `📋 تقرير الحضور (${STATUS_FILTER_LABELS[statusFilter] || ""})`);
    toast({ title: result === "shared" ? "تم المشاركة" : "تم تصدير PDF", description: result === "shared" ? "تم مشاركة ملف PDF بنجاح" : "تم تحميل الملف، يمكنك إرفاقه في واتساب" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        <Button onClick={fetchAttendance} disabled={loadingAttendance || !selectedClass}>
          <BarChart3 className="h-4 w-4 ml-1.5" />
          {loadingAttendance ? "جارٍ التحميل..." : "عرض التقرير"}
        </Button>
        {attendanceData.length > 0 && (
          <>
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="present">الحاضرون</SelectItem>
                <SelectItem value="absent">الغائبون</SelectItem>
                <SelectItem value="late">المتأخرون</SelectItem>
                <SelectItem value="absent_late">الغائبون والمتأخرون</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={onPreview} className="gap-1.5">
              <Eye className="h-4 w-4" />
              معاينة
            </Button>
            <ReportExportDialog
              title="تصدير تقرير الحضور"
              filterActive={filterActive}
              filterLabel={filterActive ? STATUS_FILTER_LABELS[statusFilter] : undefined}
              filteredCount={filteredAttendance.length}
              totalCount={attendanceData.length}
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
              onShareWhatsApp={handleShareWhatsApp}
            />
          </>
        )}
      </div>

      {attendanceData.length > 0 && (
        <div className="print-area space-y-4">
          <ReportPrintHeader reportType="attendance" />
          <PrintWatermark reportType="attendance" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
            <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 via-card to-primary/10 dark:from-primary/10 dark:via-card dark:to-primary/5">
              <CardContent className="p-4 text-center">
                <div className="mx-auto mb-2 w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
                  <UserCircle className="h-5 w-5 text-primary-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{attendanceSummary.total}</p>
                <p className="text-xs text-muted-foreground">إجمالي السجلات</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md bg-gradient-to-br from-success/5 via-card to-success/10 dark:from-success/10 dark:via-card dark:to-success/5">
              <CardContent className="p-4 text-center">
                <div className="mx-auto mb-2 w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg, hsl(var(--success)), hsl(var(--success) / 0.7))", boxShadow: "0 4px 12px hsl(var(--success) / 0.2)" }}>
                  <ClipboardCheck className="h-5 w-5 text-success-foreground" />
                </div>
                <p className="text-2xl font-bold" style={{ color: "hsl(var(--success))" }}>{attendanceSummary.present}</p>
                <p className="text-xs text-muted-foreground">حاضر</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md bg-gradient-to-br from-destructive/5 via-card to-destructive/10 dark:from-destructive/10 dark:via-card dark:to-destructive/5">
              <CardContent className="p-4 text-center">
                <div className="mx-auto mb-2 w-10 h-10 rounded-2xl bg-gradient-to-br from-destructive to-destructive/70 flex items-center justify-center shadow-md shadow-destructive/20">
                  <Users className="h-5 w-5 text-destructive-foreground" />
                </div>
                <p className="text-2xl font-bold text-destructive">{attendanceSummary.absent}</p>
                <p className="text-xs text-muted-foreground">غائب</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md bg-gradient-to-br from-warning/5 via-card to-warning/10 dark:from-warning/10 dark:via-card dark:to-warning/5">
              <CardContent className="p-4 text-center">
                <div className="mx-auto mb-2 w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg, hsl(var(--warning)), hsl(var(--warning) / 0.7))", boxShadow: "0 4px 12px hsl(var(--warning) / 0.2)" }}>
                  <Calendar className="h-5 w-5 text-warning-foreground" />
                </div>
                <p className="text-2xl font-bold" style={{ color: "hsl(var(--warning))" }}>{attendanceSummary.late}</p>
                <p className="text-xs text-muted-foreground">متأخر</p>
              </CardContent>
            </Card>
          </div>

          <AttendanceChart data={attendanceData} />

          {studentTotals.length > 0 && (
            <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-1 rounded-full bg-gradient-to-b from-destructive to-warning" />
                    <h3 className="font-bold text-base text-foreground">
                      إجمالي {statusFilter === "absent" ? "الغياب" : statusFilter === "late" ? "التأخر" : "الغياب والتأخر"} لكل طالب
                    </h3>
                    <span className="text-xs text-muted-foreground">({studentTotals.length} طالب)</span>
                  </div>
                </div>
                <div className="max-h-[300px] overflow-auto rounded-xl border border-border/30">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-l from-destructive/5 to-warning/5">
                        <TableHead className="text-right font-semibold w-12">#</TableHead>
                        <TableHead className="text-right font-semibold">اسم الطالب</TableHead>
                        {isAllClasses && <TableHead className="text-right font-semibold">الفصل</TableHead>}
                        {(statusFilter === "absent" || statusFilter === "absent_late") && (
                          <TableHead className="text-center font-semibold">غياب</TableHead>
                        )}
                        {(statusFilter === "late" || statusFilter === "absent_late") && (
                          <TableHead className="text-center font-semibold">تأخر</TableHead>
                        )}
                        {statusFilter === "absent_late" && (
                          <TableHead className="text-center font-semibold">المجموع</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentTotals.map((s, i) => (
                        <TableRow key={`${s.name}-${s.class_name}`} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          {isAllClasses && <TableCell className="text-muted-foreground text-sm">{s.class_name || "—"}</TableCell>}
                          {(statusFilter === "absent" || statusFilter === "absent_late") && (
                            <TableCell className="text-center">
                              {s.absent > 0 ? (
                                <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20 border-0">{s.absent}</Badge>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          )}
                          {(statusFilter === "late" || statusFilter === "absent_late") && (
                            <TableCell className="text-center">
                              {s.late > 0 ? (
                                <Badge className="border-0" style={{ background: "hsl(var(--warning) / 0.15)", color: "hsl(var(--warning))" }}>{s.late}</Badge>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          )}
                          {statusFilter === "absent_late" && (
                            <TableCell className="text-center font-bold text-foreground">{s.absent + s.late}</TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grouped by class view */}
          {isAllClasses && groupedByClass ? (
            <div className="space-y-4">
              {Array.from(groupedByClass.entries()).map(([cn, rows]) =>
                renderClassSection(cn, rows)
              )}
            </div>
          ) : (
            <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
              <CardContent className="pt-4">
                {renderTable(attendanceData, isAllClasses)}
              </CardContent>
            </Card>
          )}

          {reportType === "periodic" && !isAllClasses && (
            <AttendanceWeeklyReport
              attendanceData={attendanceData}
              students={students}
              periodsPerWeek={periodsPerWeek}
              dateFrom={dateFrom}
              dateTo={dateTo}
              className={className}
            />
          )}
        </div>
      )}

      {!loadingAttendance && attendanceData.length === 0 && (
        <Card className="print:hidden border-0 shadow-lg bg-card/80">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-4 mb-4">
              <Calendar className="h-10 w-10 text-primary/40" />
            </div>
            <p className="text-sm">اختر الفصل والتواريخ ثم اضغط "عرض التقرير"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
