import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  BarChart3,
  ClipboardCheck,
  GraduationCap,
  Calendar,
  Users,
  Heart,
  Printer,
  Eye,
  Send,
  UserCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import AttendanceChart from "@/components/reports/AttendanceChart";
import GradesChart from "@/components/reports/GradesChart";
import BehaviorReport from "@/components/reports/BehaviorReport";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";
import PrintPreviewDialog from "@/components/reports/PrintPreviewDialog";
import ReportExportDialog from "@/components/reports/ReportExportDialog";

// ============ Types ============

interface ClassOption {
  id: string;
  name: string;
}

interface AttendanceRow {
  student_name: string;
  student_id?: string;
  date: string;
  status: string;
  notes: string | null;
}

interface GradeRow {
  student_name: string;
  categories: Record<string, number | null>;
  total: number;
}

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  early_leave: "خروج مبكر",
  sick_leave: "إجازة مرضية",
};

// ============ Component ============

export default function ReportsPage() {
  const { role, user } = useAuth();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [reportType, setReportType] = useState<"daily" | "periodic">("daily");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [students, setStudents] = useState<{ id: string; full_name: string; parent_phone: string | null }[]>([]);
  const [sendingSMS, setSendingSMS] = useState(false);

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

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (role === "teacher" && user) {
        const { data: tc } = await supabase
          .from("teacher_classes")
          .select("class_id, classes(id, name)")
          .eq("teacher_id", user.id);
        const cls = (tc || []).map((t: any) => t.classes).filter(Boolean);
        setClasses(cls);
        if (cls.length > 0) setSelectedClass(cls[0].id);
      } else {
        const { data } = await supabase.from("classes").select("id, name").order("name");
        setClasses(data || []);
        if (data && data.length > 0) setSelectedClass(data[0].id);
      }
    };
    fetchClasses();
  }, [role, user]);

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

  // ============ Attendance Report ============

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

  // Attendance summary stats
  const attendanceSummary = useMemo(() => {
    const total = attendanceData.length;
    const present = attendanceData.filter((r) => r.status === "present").length;
    const absent = attendanceData.filter((r) => r.status === "absent").length;
    const late = attendanceData.filter((r) => r.status === "late").length;
    return { total, present, absent, late };
  }, [attendanceData]);

  // ============ Grades Report ============

  const fetchGrades = async () => {
    if (!selectedClass) return;
    setLoadingGrades(true);

    // Fetch categories for this class
    const { data: cats } = await supabase
      .from("grade_categories")
      .select("id, name, weight, max_score")
      .eq("class_id", selectedClass)
      .order("sort_order");

    const categories = cats || [];
    setCategoryNames(categories.map((c) => c.name));

    // Fetch students in class (or single student)
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

    // Fetch grades filtered by date range
    const studentIds = filteredStudents.map((s) => s.id);
    let gradesQuery = supabase
      .from("grades")
      .select("student_id, category_id, score, created_at")
      .in("student_id", studentIds)
      .gte("created_at", `${dateFrom}T00:00:00`)
      .lte("created_at", `${dateTo}T23:59:59`);

    const { data: grades } = await gradesQuery;

    // Build lookup
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

  // ============ Export Functions ============

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
    XLSX.writeFile(wb, `تقرير_الحضور_${dateFrom}_${dateTo}.xlsx`);
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
    XLSX.writeFile(wb, `تقرير_الدرجات.xlsx`);
  };

  const exportAttendancePDF = async () => {
    const { createArabicPDF, getArabicTableStyles } = await import("@/lib/arabic-pdf");
    const doc = await createArabicPDF({ orientation: "landscape" });
    const tableStyles = getArabicTableStyles();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text("تقرير الحضور", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`من: ${dateFrom}  إلى: ${dateTo}`, pageWidth / 2, 24, { align: "center" });

    const tableData = attendanceData.map((r) => [
      r.notes || "",
      STATUS_LABELS[r.status] || r.status,
      r.date,
      r.student_name,
    ]);

    (doc as any).autoTable({
      startY: 32,
      head: [["ملاحظات", "الحالة", "التاريخ", "اسم الطالب"]],
      body: tableData,
      ...tableStyles,
      columnStyles: { 3: { halign: "right" } },
    });

    doc.save(`تقرير_الحضور_${dateFrom}_${dateTo}.pdf`);
  };

  const exportGradesPDF = async () => {
    const { createArabicPDF, getArabicTableStyles } = await import("@/lib/arabic-pdf");
    const doc = await createArabicPDF({ orientation: "landscape" });
    const tableStyles = getArabicTableStyles();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text("تقرير الدرجات", pageWidth / 2, 15, { align: "center" });

    const head = ["المجموع", ...categoryNames.slice().reverse(), "اسم الطالب"];
    const body = gradeData.map((r) => [
      String(r.total),
      ...categoryNames.slice().reverse().map((n) => (r.categories[n] !== null ? String(r.categories[n]) : "—")),
      r.student_name,
    ]);

    (doc as any).autoTable({
      startY: 25,
      head: [head],
      body,
      ...tableStyles,
      columnStyles: { [head.length - 1]: { halign: "right" } },
    });

    doc.save(`تقرير_الدرجات.pdf`);
  };

  // ============ Print & Send ============

  const handlePrint = () => {
    window.print();
  };

  const handleSendSMS = async () => {
    if (selectedStudent === "all") {
      toast({ title: "تنبيه", description: "اختر طالب محدد لإرسال التقرير لولي أمره", variant: "destructive" });
      return;
    }
    const student = students.find((s) => s.id === selectedStudent);
    if (!student?.parent_phone) {
      toast({ title: "تنبيه", description: "لا يوجد رقم هاتف لولي أمر هذا الطالب", variant: "destructive" });
      return;
    }

    setSendingSMS(true);
    const message = `تقرير الطالب: ${student.full_name}\nالفترة: ${dateFrom} - ${dateTo}\nحاضر: ${attendanceSummary.present} | غائب: ${attendanceSummary.absent} | متأخر: ${attendanceSummary.late}`;

    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: { phone: student.parent_phone, message },
    });

    if (error || !data?.success) {
      toast({ title: "خطأ", description: "فشل إرسال الرسالة", variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم إرسال التقرير لولي الأمر بنجاح" });
    }
    setSendingSMS(false);
  };

  // ============ Render ============

  const className = classes.find((c) => c.id === selectedClass)?.name || "";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">التقارير والإحصائيات</h1>
          <p className="text-muted-foreground">تقارير يومية وفترية للحضور والدرجات مع إمكانية التصدير</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-white"
            style={{ backgroundColor: "hsl(var(--report-btn-print))" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--report-btn-print-hover))")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--report-btn-print))")}
          >
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <Button
            size="sm"
            onClick={handleSendSMS}
            disabled={sendingSMS || selectedStudent === "all"}
            className="gap-1.5 text-white"
            style={{ backgroundColor: "hsl(var(--report-btn-send))" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--report-btn-send-hover))")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--report-btn-send))")}
          >
            <Send className="h-4 w-4" />
            {sendingSMS ? "جارٍ الإرسال..." : "إرسال لولي الأمر"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-card print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs">الفصل</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفصل" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs">الطالب</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الطلاب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الطلاب</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نوع التقرير</Label>
              <Select value={reportType} onValueChange={(v: "daily" | "periodic") => {
                setReportType(v);
                if (v === "daily") {
                  setDateTo(dateFrom);
                }
              }}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">يومي</SelectItem>
                  <SelectItem value="periodic">فتري</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{reportType === "daily" ? "التاريخ" : "من تاريخ"}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  if (reportType === "daily") setDateTo(e.target.value);
                }}
                className="w-40"
              />
            </div>
            {reportType === "periodic" && (
              <div className="space-y-1.5">
                <Label className="text-xs">إلى تاريخ</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
        </TabsList>

        {/* ===== Attendance Report ===== */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="flex items-center gap-2 print:hidden">
            <Button onClick={fetchAttendance} disabled={loadingAttendance || !selectedClass}>
              <BarChart3 className="h-4 w-4 ml-1.5" />
              {loadingAttendance ? "جارٍ التحميل..." : "عرض التقرير"}
            </Button>
            {attendanceData.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setPreviewType("attendance"); setPreviewOpen(true); }} className="gap-1.5">
                  <Eye className="h-4 w-4" />
                  معاينة
                </Button>
                <ReportExportDialog
                  title="تصدير تقرير الحضور"
                  onExportExcel={exportAttendanceExcel}
                  onExportPDF={exportAttendancePDF}
                />
              </>
            )}
          </div>

          {attendanceData.length > 0 && (
            <div className="print-area space-y-4">
              <ReportPrintHeader reportType="attendance" />
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{attendanceSummary.total}</p>
                    <p className="text-xs text-muted-foreground">إجمالي السجلات</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{attendanceSummary.present}</p>
                    <p className="text-xs text-muted-foreground">حاضر</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">{attendanceSummary.absent}</p>
                    <p className="text-xs text-muted-foreground">غائب</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{attendanceSummary.late}</p>
                    <p className="text-xs text-muted-foreground">متأخر</p>
                  </CardContent>
                </Card>
              </div>

              {/* Attendance Chart */}
              <AttendanceChart data={attendanceData} />

              {/* Data Table */}
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">اسم الطالب</TableHead>
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                          <TableHead className="text-right">ملاحظات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{row.student_name}</TableCell>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  row.status === "present"
                                    ? "default"
                                    : row.status === "absent"
                                    ? "destructive"
                                    : "secondary"
                                }
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
                </CardContent>
              </Card>
            </div>
          )}

          {!loadingAttendance && attendanceData.length === 0 && (
            <Card className="print:hidden">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">اختر الفصل والتواريخ ثم اضغط "عرض التقرير"</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== Grades Report ===== */}
        <TabsContent value="grades" className="space-y-4">
          <div className="flex items-center gap-2 print:hidden">
            <Button onClick={fetchGrades} disabled={loadingGrades || !selectedClass}>
              <BarChart3 className="h-4 w-4 ml-1.5" />
              {loadingGrades ? "جارٍ التحميل..." : "عرض التقرير"}
            </Button>
            {gradeData.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setPreviewType("grades"); setPreviewOpen(true); }} className="gap-1.5">
                  <Eye className="h-4 w-4" />
                  معاينة
                </Button>
                <ReportExportDialog
                  title="تصدير تقرير الدرجات"
                  onExportExcel={exportGradesExcel}
                  onExportPDF={exportGradesPDF}
                />
              </>
            )}
          </div>

          {gradeData.length > 0 && (
            <div className="print-area space-y-4">
              <ReportPrintHeader reportType="grades" />
              {/* Grades Chart */}
              <GradesChart data={gradeData} categoryNames={categoryNames} />

              <Card className="shadow-card">
              <CardContent className="pt-4">
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">اسم الطالب</TableHead>
                        {categoryNames.map((name) => (
                          <TableHead key={name} className="text-center">
                            {name}
                          </TableHead>
                        ))}
                        <TableHead className="text-center">المجموع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeData.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.student_name}</TableCell>
                          {categoryNames.map((name) => (
                            <TableCell key={name} className="text-center">
                              {row.categories[name] !== null ? row.categories[name] : "—"}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-bold">{row.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {!loadingGrades && gradeData.length === 0 && (
            <Card className="print:hidden">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">اختر الفصل ثم اضغط "عرض التقرير"</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== Behavior Report ===== */}
        <TabsContent value="behavior" className="space-y-4">
          <BehaviorReport selectedClass={selectedClass} dateFrom={dateFrom} dateTo={dateTo} selectedStudent={selectedStudent} />
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
            <div className="grid grid-cols-4 gap-3">
              <div className="border rounded-lg p-3 text-center">
                <p className="text-xl font-bold">{attendanceSummary.total}</p>
                <p className="text-xs text-gray-500">إجمالي السجلات</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-xl font-bold" style={{ color: "#16a34a" }}>{attendanceSummary.present}</p>
                <p className="text-xs text-gray-500">حاضر</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-xl font-bold" style={{ color: "#dc2626" }}>{attendanceSummary.absent}</p>
                <p className="text-xs text-gray-500">غائب</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-xl font-bold" style={{ color: "#ca8a04" }}>{attendanceSummary.late}</p>
                <p className="text-xs text-gray-500">متأخر</p>
              </div>
            </div>
            <table className="w-full text-sm border-collapse" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              <thead>
                <tr className="border-b">
                  <th className="text-right p-2">اسم الطالب</th>
                  <th className="text-right p-2">التاريخ</th>
                  <th className="text-right p-2">الحالة</th>
                  <th className="text-right p-2">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((row, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 font-medium">{row.student_name}</td>
                    <td className="p-2">{row.date}</td>
                    <td className="p-2">{STATUS_LABELS[row.status] || row.status}</td>
                    <td className="p-2 text-gray-500">{row.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {previewType === "grades" && gradeData.length > 0 && (
          <table className="w-full text-sm border-collapse" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
            <thead>
              <tr className="border-b">
                <th className="text-right p-2">اسم الطالب</th>
                {categoryNames.map((name) => (
                  <th key={name} className="text-center p-2">{name}</th>
                ))}
                <th className="text-center p-2">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {gradeData.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 font-medium">{row.student_name}</td>
                  {categoryNames.map((name) => (
                    <td key={name} className="text-center p-2">{row.categories[name] ?? "—"}</td>
                  ))}
                  <td className="text-center p-2 font-bold">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintPreviewDialog>
    </div>
  );
}
