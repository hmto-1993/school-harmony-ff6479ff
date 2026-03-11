import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Trophy, Star, AlertTriangle, Download, FileSpreadsheet, FileText, Users, GraduationCap,

  Shield, ShieldAlert, Award, TrendingUp, Loader2, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { safeWriteXLSX, safeSavePDF } from "@/lib/download-utils";
import { toast } from "@/hooks/use-toast";
import ReportExportDialog from "@/components/reports/ReportExportDialog";

interface ExcellenceStudent {
  id: string;
  full_name: string;
  class_name: string;
  perfectAttendance: boolean;
  fullMarks: boolean;
  fullMarkTests: string[];
}

interface DisciplinaryStudent {
  id: string;
  full_name: string;
  class_name: string;
  absenceDays: number;
  warningStatus: "sent" | "pending";
}

interface AnalyticsStats {
  avgClassScore: number;
  fullMarkCertificates: number;
  absenceWarnings: number;
  perfectAttendanceCount: number;
  totalStudents: number;
}

interface Props {
  selectedClass: string;
  classes: { id: string; name: string }[];
}

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export default function MonthlyAnalytics({ selectedClass, classes }: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [classFilter, setClassFilter] = useState(selectedClass || "all");

  const [excellenceStudents, setExcellenceStudents] = useState<ExcellenceStudent[]>([]);
  const [disciplinaryStudents, setDisciplinaryStudents] = useState<DisciplinaryStudent[]>([]);
  const [stats, setStats] = useState<AnalyticsStats>({
    avgClassScore: 0, fullMarkCertificates: 0, absenceWarnings: 0,
    perfectAttendanceCount: 0, totalStudents: 0,
  });

  useEffect(() => {
    setClassFilter(selectedClass || "all");
  }, [selectedClass]);

  const monthStart = useMemo(() => {
    const m = parseInt(selectedMonth);
    const y = parseInt(selectedYear);
    return new Date(y, m, 1).toISOString().split("T")[0];
  }, [selectedMonth, selectedYear]);

  const monthEnd = useMemo(() => {
    const m = parseInt(selectedMonth);
    const y = parseInt(selectedYear);
    return new Date(y, m + 1, 0).toISOString().split("T")[0];
  }, [selectedMonth, selectedYear]);

  const fetchAnalytics = async () => {
    setLoading(true);

    // Fetch students
    let studentsQuery = supabase
      .from("students")
      .select("id, full_name, class_id, classes(name)")
      .order("full_name");

    if (classFilter !== "all") {
      studentsQuery = studentsQuery.eq("class_id", classFilter);
    }

    const [
      { data: students },
      { data: attendance },
      { data: grades },
      { data: notifications },
    ] = await Promise.all([
      studentsQuery,
      supabase.from("attendance_records")
        .select("student_id, status, date")
        .gte("date", monthStart)
        .lte("date", monthEnd),
      supabase.from("grades")
        .select("student_id, score, category_id, grade_categories(name, max_score)")
        .not("score", "is", null),
      supabase.from("notifications")
        .select("student_id, type, created_at")
        .in("type", ["absent", "warning"])
        .gte("created_at", `${monthStart}T00:00:00`)
        .lte("created_at", `${monthEnd}T23:59:59`),
    ]);

    if (!students || students.length === 0) {
      setExcellenceStudents([]);
      setDisciplinaryStudents([]);
      setStats({ avgClassScore: 0, fullMarkCertificates: 0, absenceWarnings: 0, perfectAttendanceCount: 0, totalStudents: 0 });
      setLoading(false);
      return;
    }

    // Build attendance map per student
    const studentAbsences = new Map<string, number>();
    const studentHasAttendance = new Set<string>();
    (attendance || []).forEach(a => {
      studentHasAttendance.add(a.student_id);
      if (a.status === "absent") {
        studentAbsences.set(a.student_id, (studentAbsences.get(a.student_id) || 0) + 1);
      }
    });

    // Build full marks map
    const studentFullMarks = new Map<string, string[]>();
    let fullMarkCertCount = 0;
    (grades || []).forEach(g => {
      const catName = (g.grade_categories as any)?.name || "";
      const maxScore = (g.grade_categories as any)?.max_score || 0;
      if (g.score === maxScore && maxScore > 0) {
        const existing = studentFullMarks.get(g.student_id) || [];
        if (!existing.includes(catName)) {
          studentFullMarks.set(g.student_id, [...existing, catName]);
          fullMarkCertCount++;
        }
      }
    });

    // Build notification map
    const studentWarnings = new Set<string>();
    (notifications || []).forEach(n => {
      studentWarnings.add(n.student_id);
    });

    // Calculate avg score
    const scores = (grades || []).map(g => {
      const max = (g.grade_categories as any)?.max_score || 100;
      return max > 0 ? (g.score! / max) * 100 : 0;
    });
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Build excellence and disciplinary lists
    const excellence: ExcellenceStudent[] = [];
    const disciplinary: DisciplinaryStudent[] = [];
    let perfectCount = 0;

    for (const student of students) {
      const absences = studentAbsences.get(student.id) || 0;
      const hasAttendance = studentHasAttendance.has(student.id);
      const isPerfectAttendance = hasAttendance && absences === 0;
      const fullMarks = studentFullMarks.get(student.id) || [];
      const className = (student.classes as any)?.name || "";

      if (isPerfectAttendance) perfectCount++;

      // Excellence: perfect attendance OR full marks
      if (isPerfectAttendance || fullMarks.length > 0) {
        excellence.push({
          id: student.id,
          full_name: student.full_name,
          class_name: className,
          perfectAttendance: isPerfectAttendance,
          fullMarks: fullMarks.length > 0,
          fullMarkTests: fullMarks,
        });
      }

      // Disciplinary: 3+ absences
      if (absences >= 3) {
        disciplinary.push({
          id: student.id,
          full_name: student.full_name,
          class_name: className,
          absenceDays: absences,
          warningStatus: studentWarnings.has(student.id) ? "sent" : "pending",
        });
      }
    }

    // Sort: excellence by most achievements, disciplinary by most absences
    excellence.sort((a, b) => {
      const aScore = (a.perfectAttendance ? 1 : 0) + (a.fullMarks ? 1 : 0);
      const bScore = (b.perfectAttendance ? 1 : 0) + (b.fullMarks ? 1 : 0);
      return bScore - aScore;
    });
    disciplinary.sort((a, b) => b.absenceDays - a.absenceDays);

    setExcellenceStudents(excellence);
    setDisciplinaryStudents(disciplinary);
    setStats({
      avgClassScore: avgScore,
      fullMarkCertificates: fullMarkCertCount,
      absenceWarnings: disciplinary.length,
      perfectAttendanceCount: perfectCount,
      totalStudents: students.length,
    });
    setLoading(false);
  };

  // Excel exports
  const exportExcellenceExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = excellenceStudents.map((s, i) => ({
      "#": i + 1,
      "اسم الطالب": s.full_name,
      "الفصل": s.class_name,
      "حضور كامل": s.perfectAttendance ? "✓" : "—",
      "درجة كاملة": s.fullMarks ? "✓" : "—",
      "تفاصيل": s.fullMarkTests.join(", ") || (s.perfectAttendance ? "انتظام كامل" : ""),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المتميزون");
    XLSX.writeFile(wb, `تقرير_المتميزون_${MONTHS_AR[parseInt(selectedMonth)]}_${selectedYear}.xlsx`);
  };

  const exportDisciplinaryExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = disciplinaryStudents.map((s, i) => ({
      "#": i + 1,
      "اسم الطالب": s.full_name,
      "الفصل": s.class_name,
      "أيام الغياب": s.absenceDays,
      "حالة الإنذار": s.warningStatus === "sent" ? "تم الإرسال" : "معلق",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "إنذارات الغياب");
    XLSX.writeFile(wb, `تقرير_الغياب_${MONTHS_AR[parseInt(selectedMonth)]}_${selectedYear}.xlsx`);
  };

  // PDF exports
  const exportExcellencePDF = async () => {
    const { createArabicPDF, getArabicTableStyles } = await import("@/lib/arabic-pdf");
    const autoTableImport = await import("jspdf-autotable");
    const autoTable = autoTableImport.default;
    const { doc, startY } = await createArabicPDF({ orientation: "portrait", reportType: "grades", includeHeader: true });
    const tableStyles = getArabicTableStyles();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text("تقرير المتميزين الشهري", pageWidth / 2, startY, { align: "center" });
    doc.setFontSize(11);
    doc.text(`${MONTHS_AR[parseInt(selectedMonth)]} ${selectedYear}`, pageWidth / 2, startY + 8, { align: "center" });

    const body = excellenceStudents.map((s, i) => [
      s.fullMarkTests.join(", ") || "انتظام كامل",
      s.fullMarks ? "✓" : "—",
      s.perfectAttendance ? "✓" : "—",
      s.class_name,
      s.full_name,
      String(i + 1),
    ]);

    autoTable(doc, {
      startY: startY + 14,
      head: [["التفاصيل", "درجة كاملة", "حضور كامل", "الفصل", "اسم الطالب", "#"]],
      body,
      ...tableStyles,
    });

    doc.save(`تقرير_المتميزون_${MONTHS_AR[parseInt(selectedMonth)]}_${selectedYear}.pdf`);
  };

  const exportDisciplinaryPDF = async () => {
    const { createArabicPDF, getArabicTableStyles } = await import("@/lib/arabic-pdf");
    const autoTableImport = await import("jspdf-autotable");
    const autoTable = autoTableImport.default;
    const { doc, startY } = await createArabicPDF({ orientation: "portrait", reportType: "attendance", includeHeader: true });
    const tableStyles = getArabicTableStyles();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text("تقرير الغياب والانضباط", pageWidth / 2, startY, { align: "center" });
    doc.setFontSize(11);
    doc.text(`${MONTHS_AR[parseInt(selectedMonth)]} ${selectedYear}`, pageWidth / 2, startY + 8, { align: "center" });

    const body = disciplinaryStudents.map((s, i) => [
      s.warningStatus === "sent" ? "تم الإرسال" : "معلق",
      String(s.absenceDays),
      s.class_name,
      s.full_name,
      String(i + 1),
    ]);

    autoTable(doc, {
      startY: startY + 14,
      head: [["حالة الإنذار", "أيام الغياب", "الفصل", "اسم الطالب", "#"]],
      body,
      ...tableStyles,
    });

    doc.save(`تقرير_الغياب_${MONTHS_AR[parseInt(selectedMonth)]}_${selectedYear}.pdf`);
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="space-y-5">
      {/* Month & Class Filters */}
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
