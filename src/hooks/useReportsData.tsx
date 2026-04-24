import { useEffect, useState, useMemo, useCallback } from "react";
import { safeWriteXLSX } from "@/lib/download-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { format } from "date-fns";
import { useReportSending, type AttendanceRow, type GradeRow, type CategoryMeta } from "@/hooks/useReportSending";

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  early_leave: "خروج مبكر",
  sick_leave: "إجازة مرضية",
};

export interface ClassOption {
  id: string;
  name: string;
}

export { STATUS_LABELS };
export type { AttendanceRow, GradeRow, CategoryMeta };

export function useReportsData() {
  const { role, user } = useAuth();
  const { perms: teacherPerms, loaded: permsLoaded } = useTeacherPermissions();
  const { getWeeksInfo, currentWeek } = useAcademicWeek();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [dateFromDate, setDateFromDate] = useState<Date>(new Date());
  const [dateToDate, setDateToDate] = useState<Date>(new Date());
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
  const [reportType, setReportType] = useState<"daily" | "periodic" | "semester">("daily");
  const dateFrom = format(dateFromDate, "yyyy-MM-dd");
  const dateTo = format(dateToDate, "yyyy-MM-dd");

  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [students, setStudents] = useState<{ id: string; full_name: string; parent_phone: string | null; class_id: string | null }[]>([]);

  const [attendanceData, setAttendanceData] = useState<AttendanceRow[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const [gradeData, setGradeData] = useState<GradeRow[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [categoryMeta, setCategoryMeta] = useState<CategoryMeta[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [gradesScope, setGradesScope] = useState<"current" | "all">("current");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<"attendance" | "grades" | "behavior">("attendance");

  const [periodsPerWeek, setPeriodsPerWeek] = useState(5);

  const attendanceSummary = useMemo(() => {
    const total = attendanceData.length;
    const present = attendanceData.filter((r) => r.status === "present").length;
    const absent = attendanceData.filter((r) => r.status === "absent").length;
    const late = attendanceData.filter((r) => r.status === "late").length;
    return { total, present, absent, late };
  }, [attendanceData]);

  const reportSending = useReportSending({
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

  // Sync dates when selectedWeeks changes
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

  const handleReportTypeChange = useCallback((v: "daily" | "periodic" | "semester") => {
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

  // Fetch periods per week
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!selectedClass || selectedClass === "all") { setPeriodsPerWeek(5); return; }
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

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) { setStudents([]); return; }
      if (selectedClass === "all") {
        // Fetch students from all teacher's classes
        const classIds = classes.map(c => c.id);
        if (classIds.length === 0) { setStudents([]); return; }
        const { data } = await supabase
          .from("students")
          .select("id, full_name, parent_phone, class_id")
          .in("class_id", classIds)
          .order("full_name");
        setStudents(data || []);
        setSelectedStudent("all");
        return;
      }
      const { data } = await supabase
        .from("students")
        .select("id, full_name, parent_phone, class_id")
        .eq("class_id", selectedClass)
        .order("full_name");
      setStudents(data || []);
      setSelectedStudent("all");
    };
    fetchStudents();
  }, [selectedClass, classes]);

  // Auto-fetch attendance
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
      .select("status, notes, date, student_id, class_id, students(full_name, class_id), classes:class_id(name)")
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: false });

    if (selectedClass === "all") {
      const classIds = classes.map(c => c.id);
      if (classIds.length > 0) {
        query = query.in("class_id", classIds);
      }
    } else {
      query = query.eq("class_id", selectedClass);
    }

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
        class_name: (r.classes as any)?.name || "",
      }));
      setAttendanceData(rows);
    }
    setLoadingAttendance(false);
  };

  const fetchGrades = async () => {
    if (!selectedClass) return;
    setLoadingGrades(true);

    // Determine which classes to fetch from
    const useAllClasses = gradesScope === "all";
    const targetClassIds = useAllClasses
      ? classes.map((c) => c.id)
      : (selectedClass === "all" ? classes.map((c) => c.id) : [selectedClass]);

    if (targetClassIds.length === 0) {
      setGradeData([]); setCategoryNames([]); setCategoryMeta([]);
      setLoadingGrades(false);
      return;
    }

    // Fetch categories from target classes
    const { data: cats } = await supabase
      .from("grade_categories")
      .select("id, name, weight, max_score, category_group, class_id")
      .in("class_id", targetClassIds)
      .order("sort_order");

    // Deduplicate categories by name (merge equivalent categories across classes)
    const categoriesByName = new Map<string, any>();
    const catIdToName = new Map<string, string>();
    (cats || []).forEach((c: any) => {
      if (!categoriesByName.has(c.name)) {
        categoriesByName.set(c.name, {
          id: c.id, name: c.name,
          max_score: Number(c.max_score) || 100,
          weight: Number(c.weight) || 0,
          group: c.category_group,
        });
      }
      catIdToName.set(c.id, c.name);
    });
    const categories = Array.from(categoriesByName.values());
    setCategoryNames(categories.map((c) => c.name));
    setCategoryMeta(categories);

    // Fetch students from target classes
    let studentsQuery = supabase
      .from("students")
      .select("id, full_name, class_id")
      .in("class_id", targetClassIds)
      .order("full_name");

    if (!useAllClasses && selectedStudent !== "all" && selectedClass !== "all") {
      studentsQuery = studentsQuery.eq("id", selectedStudent);
    }

    const { data: studentsData } = await studentsQuery;
    const filteredStudents = studentsData || [];

    if (filteredStudents.length === 0) {
      setGradeData([]);
      setLoadingGrades(false);
      return;
    }

    const studentIds = filteredStudents.map((s) => s.id);
    const { data: grades } = await supabase
      .from("grades")
      .select("student_id, category_id, score, created_at")
      .in("student_id", studentIds)
      .gte("created_at", `${dateFrom}T00:00:00`)
      .lte("created_at", `${dateTo}T23:59:59`);

    // Map: student_id -> categoryName -> score (handles duplicate cat ids across classes)
    const gradeMap: Record<string, Record<string, number | null>> = {};
    (grades || []).forEach((g: any) => {
      const name = catIdToName.get(g.category_id);
      if (!name) return;
      if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
      gradeMap[g.student_id][name] = g.score;
    });

    const rows: GradeRow[] = filteredStudents.map((s: any) => {
      const catScores: Record<string, number | null> = {};
      let total = 0;
      categories.forEach((cat) => {
        const score = gradeMap[s.id]?.[cat.name] ?? null;
        catScores[cat.name] = score;
        if (score !== null) {
          total += (score / cat.max_score) * cat.weight;
        }
      });
      return {
        student_id: s.id,
        student_name: s.full_name,
        categories: catScores,
        total: Math.round(total * 100) / 100,
      };
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
      categoryNames.forEach((name) => { row[name] = r.categories[name] ?? "—"; });
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

  const className = selectedClass === "all" ? "جميع الفصول" : (classes.find((c) => c.id === selectedClass)?.name || "");

  return {
    // Auth & permissions
    permsLoaded,
    teacherPerms,
    // Classes & students
    classes,
    selectedClass,
    setSelectedClass,
    students,
    selectedStudent,
    setSelectedStudent,
    className,
    // Dates & weeks
    dateFromDate,
    setDateFromDate,
    dateToDate,
    setDateToDate,
    dateFrom,
    dateTo,
    reportType,
    handleReportTypeChange,
    selectedWeeks,
    toggleWeek,
    toggleAllWeeks,
    getWeeksInfo,
    currentWeek,
    // Attendance
    attendanceData,
    loadingAttendance,
    fetchAttendance,
    attendanceSummary,
    // Grades
    gradeData,
    categoryNames,
    categoryMeta,
    loadingGrades,
    fetchGrades,
    gradesScope,
    setGradesScope,
    // Preview
    previewOpen,
    setPreviewOpen,
    previewType,
    setPreviewType,
    // Schedule
    periodsPerWeek,
    // Exports
    exportAttendanceExcel,
    exportGradesExcel,
    exportAttendancePDF,
    shareAttendanceWhatsApp,
    exportGradesPDF,
    shareGradesWhatsApp,
    // Report sending
    ...reportSending,
  };
}
