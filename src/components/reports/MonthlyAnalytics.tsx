import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Trophy, Star, AlertTriangle, Users, GraduationCap,
  Shield, ShieldAlert, Award, TrendingUp, Loader2, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { safeWriteXLSX } from "@/lib/download-utils";
import ReportExportDialog from "@/components/reports/ReportExportDialog";
import { useMonthlyAnalytics, MONTHS_AR } from "@/hooks/useMonthlyAnalytics";

interface Props {
  selectedClass: string;
  classes: { id: string; name: string }[];
}

export default function MonthlyAnalytics({ selectedClass, classes }: Props) {
  const {
    loading, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
    classFilter, setClassFilter, excellenceStudents, disciplinaryStudents,
    stats, fetchAnalytics, getMonthLabel, years,
  } = useMonthlyAnalytics(selectedClass);

  // Excel exports
  const exportExcellenceExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = excellenceStudents.map((s, i) => ({
      "#": i + 1, "اسم الطالب": s.full_name, "الفصل": s.class_name,
      "حضور كامل": s.perfectAttendance ? "✓" : "—", "درجة كاملة": s.fullMarks ? "✓" : "—",
      "تفاصيل": s.fullMarkTests.join(", ") || (s.perfectAttendance ? "انتظام كامل" : ""),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المتميزون");
    safeWriteXLSX(wb, `تقرير_المتميزون_${MONTHS_AR[parseInt(selectedMonth)]}_${selectedYear}.xlsx`);
  };

  const exportDisciplinaryExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = disciplinaryStudents.map((s, i) => ({
      "#": i + 1, "اسم الطالب": s.full_name, "الفصل": s.class_name,
      "أيام الغياب": s.absenceDays, "حالة الإنذار": s.warningStatus === "sent" ? "تم الإرسال" : "معلق",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "إنذارات الغياب");
    safeWriteXLSX(wb, `تقرير_الغياب_${MONTHS_AR[parseInt(selectedMonth)]}_${selectedYear}.xlsx`);
  };

  const exportExcellencePDF = async () => {
    const { buildExcellencePDF, savePDFBlob } = await import("@/lib/report-pdf-builders");
    const { blob, fileName } = await buildExcellencePDF(excellenceStudents, getMonthLabel());
    savePDFBlob(blob, fileName);
  };

  const shareExcellenceWhatsApp = async () => {
    const { buildExcellencePDF, sharePDFBlob } = await import("@/lib/report-pdf-builders");
    const { blob, fileName } = await buildExcellencePDF(excellenceStudents, getMonthLabel());
    await sharePDFBlob(blob, fileName, `🏆 تقرير المتميزين — ${getMonthLabel()}`);
  };

  const exportDisciplinaryPDF = async () => {
    const { buildDisciplinaryPDF, savePDFBlob } = await import("@/lib/report-pdf-builders");
    const { blob, fileName } = await buildDisciplinaryPDF(disciplinaryStudents, getMonthLabel());
    savePDFBlob(blob, fileName);
  };

  const shareDisciplinaryWhatsApp = async () => {
    const { buildDisciplinaryPDF, sharePDFBlob } = await import("@/lib/report-pdf-builders");
    const { blob, fileName } = await buildDisciplinaryPDF(disciplinaryStudents, getMonthLabel());
    await sharePDFBlob(blob, fileName, `📋 تقرير الغياب — ${getMonthLabel()}`);
  };

  return (
    <div className="space-y-5">
      {/* Month & Class Filters */}
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5 min-w-[140px]">
              <Label className="text-xs font-semibold text-muted-foreground">الشهر</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <Calendar className="h-4 w-4 ml-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_AR.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[100px]">
              <Label className="text-xs font-semibold text-muted-foreground">السنة</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs font-semibold text-muted-foreground">الفصل</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفصول</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchAnalytics} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              {loading ? "جارٍ التحليل..." : "تحليل الشهر"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistical Dashboard */}
      {stats.totalStudents > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "إجمالي الطلاب", value: stats.totalStudents, icon: Users, color: "from-primary/10 to-accent/5", iconBg: "bg-primary/15 text-primary" },
              { label: "متوسط الدرجات", value: `${stats.avgClassScore}%`, icon: GraduationCap, color: "from-success/10 to-success/5", iconBg: "bg-success/15 text-success" },
              { label: "شهادات تفوق", value: stats.fullMarkCertificates, icon: Award, color: "from-amber-500/10 to-amber-600/5", iconBg: "bg-amber-500/15 text-amber-600" },
              { label: "حضور كامل", value: stats.perfectAttendanceCount, icon: Shield, color: "from-emerald-500/10 to-emerald-600/5", iconBg: "bg-emerald-500/15 text-emerald-600" },
              { label: "إنذارات غياب", value: stats.absenceWarnings, icon: ShieldAlert, color: "from-destructive/10 to-destructive/5", iconBg: "bg-destructive/15 text-destructive" },
            ].map((stat, idx) => (
              <Card key={idx} className={cn("border-0 shadow-md bg-gradient-to-br", stat.color)}>
                <CardContent className="p-4 text-center">
                  <div className={cn("mx-auto mb-2 w-9 h-9 rounded-xl flex items-center justify-center", stat.iconBg)}>
                    <stat.icon className="h-4.5 w-4.5" />
                  </div>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Excellence Report */}
      {excellenceStudents.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className={cn(
            "border-0 shadow-lg overflow-hidden",
            "bg-gradient-to-br from-amber-50/30 via-card to-amber-100/20",
            "dark:from-amber-950/20 dark:via-card dark:to-amber-900/10"
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-600" />
                  تقرير التميز الشهري — {MONTHS_AR[parseInt(selectedMonth)]} {selectedYear}
                  <Badge variant="secondary" className="text-xs">{excellenceStudents.length} طالب</Badge>
                </CardTitle>
                <ReportExportDialog
                  title="تصدير تقرير المتميزين"
                  onExportExcel={exportExcellenceExcel}
                  onExportPDF={exportExcellencePDF}
                  onShareWhatsApp={shareExcellenceWhatsApp}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="max-h-[350px] overflow-auto rounded-xl border border-border/30">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-l from-amber-500/10 to-amber-600/5 dark:from-amber-500/15 dark:to-amber-600/10">
                      <TableHead className="text-right font-semibold w-10">#</TableHead>
                      <TableHead className="text-right font-semibold">اسم الطالب</TableHead>
                      <TableHead className="text-right font-semibold">الفصل</TableHead>
                      <TableHead className="text-center font-semibold">حضور كامل</TableHead>
                      <TableHead className="text-center font-semibold">درجة كاملة</TableHead>
                      <TableHead className="text-right font-semibold">التفاصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {excellenceStudents.map((s, i) => (
                      <TableRow key={s.id} className={i % 2 === 0 ? "bg-muted/15" : ""}>
                        <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-semibold">{s.full_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{s.class_name}</Badge></TableCell>
                        <TableCell className="text-center">
                          {s.perfectAttendance ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-xs">✓ ممتاز</Badge>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.fullMarks ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-xs">
                              <Star className="h-3 w-3 ml-1 fill-current" /> كاملة
                            </Badge>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {s.fullMarkTests.join("، ") || "انتظام كامل"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Disciplinary Report */}
      {disciplinaryStudents.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card className={cn(
            "border-0 shadow-lg overflow-hidden",
            "bg-gradient-to-br from-destructive/5 via-card to-destructive/10",
            "dark:from-destructive/10 dark:via-card dark:to-destructive/5"
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  تقرير الغياب والانضباط — {MONTHS_AR[parseInt(selectedMonth)]} {selectedYear}
                  <Badge variant="destructive" className="text-xs">{disciplinaryStudents.length} طالب</Badge>
                </CardTitle>
                <ReportExportDialog
                  title="تصدير تقرير الغياب"
                  onExportExcel={exportDisciplinaryExcel}
                  onExportPDF={exportDisciplinaryPDF}
                  onShareWhatsApp={shareDisciplinaryWhatsApp}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="max-h-[350px] overflow-auto rounded-xl border border-border/30">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-l from-destructive/10 to-destructive/5 dark:from-destructive/15 dark:to-destructive/10">
                      <TableHead className="text-right font-semibold w-10">#</TableHead>
                      <TableHead className="text-right font-semibold">اسم الطالب</TableHead>
                      <TableHead className="text-right font-semibold">الفصل</TableHead>
                      <TableHead className="text-center font-semibold">أيام الغياب</TableHead>
                      <TableHead className="text-center font-semibold">حالة الإنذار</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disciplinaryStudents.map((s, i) => (
                      <TableRow key={s.id} className={i % 2 === 0 ? "bg-muted/15" : ""}>
                        <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-semibold">{s.full_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{s.class_name}</Badge></TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive" className="text-xs font-bold">{s.absenceDays} يوم</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {s.warningStatus === "sent" ? (
                            <Badge className="bg-success/15 text-success border-0 text-xs">تم الإرسال</Badge>
                          ) : (
                            <Badge className="bg-warning/15 border-0 text-xs" style={{ color: "hsl(var(--warning))" }}>معلق</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && stats.totalStudents === 0 && (
        <Card className="border-0 shadow-lg bg-card/80">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-primary/10 p-4 mb-4">
              <TrendingUp className="h-10 w-10 text-amber-500/40" />
            </div>
            <p className="text-sm">اختر الشهر والفصل ثم اضغط "تحليل الشهر" لعرض التقارير</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
