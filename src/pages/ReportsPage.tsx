import { useEffect, useState, useMemo, useCallback } from "react";
import { safePrint } from "@/lib/print-utils";
import { safeWriteXLSX } from "@/lib/download-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";
import {
  ClipboardCheck,
  GraduationCap,
  Heart,
  Printer,
  Send,
  ChevronDown,
  MessageCircle,
  Users2,
  Trophy,
  Lock,
  FileText,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import PrintPreviewDialog from "@/components/reports/PrintPreviewDialog";
import BehaviorReport from "@/components/reports/BehaviorReport";
import MonthlyAnalytics from "@/components/reports/MonthlyAnalytics";
import ComprehensiveExport from "@/components/reports/ComprehensiveExport";
import ReportFilters from "@/components/reports/ReportFilters";
import AttendanceReportTab from "@/components/reports/AttendanceReportTab";
import GradesReportTab from "@/components/reports/GradesReportTab";
import BulkSendConfirmDialog from "@/components/reports/BulkSendConfirmDialog";
import { useReportSending, type AttendanceRow, type GradeRow } from "@/hooks/useReportSending";

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  early_leave: "خروج مبكر",
  sick_leave: "إجازة مرضية",
};

interface ClassOption {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const { role, user } = useAuth();
  const { perms: teacherPerms, loaded: permsLoaded } = useTeacherPermissions();
  const { getWeeksInfo, currentWeek } = useAcademicWeek();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [dateFromDate, setDateFromDate] = useState<Date>(new Date());
  const [dateToDate, setDateToDate] = useState<Date>(new Date());
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
  const [reportType, setReportType] = useState<"daily" | "periodic">("daily");
  const dateFrom = format(dateFromDate, "yyyy-MM-dd");
  const dateTo = format(dateToDate, "yyyy-MM-dd");

  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [students, setStudents] = useState<{ id: string; full_name: string; parent_phone: string | null }[]>([]);

