import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { createArabicPDF, getArabicTableStyles } from "@/lib/arabic-pdf";
import { safeWriteXLSX, safeSavePDF } from "@/lib/download-utils";
import autoTable from "jspdf-autotable";

export interface Student {
  id: string;
  full_name: string;
  academic_number: string | null;
  national_id: string | null;
  class_id: string | null;
  parent_phone: string | null;
  classes: { name: string } | null;
}

export interface ImportRow {
  full_name: string;
  academic_number?: string;
  national_id?: string;
  parent_phone?: string;
  valid: boolean;
  error?: string;
}

export function useStudentsData() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [exceededStudents, setExceededStudents] = useState<Set<string>>(new Set());

  // Add/Edit form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", national_id: "", class_id: "", parent_phone: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", national_id: "", class_id: "", parent_phone: "" });

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importClassId, setImportClassId] = useState("");
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });
  const [parsingPdf, setParsingPdf] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTransferClassId, setBulkTransferClassId] = useState("");
  const [bulkTransferring, setBulkTransferring] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Warning slip state
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningStudent, setWarningStudent] = useState<{
    id: string; name: string; className: string; absenceRate: number; totalAbsent: number; totalDays: number;
  } | null>(null);
  const [loadingWarning, setLoadingWarning] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
    supabase.from("classes").select("id, name").order("name").then(({ data }) => setClasses(data || []));
    loadExceededStudents();
  }, []);

  const loadExceededStudents = async () => {
    const { data: settings } = await supabase
      .from("site_settings").select("id, value")
      .in("id", ["absence_threshold", "absence_allowed_sessions", "absence_mode"]);
    let threshold = 20, allowedSessions = 0, mode = "percentage";
    (settings || []).forEach((s: any) => {
      if (s.id === "absence_threshold") threshold = Number(s.value) || 20;
      if (s.id === "absence_allowed_sessions") allowedSessions = Number(s.value) || 0;
      if (s.id === "absence_mode") mode = s.value || "percentage";
    });
    const { data: absentAtt } = await supabase.from("attendance_records").select("student_id").eq("status", "absent");
    const absentCounts: Record<string, number> = {};
    (absentAtt || []).forEach((r: any) => { absentCounts[r.student_id] = (absentCounts[r.student_id] || 0) + 1; });
    const exceeded = new Set<string>();
    if (mode === "sessions" && allowedSessions > 0) {
      Object.entries(absentCounts).forEach(([sid, absent]) => { if (absent > allowedSessions) exceeded.add(sid); });
    } else {
      const studentIdsWithAbsences = Object.keys(absentCounts);
      if (studentIdsWithAbsences.length > 0) {
        const { data: totalAtt } = await supabase.from("attendance_records").select("student_id").in("student_id", studentIdsWithAbsences);
        const totalCounts: Record<string, number> = {};
        (totalAtt || []).forEach((r: any) => { totalCounts[r.student_id] = (totalCounts[r.student_id] || 0) + 1; });
        Object.entries(absentCounts).forEach(([sid, absent]) => {
          const total = totalCounts[sid] || 0;
          if (total > 0 && (absent / total) * 100 >= threshold) exceeded.add(sid);
        });
      }
    }
    setExceededStudents(exceeded);
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from("students")
      .select("id, full_name, academic_number, national_id, class_id, parent_phone, classes(name)")
      .order("full_name");
    setStudents((data as Student[]) || []);
  };

  const handleAdd = async () => {
    if (!form.full_name.trim()) return;
    const { error } = await supabase.from("students").insert({
      full_name: form.full_name, national_id: form.national_id || null,
      class_id: form.class_id || null, parent_phone: form.parent_phone || null,
    });
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "تم", description: "تمت إضافة الطالب بنجاح" });
      setDialogOpen(false);
      setForm({ full_name: "", national_id: "", class_id: "", parent_phone: "" });
      fetchStudents();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("students").delete().eq("id", id);
    toast({ title: "تم", description: "تم حذف الطالب" });
    fetchStudents();
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setEditForm({
      full_name: student.full_name, national_id: student.national_id || "",
      class_id: student.class_id || "", parent_phone: student.parent_phone || "",
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingStudent || !editForm.full_name.trim()) return;
    const { error } = await supabase.from("students").update({
      full_name: editForm.full_name, national_id: editForm.national_id || null,
      class_id: editForm.class_id || null, parent_phone: editForm.parent_phone || null,
    }).eq("id", editingStudent.id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "تم", description: "تم تحديث بيانات الطالب" });
      setEditOpen(false); setEditingStudent(null); fetchStudents();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const filtered = students.filter((s) => {
    const matchSearch = !search.trim() || s.full_name.includes(search) || s.national_id?.includes(search);
    const matchClass = classFilter === "all" || s.class_id === classFilter;
    return matchSearch && matchClass;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(s => s.id)));
  };

  const handleBulkTransfer = async () => {
    if (!bulkTransferClassId || selectedIds.size === 0) return;
    setBulkTransferring(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("students").update({ class_id: bulkTransferClassId }).in("id", ids);
    setBulkTransferring(false);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); }
    else {
      const className = classes.find(c => c.id === bulkTransferClassId)?.name || "";
      toast({ title: "تم النقل", description: `تم نقل ${ids.length} طالب إلى "${className}"` });
      setSelectedIds(new Set()); setBulkTransferClassId(""); fetchStudents();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("students").delete().in("id", ids);
    setBulkDeleting(false); setBulkDeleteConfirmOpen(false);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "تم الحذف", description: `تم حذف ${ids.length} طالب بنجاح` });
      setSelectedIds(new Set()); fetchStudents();
    }
  };

  // Import handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith(".pdf")) await handlePdfFile(file);
    else await handleExcelFile(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleExcelFile = async (file: File) => {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
    const columnMap: Record<string, string[]> = {
      full_name: ["الاسم", "اسم الطالب", "الاسم الكامل", "اسم", "Student Name", "Name", "full_name"],
      academic_number: ["الرقم الأكاديمي", "رقم الطالب", "الرقم", "Academic Number", "Student ID", "academic_number"],
      national_id: ["رقم الهوية", "الهوية", "السجل المدني", "National ID", "Identity", "national_id"],
      parent_phone: ["جوال ولي الأمر", "رقم الجوال", "الجوال", "هاتف ولي الأمر", "رقم ولي الأمر", "Phone", "Parent Phone", "parent_phone", "رقم الهاتف"],
    };
    const findColumn = (row: Record<string, any>, keys: string[]): string | undefined => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") return String(row[key]).trim();
      }
      return undefined;
    };
    const rows: ImportRow[] = json.map((row) => {
      const name = findColumn(row, columnMap.full_name);
      if (!name) return { full_name: "", valid: false, error: "اسم الطالب مطلوب" };
      return {
        full_name: name, academic_number: findColumn(row, columnMap.academic_number),
        national_id: findColumn(row, columnMap.national_id), parent_phone: findColumn(row, columnMap.parent_phone), valid: true,
      };
    }).filter((r) => r.full_name || !r.valid);
    setImportRows(rows); setImportDone(false); setImportStats({ success: 0, failed: 0 });
  };

  const handlePdfFile = async (file: File) => {
    setParsingPdf(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
      const { data, error } = await supabase.functions.invoke("parse-pdf-students", { body: { pdfBase64: base64 } });
      if (error || !data?.students) {
        toast({ title: "خطأ في تحليل PDF", description: data?.error || error?.message || "لم يتم التعرف على بيانات الطلاب", variant: "destructive" });
        setParsingPdf(false); return;
      }
      const rows: ImportRow[] = data.students.map((s: any) => {
        if (!s.full_name?.trim()) return { full_name: "", valid: false, error: "اسم الطالب مطلوب" };
        return {
          full_name: s.full_name.trim(), academic_number: s.academic_number?.toString()?.trim() || undefined,
          national_id: s.national_id?.toString()?.trim() || undefined, parent_phone: s.parent_phone?.toString()?.trim() || undefined, valid: true,
        };
      }).filter((r: ImportRow) => r.full_name || !r.valid);
      setImportRows(rows); setImportDone(false); setImportStats({ success: 0, failed: 0 });
      if (rows.length === 0) toast({ title: "لا توجد بيانات", description: "لم يتم العثور على بيانات طلاب في ملف PDF", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل تحليل ملف PDF", variant: "destructive" });
    }
    setParsingPdf(false);
  };

  const handleImport = async () => {
    if (!importClassId) { toast({ title: "تنبيه", description: "اختر الفصل أولاً", variant: "destructive" }); return; }
    const validRows = importRows.filter((r) => r.valid);
    if (validRows.length === 0) return;
    setImporting(true);
    let success = 0, failed = 0;
    const inserts = validRows.map((r) => ({
      full_name: r.full_name, academic_number: r.academic_number || null,
      national_id: r.national_id || null, parent_phone: r.parent_phone || null, class_id: importClassId,
    }));
    const { error, data } = await supabase.from("students").insert(inserts).select();
    if (error) {
      for (const row of inserts) { const { error: rowErr } = await supabase.from("students").insert(row); if (rowErr) failed++; else success++; }
    } else { success = data?.length || inserts.length; }
    setImportStats({ success, failed }); setImportDone(true); setImporting(false); fetchStudents();
    toast({ title: "نتيجة الاستيراد", description: `تم استيراد ${success} طالب بنجاح${failed > 0 ? `، فشل ${failed}` : ""}`, variant: failed > 0 && success === 0 ? "destructive" : "default" });
  };

  const resetImport = () => { setImportRows([]); setImportDone(false); setImportStats({ success: 0, failed: 0 }); };

  const openWarningSlip = async (student: Student) => {
    setLoadingWarning(student.id);
    const { data: attendance } = await supabase.from("attendance_records").select("status, date").eq("student_id", student.id);
    const records = attendance || [];
    const totalDays = records.length;
    const totalAbsent = records.filter((r) => r.status === "absent").length;
    const absenceRate = totalDays > 0 ? Math.round((totalAbsent / totalDays) * 100) : 0;
    setWarningStudent({
      id: student.id, name: student.full_name, className: student.classes?.name || "غير محدد",
      absenceRate, totalAbsent, totalDays,
    });
    setLoadingWarning(null); setWarningOpen(true);
  };

  // Export
  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const sheetData = filtered.map((s, i) => ({
      "#": i + 1, "الاسم الكامل": s.full_name, "رقم الهوية": s.national_id || "",
      "الفصل": s.classes?.name || "", "جوال ولي الأمر": s.parent_phone || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetData), "الطلاب");
    safeWriteXLSX(wb, `طلاب_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "تم", description: "تم تصدير ملف Excel بنجاح" });
  };

  const exportPDF = async () => {
    const { doc, startY, watermark, advanced } = await createArabicPDF({ orientation: "landscape", reportType: "students", includeHeader: true });
    const { finalizePDF } = await import("@/lib/arabic-pdf");
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableStyles = getArabicTableStyles(advanced);
    doc.setFontSize(16); doc.text("بيانات الطلاب", pageWidth / 2, startY, { align: "center" });
    doc.setFontSize(10); doc.text(format(new Date(), "yyyy/MM/dd"), pageWidth / 2, startY + 7, { align: "center" });
    const headers = ["جوال ولي الأمر", "الفصل", "رقم الهوية", "الاسم الكامل", "#"];
    const rows = filtered.map((s, i) => [s.parent_phone || "", s.classes?.name || "", s.national_id || "", s.full_name, String(i + 1)]);
    autoTable(doc, { startY: startY + 12, head: [headers], body: rows, ...tableStyles });
    finalizePDF(doc, `طلاب_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark, advanced);
    toast({ title: "تم", description: "تم تصدير ملف PDF بنجاح" });
  };

  const classCounts = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    students.forEach((s) => {
      if (s.class_id && s.classes?.name) {
        if (!counts[s.class_id]) counts[s.class_id] = { name: s.classes.name, count: 0 };
        counts[s.class_id].count++;
      }
    });
    return Object.entries(counts).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [students]);

  return {
    students, classes, search, setSearch, classFilter, setClassFilter,
    exceededStudents, filtered, classCounts,
    // Add
    dialogOpen, setDialogOpen, form, setForm, handleAdd,
    // Edit
    editOpen, setEditOpen, editingStudent, editForm, setEditForm, handleEdit, openEdit,
    // Delete
    handleDelete,
    // Import
    importOpen, setImportOpen, importClassId, setImportClassId, importRows, importing,
    importDone, importStats, parsingPdf, fileRef, handleFileSelect, handleImport, resetImport,
    // Bulk
    selectedIds, setSelectedIds, toggleSelect, toggleSelectAll, bulkTransferClassId,
    setBulkTransferClassId, bulkTransferring, handleBulkTransfer,
    bulkDeleting, bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen, handleBulkDelete,
    // Warning
    warningOpen, setWarningOpen, warningStudent, loadingWarning, openWarningSlip,
    // Export
    exportExcel, exportPDF,
    toast,
  };
}
