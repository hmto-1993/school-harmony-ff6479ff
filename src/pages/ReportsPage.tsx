import { useEffect, useState, useMemo } from "react";
import { safePrint } from "@/lib/print-utils";
import { safeWriteXLSX, safeSavePDF } from "@/lib/download-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
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
  ChevronDown,
  MessageCircle,
  Users2,
  Trophy,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { HijriDatePicker } from "@/components/ui/hijri-date-picker";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { Badge } from "@/components/ui/badge";
import AttendanceChart from "@/components/reports/AttendanceChart";
import AttendanceWeeklyReport from "@/components/reports/AttendanceWeeklyReport";
import GradesChart from "@/components/reports/GradesChart";
import BehaviorReport from "@/components/reports/BehaviorReport";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";
import PrintPreviewDialog from "@/components/reports/PrintPreviewDialog";
import ReportExportDialog from "@/components/reports/ReportExportDialog";
import MonthlyAnalytics from "@/components/reports/MonthlyAnalytics";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

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
  const { getWeeksInfo, currentWeek } = useAcademicWeek();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [dateFromDate, setDateFromDate] = useState<Date>(new Date());
  const [dateToDate, setDateToDate] = useState<Date>(new Date());
  const dateFrom = format(dateFromDate, "yyyy-MM-dd");
  const dateTo = format(dateToDate, "yyyy-MM-dd");
  const [reportType, setReportType] = useState<"daily" | "periodic">("daily");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [students, setStudents] = useState<{ id: string; full_name: string; parent_phone: string | null }[]>([]);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; active: boolean }>({ current: 0, total: 0, active: false });
  const [bulkConfirm, setBulkConfirm] = useState<{ open: boolean; sections: { attendance: boolean; grades: boolean } }>({ open: false, sections: { attendance: true, grades: true } });

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
    const { createArabicPDF, getArabicTableStyles } = await import("@/lib/arabic-pdf");
    const { doc, startY } = await createArabicPDF({ orientation: "landscape", reportType: "attendance", includeHeader: true });
    const tableStyles = getArabicTableStyles();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text("تقرير الحضور", pageWidth / 2, startY, { align: "center" });
    doc.setFontSize(10);
    doc.text(`من: ${dateFrom}  إلى: ${dateTo}`, pageWidth / 2, startY + 7, { align: "center" });

    const tableData = attendanceData.map((r) => [
      r.notes || "",
      STATUS_LABELS[r.status] || r.status,
      r.date,
      r.student_name,
    ]);

    (doc as any).autoTable({
      startY: startY + 12,
      head: [["ملاحظات", "الحالة", "التاريخ", "اسم الطالب"]],
      body: tableData,
      ...tableStyles,
      columnStyles: { 3: { halign: "right" } },
    });

    safeSavePDF(doc, `تقرير_الحضور_${dateFrom}_${dateTo}.pdf`);
  };

  const exportGradesPDF = async () => {
    const { createArabicPDF, getArabicTableStyles } = await import("@/lib/arabic-pdf");
    const { doc, startY } = await createArabicPDF({ orientation: "landscape", reportType: "grades", includeHeader: true });
    const tableStyles = getArabicTableStyles();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text("تقرير الدرجات", pageWidth / 2, startY, { align: "center" });

    const head = ["المجموع", ...categoryNames.slice().reverse(), "اسم الطالب"];
    const body = gradeData.map((r) => [
      String(r.total),
      ...categoryNames.slice().reverse().map((n) => (r.categories[n] !== null ? String(r.categories[n]) : "—")),
      r.student_name,
    ]);

    (doc as any).autoTable({
      startY: startY + 6,
      head: [head],
      body,
      ...tableStyles,
      columnStyles: { [head.length - 1]: { halign: "right" } },
    });

    safeSavePDF(doc, `تقرير_الدرجات.pdf`);
  };

  // ============ Print & Send ============

  const handlePrint = () => {
    safePrint();
  };

  const generateStudentReportPDF = async (studentName: string, sections: { attendance: boolean; grades: boolean }): Promise<ArrayBuffer | null> => {
    try {
      const { createArabicPDF, getArabicTableStyles } = await import("@/lib/arabic-pdf");
      const autoTableImport = await import("jspdf-autotable");
      const autoTable = autoTableImport.default;
      const reportType = sections.attendance && !sections.grades ? "attendance" : sections.grades && !sections.attendance ? "grades" : "attendance";
      const { doc, startY } = await createArabicPDF({ orientation: "landscape", reportType, includeHeader: true });
      const tableStyles = getArabicTableStyles();
      const pageWidth = doc.internal.pageSize.getWidth();

      const titleText = sections.attendance && sections.grades
        ? `تقرير الطالب: ${studentName}`
        : sections.attendance
        ? `تقرير حضور الطالب: ${studentName}`
        : `تقرير درجات الطالب: ${studentName}`;

      doc.setFontSize(16);
      doc.text(titleText, pageWidth / 2, startY, { align: "center" });
      doc.setFontSize(10);
      doc.text(`الفترة: ${dateFrom} إلى ${dateTo}`, pageWidth / 2, startY + 7, { align: "center" });

      let currentY = startY + 15;

      // Attendance section
      if (sections.attendance && attendanceData.length > 0) {
        doc.setFontSize(13);
        doc.text("تقرير الحضور", pageWidth / 2, currentY, { align: "center" });

        const attTableData = attendanceData.map((r) => [
          r.notes || "",
          STATUS_LABELS[r.status] || r.status,
          r.date,
          r.student_name,
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [["ملاحظات", "الحالة", "التاريخ", "اسم الطالب"]],
          body: attTableData,
          ...tableStyles,
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;

        doc.setFontSize(10);
        doc.text(
          `حاضر: ${attendanceSummary.present} | غائب: ${attendanceSummary.absent} | متأخر: ${attendanceSummary.late} | الإجمالي: ${attendanceSummary.total}`,
          pageWidth / 2,
          currentY,
          { align: "center" }
        );
        currentY += 10;
      }

      // Grades section
      if (sections.grades && gradeData.length > 0) {
        if (sections.attendance && currentY > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage("a4", "landscape");
          currentY = 15;
        }
        doc.setFontSize(13);
        doc.text("تقرير الدرجات", pageWidth / 2, currentY, { align: "center" });

        const head = ["المجموع", ...categoryNames.slice().reverse(), "اسم الطالب"];
        const body = gradeData.map((r) => [
          String(r.total),
          ...categoryNames.slice().reverse().map((n) => (r.categories[n] !== null ? String(r.categories[n]) : "—")),
          r.student_name,
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [head],
          body,
          ...tableStyles,
        });
      }

      return doc.output("arraybuffer");
    } catch (err) {
      console.error("PDF generation error:", err);
      return null;
    }
  };

  const generateAndUploadPDF = async (studentName: string, studentId: string, sections: { attendance: boolean; grades: boolean }): Promise<string | null> => {
    toast({ title: "جارٍ إعداد التقرير...", description: "يتم إنشاء ملف PDF" });
    const pdfBuffer = await generateStudentReportPDF(studentName, sections);
    if (!pdfBuffer) {
      toast({ title: "خطأ", description: "فشل إنشاء ملف PDF", variant: "destructive" });
      return null;
    }

    const fileName = `report_${studentId}_${dateFrom}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      toast({ title: "خطأ", description: "فشل رفع الملف: " + uploadError.message, variant: "destructive" });
      return null;
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from("reports").createSignedUrl(fileName, 3600);
    if (signedUrlError) {
      toast({ title: "خطأ", description: "فشل إنشاء رابط التقرير", variant: "destructive" });
      return null;
    }
    return signedUrlData?.signedUrl || null;
  };

  const getReportLabel = (sections: { attendance: boolean; grades: boolean }) => {
    if (sections.attendance && sections.grades) return "تقرير شامل";
    if (sections.attendance) return "تقرير الحضور";
    return "تقرير الدرجات";
  };

  const validateStudentForSend = (): { id: string; full_name: string; parent_phone: string } | null => {
    if (selectedStudent === "all") {
      toast({ title: "تنبيه", description: "اختر طالب محدد لإرسال التقرير لولي أمره", variant: "destructive" });
      return null;
    }
    const student = students.find((s) => s.id === selectedStudent);
    if (!student?.parent_phone) {
      toast({ title: "تنبيه", description: "لا يوجد رقم هاتف لولي أمر هذا الطالب", variant: "destructive" });
      return null;
    }
    return student as { id: string; full_name: string; parent_phone: string };
  };

  const handleSendSMS = async (sections: { attendance: boolean; grades: boolean }) => {
    const student = validateStudentForSend();
    if (!student) return;

    setSendingSMS(true);
    try {
      const pdfUrl = await generateAndUploadPDF(student.full_name, student.id, sections);
      if (!pdfUrl) { setSendingSMS(false); return; }

      const message = `${getReportLabel(sections)} للطالب: ${student.full_name}\nالفترة: ${dateFrom} - ${dateTo}\n\nلتحميل التقرير PDF:\n${pdfUrl}`;

      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { phone: student.parent_phone, message },
      });

      if (error || !data?.success) {
        toast({ title: "خطأ", description: "فشل إرسال الرسالة", variant: "destructive" });
      } else {
        toast({ title: "تم ✅", description: "تم إرسال التقرير عبر SMS بنجاح" });
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "حدث خطأ غير متوقع", variant: "destructive" });
    }
    setSendingSMS(false);
  };

  const handleSendWhatsApp = async (sections: { attendance: boolean; grades: boolean }) => {
    const student = validateStudentForSend();
    if (!student) return;

    setSendingSMS(true);
    try {
      const pdfUrl = await generateAndUploadPDF(student.full_name, student.id, sections);
      if (!pdfUrl) { setSendingSMS(false); return; }

      // Format phone for wa.me (remove leading 0, add 966)
      let phone = student.parent_phone.replace(/[\s\-\+]/g, "");
      if (phone.startsWith("0")) phone = "966" + phone.slice(1);
      if (!phone.startsWith("966")) phone = "966" + phone;

      const message = `${getReportLabel(sections)} للطالب: ${student.full_name}\nالفترة: ${dateFrom} - ${dateTo}\n\nلتحميل التقرير PDF:\n${pdfUrl}`;
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank");

      toast({ title: "تم ✅", description: "تم فتح واتساب مع رسالة التقرير" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "حدث خطأ غير متوقع", variant: "destructive" });
    }
    setSendingSMS(false);
  };

  const handleBulkSendSMS = async (sections: { attendance: boolean; grades: boolean }) => {
    if (!selectedClass) return;

    const studentsWithPhone = students.filter((s) => s.parent_phone);
    if (studentsWithPhone.length === 0) {
      toast({ title: "تنبيه", description: "لا يوجد طلاب بأرقام هواتف أولياء أمور في هذا الفصل", variant: "destructive" });
      return;
    }

    setSendingSMS(true);
    setBulkProgress({ current: 0, total: studentsWithPhone.length, active: true });

    let successCount = 0;
    let failCount = 0;

    // Fetch all class attendance and grades data once
    const allAttendance: Record<string, AttendanceRow[]> = {};
    const allGrades: Record<string, GradeRow> = {};

    if (sections.attendance) {
      const { data: attData } = await supabase
        .from("attendance_records")
        .select("status, notes, date, student_id, students(full_name)")
        .eq("class_id", selectedClass)
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: false });

      (attData || []).forEach((r: any) => {
        const sid = r.student_id;
        if (!allAttendance[sid]) allAttendance[sid] = [];
        allAttendance[sid].push({
          student_name: r.students?.full_name || "—",
          student_id: sid,
          date: r.date,
          status: r.status,
          notes: r.notes,
        });
      });
    }

    if (sections.grades) {
      const { data: cats } = await supabase
        .from("grade_categories")
        .select("id, name, weight, max_score")
        .eq("class_id", selectedClass)
        .order("sort_order");
      const categories = cats || [];

      const studentIds = studentsWithPhone.map((s) => s.id);
      const { data: gradesData } = await supabase
        .from("grades")
        .select("student_id, category_id, score")
        .in("student_id", studentIds);

      const gradeMap: Record<string, Record<string, number | null>> = {};
      (gradesData || []).forEach((g: any) => {
        if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
        gradeMap[g.student_id][g.category_id] = g.score;
      });

      studentsWithPhone.forEach((s) => {
        const catScores: Record<string, number | null> = {};
        let total = 0;
        categories.forEach((cat) => {
          const score = gradeMap[s.id]?.[cat.id] ?? null;
          catScores[cat.name] = score;
          if (score !== null) total += (score / cat.max_score) * cat.weight;
        });
        allGrades[s.id] = { student_name: s.full_name, categories: catScores, total: Math.round(total * 100) / 100 };
      });
    }

    for (let i = 0; i < studentsWithPhone.length; i++) {
      const student = studentsWithPhone[i];
      setBulkProgress({ current: i + 1, total: studentsWithPhone.length, active: true });

      try {
        // Temporarily set student-specific data for PDF generation
        const studentAttendance = allAttendance[student.id] || [];
        const studentGrade = allGrades[student.id];
        const studentAttSummary = {
          total: studentAttendance.length,
          present: studentAttendance.filter((r) => r.status === "present").length,
          absent: studentAttendance.filter((r) => r.status === "absent").length,
          late: studentAttendance.filter((r) => r.status === "late").length,
        };

        // Generate PDF for this specific student
        const { createArabicPDF, getArabicTableStyles } = await import("@/lib/arabic-pdf");
        const autoTableImport = await import("jspdf-autotable");
        const autoTable = autoTableImport.default;
        const reportType = sections.attendance && !sections.grades ? "attendance" : "grades";
        const { doc, startY } = await createArabicPDF({ orientation: "landscape", reportType, includeHeader: true });
        const tableStyles = getArabicTableStyles();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(16);
        doc.text(`تقرير الطالب: ${student.full_name}`, pageWidth / 2, startY, { align: "center" });
        doc.setFontSize(10);
        doc.text(`الفترة: ${dateFrom} إلى ${dateTo}`, pageWidth / 2, startY + 7, { align: "center" });

        let currentY = startY + 15;

        if (sections.attendance && studentAttendance.length > 0) {
          doc.setFontSize(13);
          doc.text("تقرير الحضور", pageWidth / 2, currentY, { align: "center" });
          autoTable(doc, {
            startY: currentY + 5,
            head: [["ملاحظات", "الحالة", "التاريخ", "اسم الطالب"]],
            body: studentAttendance.map((r) => [r.notes || "", STATUS_LABELS[r.status] || r.status, r.date, r.student_name]),
            ...tableStyles,
          });
          currentY = (doc as any).lastAutoTable.finalY + 10;
          doc.setFontSize(10);
          doc.text(`حاضر: ${studentAttSummary.present} | غائب: ${studentAttSummary.absent} | متأخر: ${studentAttSummary.late}`, pageWidth / 2, currentY, { align: "center" });
          currentY += 10;
        }

        if (sections.grades && studentGrade) {
          if (sections.attendance && currentY > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage("a4", "landscape");
            currentY = 15;
          }
          doc.setFontSize(13);
          doc.text("تقرير الدرجات", pageWidth / 2, currentY, { align: "center" });
          const catNames = Object.keys(studentGrade.categories);
          const head = ["المجموع", ...catNames.slice().reverse(), "اسم الطالب"];
          autoTable(doc, {
            startY: currentY + 5,
            head: [head],
            body: [[String(studentGrade.total), ...catNames.slice().reverse().map((n) => studentGrade.categories[n] !== null ? String(studentGrade.categories[n]) : "—"), studentGrade.student_name]],
            ...tableStyles,
          });
        }

        const pdfBuffer = doc.output("arraybuffer");
        const fileName = `report_${student.id}_${dateFrom}_${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("reports")
          .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

        if (uploadError) { failCount++; continue; }

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from("reports").createSignedUrl(fileName, 3600);
        if (signedUrlError) { failCount++; continue; }
        const pdfUrl = signedUrlData?.signedUrl;

        const message = `${getReportLabel(sections)} للطالب: ${student.full_name}\nالفترة: ${dateFrom} - ${dateTo}\n\nلتحميل التقرير PDF:\n${pdfUrl}`;
        const { data, error } = await supabase.functions.invoke("send-sms", {
          body: { phone: student.parent_phone, message },
        });

        if (error || !data?.success) failCount++;
        else successCount++;
      } catch {
        failCount++;
      }
    }

    setBulkProgress({ current: 0, total: 0, active: false });
    setSendingSMS(false);
    toast({
      title: "تم الإرسال الجماعي ✅",
      description: `نجح: ${successCount} | فشل: ${failCount} من أصل ${studentsWithPhone.length} طالب`,
    });
  };

  // ============ Render ============

  const className = classes.find((c) => c.id === selectedClass)?.name || "";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">التقارير والإحصائيات</h1>
          <p className="text-muted-foreground">تقارير يومية وأسبوعية للحضور والدرجات مع إمكانية التصدير</p>
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
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs font-semibold text-muted-foreground">الفصل</Label>
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
              <Label className="text-xs font-semibold text-muted-foreground">الطالب</Label>
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
              <Label className="text-xs font-semibold text-muted-foreground">نوع التقرير</Label>
              <Select value={reportType} onValueChange={(v: "daily" | "periodic") => {
                setReportType(v);
                if (v === "daily") {
                  setDateToDate(dateFromDate);
                } else {
                  // أسبوعي: اضبط التاريخ للأسبوع الحالي من التقويم الأكاديمي
                  const weeksInfo = getWeeksInfo();
                  const activeWeek = weeksInfo.find(w => w.weekNumber === currentWeek) || weeksInfo[0];
                  if (activeWeek) {
                    setDateFromDate(activeWeek.startDate);
                    setDateToDate(activeWeek.endDate);
                  }
                }
              }}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">يومي</SelectItem>
                  <SelectItem value="periodic">أسبوعي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reportType === "daily" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">التاريخ</Label>
                <HijriDatePicker
                  date={dateFromDate}
                  onDateChange={(d) => {
                    setDateFromDate(d);
                    setDateToDate(d);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">الأسبوع</Label>
                <Select
                  value={(() => {
                    const weeksInfo = getWeeksInfo();
                    const match = weeksInfo.find(w => format(w.startDate, "yyyy-MM-dd") === format(dateFromDate, "yyyy-MM-dd"));
                    return match ? String(match.weekNumber) : "";
                  })()}
                  onValueChange={(v) => {
                    const weeksInfo = getWeeksInfo();
                    const week = weeksInfo.find(w => w.weekNumber === Number(v));
                    if (week) {
                      setDateFromDate(week.startDate);
                      setDateToDate(week.endDate);
                    }
                  }}
                >
                  <SelectTrigger className="w-52" dir="rtl">
                    <SelectValue placeholder="اختر الأسبوع" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64" dir="rtl">
                    {getWeeksInfo().map((w) => (
                      <SelectItem key={w.weekNumber} value={String(w.weekNumber)} dir="rtl">
                        {w.label}{w.weekNumber === currentWeek ? " (الحالي)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {format(dateFromDate, "yyyy-MM-dd")} → {format(dateToDate, "yyyy-MM-dd")}
                </p>
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
          <TabsTrigger value="analytics" className="report-tab gap-1.5 rounded-lg px-4 py-2.5 font-medium transition-all data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400">
            <Trophy className="h-4 w-4" />
            التحليل الشهري
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

              {/* Attendance Chart */}
              <AttendanceChart data={attendanceData} />

              {/* Data Table */}
              <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
                <CardContent className="pt-4">
                  <div className="max-h-[400px] overflow-auto rounded-xl border border-border/30">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-l from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10">
                          <TableHead className="text-right font-semibold">اسم الطالب</TableHead>
                          <TableHead className="text-right font-semibold">التاريخ</TableHead>
                          <TableHead className="text-right font-semibold">الحالة</TableHead>
                          <TableHead className="text-right font-semibold">ملاحظات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceData.map((row, i) => (
                          <TableRow key={i} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                            <TableCell className="font-medium">{row.student_name}</TableCell>
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
                </CardContent>
              </Card>

              {/* Weekly Grid Report */}
              {reportType === "periodic" && (
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

              <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
              <CardContent className="pt-4">
                <div className="max-h-[400px] overflow-auto rounded-xl border border-border/30">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-l from-success/5 to-primary/5 dark:from-success/10 dark:to-primary/10">
                        <TableHead className="text-right font-semibold">اسم الطالب</TableHead>
                        {categoryNames.map((name) => (
                          <TableHead key={name} className="text-center font-semibold">
                            {name}
                          </TableHead>
                        ))}
                        <TableHead className="text-center font-semibold">المجموع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeData.map((row, i) => (
                        <TableRow key={i} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                          <TableCell className="font-medium">{row.student_name}</TableCell>
                          {categoryNames.map((name) => (
                            <TableCell key={name} className="text-center text-muted-foreground">
                              {row.categories[name] !== null ? row.categories[name] : "—"}
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0 font-bold">
                              {row.total}
                            </Badge>
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

          {!loadingGrades && gradeData.length === 0 && (
            <Card className="print:hidden border-0 shadow-lg bg-card/80">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="rounded-2xl bg-gradient-to-br from-success/10 to-primary/10 p-4 mb-4">
                  <Users className="h-10 w-10 text-success/40" />
                </div>
                <p className="text-sm">اختر الفصل ثم اضغط "عرض التقرير"</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== Behavior Report ===== */}
        <TabsContent value="behavior" className="space-y-4">
          <BehaviorReport selectedClass={selectedClass} dateFrom={dateFrom} dateTo={dateTo} selectedStudent={selectedStudent} />
        </TabsContent>

        {/* ===== Monthly Analytics ===== */}
        <TabsContent value="analytics" className="space-y-4">
          <MonthlyAnalytics selectedClass={selectedClass} classes={classes} />
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
      <AlertDialog open={bulkConfirm.open} onOpenChange={(open) => setBulkConfirm((prev) => ({ ...prev, open }))}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الإرسال الجماعي</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>أنت على وشك إرسال التقارير لجميع أولياء أمور الفصل.</p>
                <div className="rounded-xl bg-muted/60 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">إجمالي الطلاب:</span>
                    <Badge variant="secondary" className="text-sm">{students.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">طلاب بأرقام هواتف (سيتم الإرسال):</span>
                    <Badge className="text-sm bg-primary">{students.filter((s) => s.parent_phone).length}</Badge>
                  </div>
                  {students.filter((s) => !s.parent_phone).length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-destructive">طلاب بدون أرقام (لن يتم الإرسال):</span>
                      <Badge variant="destructive" className="text-sm">{students.filter((s) => !s.parent_phone).length}</Badge>
                    </div>
                  )}
                </div>
                {students.filter((s) => !s.parent_phone).length > 0 && (
                  <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
                    <strong>الطلاب بدون أرقام:</strong>{" "}
                    {students.filter((s) => !s.parent_phone).map((s) => s.full_name).join("، ")}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBulkSendSMS(bulkConfirm.sections)}
              disabled={students.filter((s) => s.parent_phone).length === 0}
            >
              <Send className="h-4 w-4 ml-2" />
              إرسال ({students.filter((s) => s.parent_phone).length} طالب)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