  // Attendance data
  const [attendanceData, setAttendanceData] = useState<AttendanceRow[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Grades data
  const [gradeData, setGradeData] = useState<GradeRow[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // Print preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<"attendance" | "grades" | "behavior">("attendance");

  // Periods per week for weekly report
  const [periodsPerWeek, setPeriodsPerWeek] = useState(5);

  const attendanceSummary = useMemo(() => {
    const total = attendanceData.length;
    const present = attendanceData.filter((r) => r.status === "present").length;
    const absent = attendanceData.filter((r) => r.status === "absent").length;
    const late = attendanceData.filter((r) => r.status === "late").length;
    return { total, present, absent, late };
  }, [attendanceData]);

  // Report sending hook
  const {
    sendingSMS,
    bulkProgress,
    bulkConfirm,
    setBulkConfirm,
    handleSendSMS,
    handleSendWhatsApp,
    handleBulkSendSMS,
  } = useReportSending({
    selectedClass,
    selectedStudent,
    students,
    dateFrom,
    dateTo,
    attendanceData,
    attendanceSummary,
    gradeData,
    categoryNames,
  });

  // Sync dateFromDate/dateToDate when selectedWeeks changes
  useEffect(() => {
    if (reportType !== "periodic" || selectedWeeks.length === 0) return;
    const weeksInfo = getWeeksInfo();
    const sorted = [...selectedWeeks].sort((a, b) => a - b);
    const firstWeek = weeksInfo.find(w => w.weekNumber === sorted[0]);
    const lastWeek = weeksInfo.find(w => w.weekNumber === sorted[sorted.length - 1]);
    if (firstWeek) setDateFromDate(firstWeek.startDate);
    if (lastWeek) setDateToDate(lastWeek.endDate);
  }, [selectedWeeks, reportType, getWeeksInfo]);

  const toggleWeek = useCallback((weekNum: number) => {
    setSelectedWeeks(prev =>
      prev.includes(weekNum) ? prev.filter(w => w !== weekNum) : [...prev, weekNum].sort((a, b) => a - b)
    );
  }, []);

  const toggleAllWeeks = useCallback(() => {
    const weeksInfo = getWeeksInfo();
    setSelectedWeeks(prev =>
      prev.length === weeksInfo.length ? [] : weeksInfo.map(w => w.weekNumber)
    );
  }, [getWeeksInfo]);

  const handleReportTypeChange = useCallback((v: "daily" | "periodic") => {
    setReportType(v);
    if (v === "daily") {
      setDateToDate(dateFromDate);
      setSelectedWeeks([]);
    } else {
      const weeksInfo = getWeeksInfo();
      const activeWeek = weeksInfo.find(w => w.weekNumber === currentWeek) || weeksInfo[0];
      if (activeWeek) {
        setSelectedWeeks([activeWeek.weekNumber]);
        setDateFromDate(activeWeek.startDate);
        setDateToDate(activeWeek.endDate);
      }
    }
  }, [dateFromDate, getWeeksInfo, currentWeek]);

  // Fetch periods per week when class changes
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!selectedClass) return;
      const { data } = await supabase.from("class_schedules").select("periods_per_week").eq("class_id", selectedClass).single();
      setPeriodsPerWeek(data?.periods_per_week || 5);
    };
    fetchSchedule();
  }, [selectedClass]);

  // Fetch classes
  useEffect(() => {
    if (!permsLoaded) return;
    const fetchClasses = async () => {
      if (role === "admin" || teacherPerms.read_only_mode) {
        const { data } = await supabase.from("classes").select("id, name").order("name");
        setClasses(data || []);
        if (data && data.length > 0) setSelectedClass(data[0].id);
      } else if (role === "teacher" && user) {
        const { data: tc } = await supabase
          .from("teacher_classes")
          .select("class_id, classes(id, name)")
          .eq("teacher_id", user.id);
        const cls = (tc || []).map((t: any) => t.classes).filter(Boolean);
        setClasses(cls);
        if (cls.length > 0) setSelectedClass(cls[0].id);
      }
    };
    fetchClasses();
  }, [role, user, permsLoaded, teacherPerms.read_only_mode]);

  // Fetch students when class changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) { setStudents([]); return; }
      const { data } = await supabase
        .from("students")
        .select("id, full_name, parent_phone")
        .eq("class_id", selectedClass)
        .order("full_name");
      setStudents(data || []);
      setSelectedStudent("all");
    };
    fetchStudents();
  }, [selectedClass]);

  // Auto-fetch attendance when filters change
  useEffect(() => {
    if (selectedClass && dateFrom && dateTo) {
      fetchAttendance();
    }
  }, [selectedClass, dateFrom, dateTo, selectedStudent]);

  const fetchAttendance = async () => {
    if (!selectedClass) return;
    setLoadingAttendance(true);
    let query = supabase
      .from("attendance_records")
      .select("status, notes, date, student_id, students(full_name)")
      .eq("class_id", selectedClass)
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: false });

    if (selectedStudent !== "all") {
      query = query.eq("student_id", selectedStudent);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      const rows: AttendanceRow[] = (data || []).map((r: any) => ({
        student_name: r.students?.full_name || "—",
        student_id: r.student_id,
        date: r.date,
        status: r.status,
        notes: r.notes,
      }));
      setAttendanceData(rows);
    }
    setLoadingAttendance(false);
  };

  const fetchGrades = async () => {
    if (!selectedClass) return;
    setLoadingGrades(true);

    const { data: cats } = await supabase
      .from("grade_categories")
      .select("id, name, weight, max_score")
      .eq("class_id", selectedClass)
      .order("sort_order");

    const categories = cats || [];
    setCategoryNames(categories.map((c) => c.name));

    let studentsQuery = supabase
      .from("students")
      .select("id, full_name")
      .eq("class_id", selectedClass)
      .order("full_name");

    if (selectedStudent !== "all") {
      studentsQuery = studentsQuery.eq("id", selectedStudent);
    }

    const { data: studentsData } = await studentsQuery;
    const filteredStudents = studentsData || [];

    if (!filteredStudents || filteredStudents.length === 0) {
      setGradeData([]);
      setLoadingGrades(false);
      return;
    }

    const studentIds = filteredStudents.map((s) => s.id);
    let gradesQuery = supabase
      .from("grades")
      .select("student_id, category_id, score, created_at")
      .in("student_id", studentIds)
      .gte("created_at", `${dateFrom}T00:00:00`)
      .lte("created_at", `${dateTo}T23:59:59`);

    const { data: grades } = await gradesQuery;

    const gradeMap: Record<string, Record<string, number | null>> = {};
    (grades || []).forEach((g: any) => {
      if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
      gradeMap[g.student_id][g.category_id] = g.score;
    });

    const rows: GradeRow[] = filteredStudents.map((s) => {
      const catScores: Record<string, number | null> = {};
      let total = 0;
      categories.forEach((cat) => {
        const score = gradeMap[s.id]?.[cat.id] ?? null;
        catScores[cat.name] = score;
        if (score !== null) {
          total += (score / cat.max_score) * cat.weight;
        }
      });
      return { student_name: s.full_name, categories: catScores, total: Math.round(total * 100) / 100 };
    });

    setGradeData(rows);
    setLoadingGrades(false);
  };

  // Export functions
  const exportAttendanceExcel = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(
      attendanceData.map((r) => ({
        "اسم الطالب": r.student_name,
        التاريخ: r.date,
        الحالة: STATUS_LABELS[r.status] || r.status,
        ملاحظات: r.notes || "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الحضور");
    safeWriteXLSX(wb, `تقرير_الحضور_${dateFrom}_${dateTo}.xlsx`);
  };

  const exportGradesExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = gradeData.map((r) => {
      const row: Record<string, any> = { "اسم الطالب": r.student_name };
      categoryNames.forEach((name) => {
        row[name] = r.categories[name] ?? "—";
      });
      row["المجموع"] = r.total;
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الدرجات");
    safeWriteXLSX(wb, `تقرير_الدرجات.xlsx`);
  };

  const exportAttendancePDF = async () => {
    const { buildAttendancePDF, savePDFBlob } = await import("@/lib/report-pdf-builders");
    const { blob, fileName } = await buildAttendancePDF(attendanceData, dateFrom, dateTo);
    savePDFBlob(blob, fileName);
  };

  const shareAttendanceWhatsApp = async () => {
    const { buildAttendancePDF, sharePDFBlob } = await import("@/lib/report-pdf-builders");
    const { blob, fileName } = await buildAttendancePDF(attendanceData, dateFrom, dateTo);
    const result = await sharePDFBlob(blob, fileName, `📋 تقرير الحضور — من ${dateFrom} إلى ${dateTo}`);
    toast({ title: result === "shared" ? "تم المشاركة" : "تم تصدير PDF", description: result === "shared" ? "تم مشاركة ملف PDF بنجاح" : "تم تحميل الملف، يمكنك إرفاقه في واتساب" });
  };

  const exportGradesPDF = async () => {
    const { buildGradesPDF, savePDFBlob } = await import("@/lib/report-pdf-builders");
    const { blob, fileName } = await buildGradesPDF(gradeData, categoryNames);
    savePDFBlob(blob, fileName);
  };

  const shareGradesWhatsApp = async () => {
    const { buildGradesPDF, sharePDFBlob } = await import("@/lib/report-pdf-builders");
    const { blob, fileName } = await buildGradesPDF(gradeData, categoryNames);
    const result = await sharePDFBlob(blob, fileName, `📋 تقرير الدرجات`);
    toast({ title: result === "shared" ? "تم المشاركة" : "تم تصدير PDF", description: result === "shared" ? "تم مشاركة ملف PDF بنجاح" : "تم تحميل الملف، يمكنك إرفاقه في واتساب" });
  };

  const className = classes.find((c) => c.id === selectedClass)?.name || "";

  if (permsLoaded && !teacherPerms.can_view_reports && !teacherPerms.read_only_mode) {
    return (
      <div className="space-y-6 animate-fade-in flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mx-auto">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">لا تملك صلاحية عرض التقارير</h2>
          <p className="text-muted-foreground text-sm">تواصل مع المدير لتفعيل صلاحية مشاهدة التقارير</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">التقارير والإحصائيات</h1>
          <p className="text-muted-foreground">تقارير يومية وأسبوعية للحضور والدرجات مع إمكانية التصدير</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => safePrint()}
            className="gap-1.5 text-white"
            style={{ backgroundColor: "hsl(var(--report-btn-print))" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--report-btn-print-hover))")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--report-btn-print))")}
          >
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={sendingSMS}
                className="gap-1.5 text-white"
                style={{ backgroundColor: "hsl(var(--report-btn-send))" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--report-btn-send-hover))")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--report-btn-send))")}
              >
                <Send className="h-4 w-4" />
                {sendingSMS ? "جارٍ الإرسال..." : "إرسال لولي الأمر"}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {selectedStudent !== "all" && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">إرسال فردي عبر SMS</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleSendSMS({ attendance: true, grades: true })}>
                    <Send className="h-4 w-4 ml-2" />
                    تقرير شامل (حضور + درجات)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSendSMS({ attendance: true, grades: false })}>
                    <ClipboardCheck className="h-4 w-4 ml-2" />
                    تقرير الحضور فقط
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSendSMS({ attendance: false, grades: true })}>
                    <GraduationCap className="h-4 w-4 ml-2" />
                    تقرير الدرجات فقط
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">إرسال فردي عبر واتساب</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleSendWhatsApp({ attendance: true, grades: true })}>
                    <MessageCircle className="h-4 w-4 ml-2 text-green-500" />
                    تقرير شامل (حضور + درجات)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSendWhatsApp({ attendance: true, grades: false })}>
                    <MessageCircle className="h-4 w-4 ml-2 text-green-500" />
                    تقرير الحضور فقط
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSendWhatsApp({ attendance: false, grades: true })}>
                    <MessageCircle className="h-4 w-4 ml-2 text-green-500" />
                    تقرير الدرجات فقط
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                <Users2 className="h-3 w-3 inline ml-1" />
                إرسال جماعي لكل الفصل عبر SMS
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setBulkConfirm({ open: true, sections: { attendance: true, grades: true } })}>
                <Users2 className="h-4 w-4 ml-2" />
                تقرير شامل لجميع الطلاب
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkConfirm({ open: true, sections: { attendance: true, grades: false } })}>
                <Users2 className="h-4 w-4 ml-2" />
                تقرير الحضور لجميع الطلاب
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkConfirm({ open: true, sections: { attendance: false, grades: true } })}>
                <Users2 className="h-4 w-4 ml-2" />
                تقرير الدرجات لجميع الطلاب
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bulk send progress */}
      {bulkProgress.active && (
        <Card className="border-0 shadow-lg bg-card/80 print:hidden">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Users2 className="h-5 w-5 text-primary" />
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">جارٍ الإرسال الجماعي...</span>
                  <span className="text-muted-foreground">{bulkProgress.current} / {bulkProgress.total}</span>
                </div>
                <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <ReportFilters
        classes={classes}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        students={students}
        selectedStudent={selectedStudent}
        setSelectedStudent={setSelectedStudent}
        reportType={reportType}
        setReportType={handleReportTypeChange}
        dateFromDate={dateFromDate}
        setDateFromDate={setDateFromDate}
        dateToDate={dateToDate}
        setDateToDate={setDateToDate}
        selectedWeeks={selectedWeeks}
        toggleWeek={toggleWeek}
        toggleAllWeeks={toggleAllWeeks}
        getWeeksInfo={getWeeksInfo}
        currentWeek={currentWeek}
      />

      {/* Report Tabs */}
      <Tabs defaultValue="attendance" dir="rtl">
        <TabsList className="report-tabs-list w-full justify-start print:hidden h-auto p-1.5 gap-1.5 bg-muted/60 rounded-xl">
          <TabsTrigger value="attendance" className="report-tab report-tab--attendance gap-1.5 rounded-lg px-4 py-2.5 font-medium transition-all">
            <ClipboardCheck className="h-4 w-4" />
            تقرير الحضور
          </TabsTrigger>
          <TabsTrigger value="grades" className="report-tab report-tab--grades gap-1.5 rounded-lg px-4 py-2.5 font-medium transition-all">
            <GraduationCap className="h-4 w-4" />
            تقرير الدرجات
          </TabsTrigger>
          <TabsTrigger value="behavior" className="report-tab report-tab--behavior gap-1.5 rounded-lg px-4 py-2.5 font-medium transition-all">
            <Heart className="h-4 w-4" />
            تقرير السلوك
          </TabsTrigger>
          <TabsTrigger value="analytics" className="report-tab gap-1.5 rounded-lg px-4 py-2.5 font-medium transition-all data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400">
            <Trophy className="h-4 w-4" />
            التحليل الشهري
          </TabsTrigger>
          <TabsTrigger value="comprehensive" className="report-tab gap-1.5 rounded-lg px-4 py-2.5 font-medium transition-all data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400">
            <FileText className="h-4 w-4" />
            تقارير شاملة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <AttendanceReportTab
            attendanceData={attendanceData}
            loadingAttendance={loadingAttendance}
            selectedClass={selectedClass}
            fetchAttendance={fetchAttendance}
            onPreview={() => { setPreviewType("attendance"); setPreviewOpen(true); }}
            exportAttendanceExcel={exportAttendanceExcel}
            exportAttendancePDF={exportAttendancePDF}
            shareAttendanceWhatsApp={shareAttendanceWhatsApp}
            reportType={reportType}
            students={students}
            periodsPerWeek={periodsPerWeek}
            dateFrom={dateFrom}
            dateTo={dateTo}
            className={className}
          />
        </TabsContent>

        <TabsContent value="grades">
          <GradesReportTab
            gradeData={gradeData}
            categoryNames={categoryNames}
            loadingGrades={loadingGrades}
            selectedClass={selectedClass}
            fetchGrades={fetchGrades}
            onPreview={() => { setPreviewType("grades"); setPreviewOpen(true); }}
            exportGradesExcel={exportGradesExcel}
            exportGradesPDF={exportGradesPDF}
            shareGradesWhatsApp={shareGradesWhatsApp}
          />
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <BehaviorReport selectedClass={selectedClass} dateFrom={dateFrom} dateTo={dateTo} selectedStudent={selectedStudent} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <MonthlyAnalytics selectedClass={selectedClass} classes={classes} />
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-4">
          <ComprehensiveExport classes={classes} />
        </TabsContent>
      </Tabs>

      {/* Print Preview Dialog */}
      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        reportType={previewType}
        title={previewType === "attendance" ? "تقرير الحضور" : previewType === "grades" ? "تقرير الدرجات" : "تقرير السلوك"}
      >
        {previewType === "attendance" && attendanceData.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              {[
                { label: "إجمالي السجلات", value: attendanceSummary.total, bg: "#f1f5f9", border: "#94a3b8", color: "#334155" },
                { label: "حاضر", value: attendanceSummary.present, bg: "#ecfdf5", border: "#34d399", color: "#059669" },
                { label: "غائب", value: attendanceSummary.absent, bg: "#fef2f2", border: "#fca5a5", color: "#dc2626" },
                { label: "متأخر", value: attendanceSummary.late, bg: "#fffbeb", border: "#fbbf24", color: "#d97706" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    border: `2px solid ${stat.border}`,
                    borderRadius: "12px",
                    padding: "14px 8px",
                    textAlign: "center",
                    backgroundColor: stat.bg,
                  }}
                >
                  <p style={{ fontSize: "22px", fontWeight: 700, color: stat.color, margin: 0, lineHeight: 1.2 }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0", fontWeight: 500 }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "#334155", backgroundColor: "#f8fafc" }}>اسم الطالب</th>
                  <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "#334155", backgroundColor: "#f8fafc" }}>التاريخ</th>
                  <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "#334155", backgroundColor: "#f8fafc" }}>الحالة</th>
                  <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "#334155", backgroundColor: "#f8fafc" }}>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                    <td style={{ padding: "8px", fontWeight: 500, color: "#1e293b" }}>{row.student_name}</td>
                    <td style={{ padding: "8px", color: "#64748b" }}>{row.date}</td>
                    <td style={{
                      padding: "8px",
                      fontWeight: 600,
                      color: row.status === "present" ? "#059669" : row.status === "absent" ? "#dc2626" : row.status === "late" ? "#d97706" : row.status === "early_leave" ? "#2563eb" : row.status === "sick_leave" ? "#7c3aed" : "#1e293b",
                      backgroundColor: row.status === "present" ? "#ecfdf5" : row.status === "absent" ? "#fef2f2" : row.status === "late" ? "#fffbeb" : row.status === "early_leave" ? "#eff6ff" : row.status === "sick_leave" ? "#f5f3ff" : "transparent",
                      borderRadius: "6px",
                    }}>{STATUS_LABELS[row.status] || row.status}</td>
                    <td style={{ padding: "8px", color: "#64748b" }}>{row.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {previewType === "grades" && gradeData.length > 0 && (
          <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "#334155", backgroundColor: "#f8fafc" }}>اسم الطالب</th>
                {categoryNames.map((name) => (
                  <th key={name} style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: "#334155", backgroundColor: "#f8fafc" }}>{name}</th>
                ))}
                <th style={{ textAlign: "center", padding: "10px 8px", fontWeight: 600, color: "#1d4ed8", backgroundColor: "#eff6ff" }}>المجموع</th>
              </tr>
            </thead>
            <tbody>
              {gradeData.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td style={{ padding: "8px", fontWeight: 500, color: "#1e293b" }}>{row.student_name}</td>
                  {categoryNames.map((name) => (
                    <td key={name} style={{ textAlign: "center", padding: "8px", color: "#475569" }}>{row.categories[name] ?? "—"}</td>
                  ))}
                  <td style={{ textAlign: "center", padding: "8px", fontWeight: 700, color: "#1d4ed8" }}>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintPreviewDialog>

      {/* Bulk send confirmation dialog */}
      <BulkSendConfirmDialog
        open={bulkConfirm.open}
        onOpenChange={(open) => setBulkConfirm((prev) => ({ ...prev, open }))}
        students={students}
        onConfirm={() => handleBulkSendSMS(bulkConfirm.sections)}
      />
    </div>
  );
}
