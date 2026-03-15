import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle2, Users, GraduationCap, Loader2, Pencil, ArrowRightLeft, Download, FileWarning, MessageCircle, Lock } from "lucide-react";
import WhatsAppMessageDialog from "@/components/whatsapp/WhatsAppMessageDialog";
import type { TemplateType } from "@/components/whatsapp/WhatsAppMessageDialog";
import AbsenceWarningSlip from "@/components/reports/AbsenceWarningSlip";
import { format } from "date-fns";
import { createArabicPDF, getArabicTableStyles } from "@/lib/arabic-pdf";
import { safeWriteXLSX, safeSavePDF } from "@/lib/download-utils";
import autoTable from "jspdf-autotable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";
import EmptyState from "@/components/EmptyState";

interface Student {
  id: string;
  full_name: string;
  academic_number: string | null;
  national_id: string | null;
  class_id: string | null;
  parent_phone: string | null;
  classes: { name: string } | null;
}

interface ImportRow {
  full_name: string;
  academic_number?: string;
  national_id?: string;
  parent_phone?: string;
  valid: boolean;
  error?: string;
}

export default function StudentsPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const { perms, loaded: permsLoaded } = useTeacherPermissions();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    national_id: "",
    class_id: "",
    parent_phone: "",
  });

  // Absence exceeded tracking
  const [exceededStudents, setExceededStudents] = useState<Set<string>>(new Set());

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importClassId, setImportClassId] = useState("");
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });
  const [parsingPdf, setParsingPdf] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    national_id: "",
    class_id: "",
    parent_phone: "",
  });

  // Warning slip state
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningStudent, setWarningStudent] = useState<{
    id: string;
    name: string;
    className: string;
    absenceRate: number;
    totalAbsent: number;
    totalDays: number;
  } | null>(null);
  const [loadingWarning, setLoadingWarning] = useState<string | null>(null);

  // WhatsApp dialog state
  const [waOpen, setWaOpen] = useState(false);
  const [waStudent, setWaStudent] = useState<{ name: string; phone: string | null; absenceCount?: number; lastDate?: string } | null>(null);
  const [waTemplateType, setWaTemplateType] = useState<TemplateType>("absence");

  const openWarningSlip = async (student: Student) => {
    setLoadingWarning(student.id);
    // Fetch absence data for this student
    const { data: attendance } = await supabase
      .from("attendance_records")
      .select("status, date")
      .eq("student_id", student.id);

    const records = attendance || [];
    const totalDays = records.length;
    const totalAbsent = records.filter((r) => r.status === "absent").length;
    const absenceRate = totalDays > 0 ? Math.round((totalAbsent / totalDays) * 100) : 0;

    setWarningStudent({
      id: student.id,
      name: student.full_name,
      className: student.classes?.name || "غير محدد",
      absenceRate,
      totalAbsent,
      totalDays,
    });
    setLoadingWarning(null);
    setWarningOpen(true);
  };

  useEffect(() => {
    fetchStudents();
    supabase.from("classes").select("id, name").order("name").then(({ data }) => setClasses(data || []));
    loadExceededStudents();
  }, []);

  const loadExceededStudents = async () => {
    const { data: settings } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["absence_threshold", "absence_allowed_sessions", "absence_mode"]);
    
    let threshold = 20;
    let allowedSessions = 0;
    let mode = "percentage";
    (settings || []).forEach((s: any) => {
      if (s.id === "absence_threshold") threshold = Number(s.value) || 20;
      if (s.id === "absence_allowed_sessions") allowedSessions = Number(s.value) || 0;
      if (s.id === "absence_mode") mode = s.value || "percentage";
    });

    const { data: allAtt } = await supabase
      .from("attendance_records")
      .select("student_id, status");

    const studentAbsences: Record<string, { absent: number; total: number }> = {};
    (allAtt || []).forEach((r: any) => {
      if (!studentAbsences[r.student_id]) studentAbsences[r.student_id] = { absent: 0, total: 0 };
      studentAbsences[r.student_id].total++;
      if (r.status === "absent") studentAbsences[r.student_id].absent++;
    });

    const exceeded = new Set<string>();
    Object.entries(studentAbsences).forEach(([sid, data]) => {
      if (mode === "sessions" && allowedSessions > 0) {
        if (data.absent > allowedSessions) exceeded.add(sid);
      } else if (data.total > 0) {
        if ((data.absent / data.total) * 100 >= threshold) exceeded.add(sid);
      }
    });
    setExceededStudents(exceeded);
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("id, full_name, academic_number, national_id, class_id, parent_phone, classes(name)")
      .order("full_name");
    setStudents((data as Student[]) || []);
  };

  const handleAdd = async () => {
    if (!form.full_name.trim()) return;
    const { error } = await supabase.from("students").insert({
      full_name: form.full_name,
      national_id: form.national_id || null,
      class_id: form.class_id || null,
      parent_phone: form.parent_phone || null,
    });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
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
      full_name: student.full_name,
      national_id: student.national_id || "",
      class_id: student.class_id || "",
      parent_phone: student.parent_phone || "",
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingStudent || !editForm.full_name.trim()) return;
    const { error } = await supabase.from("students").update({
      full_name: editForm.full_name,
      national_id: editForm.national_id || null,
      class_id: editForm.class_id || null,
      parent_phone: editForm.parent_phone || null,
    }).eq("id", editingStudent.id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم تحديث بيانات الطالب" });
      setEditOpen(false);
      setEditingStudent(null);
      fetchStudents();
    }
  };

  // Bulk transfer state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTransferClassId, setBulkTransferClassId] = useState("");
  const [bulkTransferring, setBulkTransferring] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(s => s.id)));
    }
  };

  const handleBulkTransfer = async () => {
    if (!bulkTransferClassId || selectedIds.size === 0) return;
    setBulkTransferring(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("students").update({ class_id: bulkTransferClassId }).in("id", ids);
    setBulkTransferring(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      const className = classes.find(c => c.id === bulkTransferClassId)?.name || "";
      toast({ title: "تم النقل", description: `تم نقل ${ids.length} طالب إلى "${className}"` });
      setSelectedIds(new Set());
      setBulkTransferClassId("");
      fetchStudents();
    }
  };

  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("students").delete().in("id", ids);
    setBulkDeleting(false);
    setBulkDeleteConfirmOpen(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحذف", description: `تم حذف ${ids.length} طالب بنجاح` });
      setSelectedIds(new Set());
      fetchStudents();
    }
  };


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      await handlePdfFile(file);
    } else {
      await handleExcelFile(file);
    }

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
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
          return String(row[key]).trim();
        }
      }
      return undefined;
    };

    const rows: ImportRow[] = json.map((row) => {
      const name = findColumn(row, columnMap.full_name);
      if (!name) {
        return { full_name: "", valid: false, error: "اسم الطالب مطلوب" };
      }
      return {
        full_name: name,
        academic_number: findColumn(row, columnMap.academic_number),
        national_id: findColumn(row, columnMap.national_id),
        parent_phone: findColumn(row, columnMap.parent_phone),
        valid: true,
      };
    }).filter((r) => r.full_name || !r.valid);

    setImportRows(rows);
    setImportDone(false);
    setImportStats({ success: 0, failed: 0 });
  };

  const handlePdfFile = async (file: File) => {
    setParsingPdf(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const { data, error } = await supabase.functions.invoke("parse-pdf-students", {
        body: { pdfBase64: base64 },
      });

      if (error || !data?.students) {
        toast({
          title: "خطأ في تحليل PDF",
          description: data?.error || error?.message || "لم يتم التعرف على بيانات الطلاب",
          variant: "destructive",
        });
        setParsingPdf(false);
        return;
      }

      const rows: ImportRow[] = data.students.map((s: any) => {
        if (!s.full_name?.trim()) {
          return { full_name: "", valid: false, error: "اسم الطالب مطلوب" };
        }
        return {
          full_name: s.full_name.trim(),
          academic_number: s.academic_number?.toString()?.trim() || undefined,
          national_id: s.national_id?.toString()?.trim() || undefined,
          parent_phone: s.parent_phone?.toString()?.trim() || undefined,
          valid: true,
        };
      }).filter((r: ImportRow) => r.full_name || !r.valid);

      setImportRows(rows);
      setImportDone(false);
      setImportStats({ success: 0, failed: 0 });

      if (rows.length === 0) {
        toast({
          title: "لا توجد بيانات",
          description: "لم يتم العثور على بيانات طلاب في ملف PDF",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "فشل تحليل ملف PDF",
        variant: "destructive",
      });
    }
    setParsingPdf(false);
  };

  const handleImport = async () => {
    if (!importClassId) {
      toast({ title: "تنبيه", description: "اختر الفصل أولاً", variant: "destructive" });
      return;
    }
    const validRows = importRows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setImporting(true);
    let success = 0;
    let failed = 0;

    const inserts = validRows.map((r) => ({
      full_name: r.full_name,
      academic_number: r.academic_number || null,
      national_id: r.national_id || null,
      parent_phone: r.parent_phone || null,
      class_id: importClassId,
    }));

    const { error, data } = await supabase.from("students").insert(inserts).select();
    if (error) {
      for (const row of inserts) {
        const { error: rowErr } = await supabase.from("students").insert(row);
        if (rowErr) failed++;
        else success++;
      }
    } else {
      success = data?.length || inserts.length;
    }

    setImportStats({ success, failed });
    setImportDone(true);
    setImporting(false);
    fetchStudents();

    toast({
      title: "نتيجة الاستيراد",
      description: `تم استيراد ${success} طالب بنجاح${failed > 0 ? `، فشل ${failed}` : ""}`,
      variant: failed > 0 && success === 0 ? "destructive" : "default",
    });
  };

  const resetImport = () => {
    setImportRows([]);
    setImportDone(false);
    setImportStats({ success: 0, failed: 0 });
  };

  const filtered = students.filter((s) => {
    const matchSearch = !search.trim() || s.full_name.includes(search) || s.national_id?.includes(search);
    const matchClass = classFilter === "all" || s.class_id === classFilter;
    return matchSearch && matchClass;
  });

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const sheetData = filtered.map((s, i) => ({
      "#": i + 1,
      "الاسم الكامل": s.full_name,
      "رقم الهوية": s.national_id || "",
      "الفصل": s.classes?.name || "",
      "جوال ولي الأمر": s.parent_phone || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetData), "الطلاب");
    safeWriteXLSX(wb, `طلاب_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "تم", description: "تم تصدير ملف Excel بنجاح" });
  };

  const exportPDF = async () => {
    const { doc, startY, watermark } = await createArabicPDF({ orientation: "landscape", reportType: "students", includeHeader: true });
    const { finalizePDF } = await import("@/lib/arabic-pdf");
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableStyles = getArabicTableStyles();

    doc.setFontSize(16);
    doc.text("بيانات الطلاب", pageWidth / 2, startY, { align: "center" });
    doc.setFontSize(10);
    doc.text(format(new Date(), "yyyy/MM/dd"), pageWidth / 2, startY + 7, { align: "center" });

    const headers = ["جوال ولي الأمر", "الفصل", "رقم الهوية", "الاسم الكامل", "#"];
    const rows = filtered.map((s, i) => [
      s.parent_phone || "",
      s.classes?.name || "",
      s.national_id || "",
      s.full_name,
      String(i + 1),
    ]);

    autoTable(doc, {
      startY: startY + 12,
      head: [headers],
      body: rows,
      ...tableStyles,
    });

    finalizePDF(doc, `طلاب_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark);
    toast({ title: "تم", description: "تم تصدير ملف PDF بنجاح" });
  };

  // Class student counts for summary cards
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

  const cardColors = [
    "from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10",
    "from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/10",
    "from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10",
    "from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10",
    "from-rose-500/10 to-rose-600/5 dark:from-rose-500/20 dark:to-rose-600/10",
    "from-cyan-500/10 to-cyan-600/5 dark:from-cyan-500/20 dark:to-cyan-600/10",
  ];
  const iconColors = [
    "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
    "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400",
    "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
    "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400",
    "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
  ];

  if (permsLoaded && !perms.can_view_students && !perms.read_only_mode && role !== "admin") {
    return <EmptyState icon={Lock} title="لا تملك صلاحية عرض الطلاب" description="تواصل مع المسؤول لتفعيل صلاحية عرض صفحة الطلاب" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
            إدارة الطلاب
            
          </h1>
          <p className="text-muted-foreground">عرض وإدارة بيانات الطلاب</p>
        </div>
        {(role === "admin" && !perms.read_only_mode) && (
          <div className="flex gap-2">
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" title="تصدير">
                  <Upload className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportExcel} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  تصدير Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportPDF} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  تصدير PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Import Button */}
            <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) resetImport(); }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-1.5">
                  <Download className="h-4 w-4" />
                  استيراد
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    استيراد الطلاب
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="rounded-lg border bg-muted/50 p-4 text-sm space-y-2">
                    <p className="font-medium">كيفية الاستيراد من منصة نور أو مدرستي:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>سجّل الدخول في منصة <strong>نور</strong> أو <strong>مدرستي</strong></li>
                       <li>انتقل إلى قائمة الطلاب واختر الفصل المطلوب</li>
                       <li>صدّر البيانات كملف <strong>Excel</strong> أو <strong>PDF</strong></li>
                       <li>ارفع الملف هنا واختر الفصل المستهدف</li>
                    </ol>
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
                        <span>Excel / CSV</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5 text-destructive" />
                        <span>PDF (تحليل ذكي)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>الفصل المستهدف</Label>
                    <Select value={importClassId} onValueChange={setImportClassId}>
                      <SelectTrigger>
                         <SelectValue placeholder="اختر الفصل" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>ملف Excel أو CSV أو PDF</Label>
                    <Input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.pdf"
                      onChange={handleFileSelect}
                      className="cursor-pointer"
                      disabled={parsingPdf}
                    />
                    {parsingPdf && (
                      <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>جارٍ تحليل ملف PDF بالذكاء الاصطناعي...</span>
                      </div>
                    )}
                  </div>

                  {importRows.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>معاينة البيانات ({importRows.filter((r) => r.valid).length} صالح من {importRows.length})</Label>
                        {importDone && (
                          <div className="flex gap-2 text-sm">
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> {importStats.success} نجاح
                            </Badge>
                            {importStats.failed > 0 && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" /> {importStats.failed} فشل
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="max-h-[250px] overflow-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                             <TableRow>
                              <TableHead className="text-right">الاسم</TableHead>
                              <TableHead className="text-right">رقم الهوية</TableHead>
                              <TableHead className="text-right">جوال ولي الأمر</TableHead>
                              <TableHead className="text-right">الحالة</TableHead>
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                             {importRows.slice(0, 50).map((row, i) => (
                               <TableRow key={i} className={!row.valid ? "bg-destructive/5" : ""}>
                                 <TableCell className="font-medium">{row.full_name || "—"}</TableCell>
                                 <TableCell className="text-muted-foreground">{row.national_id || "—"}</TableCell>
                                 <TableCell dir="ltr" className="text-muted-foreground">{row.parent_phone || "—"}</TableCell>
                                <TableCell>
                                  {row.valid ? (
                                    <Badge variant="secondary" className="text-xs">صالح</Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-xs">{row.error}</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {importRows.length > 50 && (
                        <p className="text-xs text-muted-foreground">يتم عرض أول 50 صف فقط من أصل {importRows.length}</p>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">إغلاق</Button>
                  </DialogClose>
                  {importRows.length > 0 && !importDone && (
                    <Button
                      onClick={handleImport}
                      disabled={importing || !importClassId || importRows.filter((r) => r.valid).length === 0}
                    >
                      <Upload className="h-4 w-4 ml-1.5" />
                      {importing ? "جارٍ الاستيراد..." : `استيراد ${importRows.filter((r) => r.valid).length} طالب`}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Single Student */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 ml-2" />إضافة طالب</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة طالب جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>الاسم الكامل *</Label>
                    <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهوية الوطنية</Label>
                    <Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>الفصل</Label>
                    <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>رقم جوال ولي الأمر</Label>
                    <Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} dir="ltr" />
                  </div>
                  <Button onClick={handleAdd} className="w-full">إضافة</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Class Summary Cards */}
      {classCounts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {classCounts.map(([classId, info], index) => (
            <Card
              key={classId}
              className={cn(
                "border-0 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] bg-gradient-to-br animate-fade-in",
                cardColors[index % cardColors.length],
                classFilter === classId && "ring-2 ring-primary shadow-md"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setClassFilter(classFilter === classId ? "all" : classId)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className={cn("rounded-xl p-2", iconColors[index % iconColors.length])}>
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{info.name}</p>
                  <p className="text-lg font-bold">{info.count} <span className="text-xs font-normal text-muted-foreground">طالب</span></p>
                </div>
              </CardContent>
            </Card>
          ))}
          {/* Total card */}
          <Card
            className={cn(
              "border-0 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] bg-gradient-to-br from-primary/10 to-accent/5 dark:from-primary/20 dark:to-accent/10 animate-fade-in",
              classFilter === "all" && "ring-2 ring-primary shadow-md"
            )}
            style={{ animationDelay: `${classCounts.length * 50}ms` }}
            onClick={() => setClassFilter("all")}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className="rounded-xl p-2 bg-primary/10 dark:bg-primary/20 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">الإجمالي</p>
                <p className="text-lg font-bold">{students.length} <span className="text-xs font-normal text-muted-foreground">طالب</span></p>
              </div>
            </CardContent>
          </Card>
          {/* Edit card - always visible for admins */}
          {role === "admin" && (
            <Card
              className={cn(
                "border-0 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] bg-gradient-to-br from-orange-500/10 to-orange-600/5 dark:from-orange-500/20 dark:to-orange-600/10 animate-fade-in",
                selectedIds.size > 0 && "ring-2 ring-orange-500 shadow-md"
              )}
              style={{ animationDelay: `${(classCounts.length + 1) * 50}ms` }}
              onClick={() => {
                // Scroll to table and show selection hint
                if (selectedIds.size === 0) {
                  toast({ title: "تلميح", description: "حدد الطلاب من الجدول أدناه أولاً لنقلهم أو حذفهم أو تعديلهم" });
                }
              }}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="rounded-xl p-2 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                  <Pencil className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">تعديل</p>
                  <p className="text-sm font-bold">
                    {selectedIds.size > 0 ? `${selectedIds.size} محدد` : "حدد طلاب"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو رقم الهوية..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
               <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="جميع الفصول" /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">جميع الفصول</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Bulk actions bar when students are selected */}
          {role === "admin" && selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-fade-in">
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {selectedIds.size} طالب محدد
              </Badge>
              <div className="h-5 w-px bg-border/50" />
              {/* Bulk Transfer */}
              <div className="flex items-center gap-2">
                <Select value={bulkTransferClassId} onValueChange={setBulkTransferClassId}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <ArrowRightLeft className="h-3 w-3 ml-1 shrink-0" />
                    <SelectValue placeholder="نقل إلى فصل..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleBulkTransfer} disabled={!bulkTransferClassId || bulkTransferring} className="h-8 text-xs">
                  {bulkTransferring ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <ArrowRightLeft className="h-3 w-3 ml-1" />}
                  نقل
                </Button>
              </div>
              <div className="h-5 w-px bg-border/50" />
              {/* Bulk Delete */}
              <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="h-8 text-xs gap-1">
                    <Trash2 className="h-3 w-3" />
                    حذف المحددين
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد من حذف {selectedIds.size} طالب؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف جميع الطلاب المحددين نهائياً مع بياناتهم. لا يمكن التراجع عن هذا الإجراء.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row-reverse gap-2">
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={bulkDeleting}>
                      {bulkDeleting ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Trash2 className="h-3 w-3 ml-1" />}
                      حذف {selectedIds.size} طالب
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="h-5 w-px bg-border/50" />
              {/* Edit selected */}
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => {
                const firstSelected = students.find(s => selectedIds.has(s.id));
                if (firstSelected) openEdit(firstSelected);
              }}>
                <Pencil className="h-3 w-3" />
                تعديل
              </Button>
              <div className="mr-auto" />
              <Button size="sm" variant="ghost" onClick={() => { setSelectedIds(new Set()); setBulkTransferClassId(""); }} className="h-8 text-xs text-muted-foreground">
                إلغاء التحديد
              </Button>
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                  {role === "admin" && (
                    <th className="p-3 border-b-2 border-primary/20 first:rounded-tr-xl w-10">
                      <Checkbox checked={filtered.length > 0 && selectedIds.size === filtered.length} onCheckedChange={toggleSelectAll} />
                    </th>
                  )}
                  <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">#</th>
                  <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[180px]">الاسم الكامل</th>
                  <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">رقم الهوية</th>
                   <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الفصل</th>
                    <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">جوال ولي الأمر</th>
                     <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 w-20">إنذار</th>
                     <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl w-20">واتساب</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={role === "admin" ? 8 : 7} className="text-center py-8 text-muted-foreground">لا توجد نتائج</td></tr>
                ) : filtered.map((s, i) => {
                  const isEven = i % 2 === 0;
                  const isLast = i === filtered.length - 1;
                  return (
                  <tr
                    key={s.id}
                    className={cn(
                      isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                      !isLast && "border-b border-border/20"
                    )}
                  >
                    {role === "admin" && (
                      <td className="p-3 w-10">
                        <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                      </td>
                    )}
                    <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{i + 1}</td>
                    <td className="p-3 font-semibold border-l border-border/10">
                      <div className="flex items-center gap-2">
                        <span>{s.full_name}</span>
                        {exceededStudents.has(s.id) && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 shrink-0">
                            محروم
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground border-l border-border/10">{s.national_id || "—"}</td>
                     <td className="p-3 border-l border-border/10">
                       {s.classes?.name ? (
                         <Badge variant="secondary" className="text-xs">{s.classes.name}</Badge>
                       ) : <span className="text-muted-foreground">—</span>}
                     </td>
                     <td className="p-3 border-l border-border/10 text-muted-foreground text-xs">{s.parent_phone || "—"}</td>
                     <td className="p-3 text-center">
                       <Button
                         size="sm"
                         variant="ghost"
                         className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                         title="توليد إنذار غياب"
                         disabled={loadingWarning === s.id}
                         onClick={() => openWarningSlip(s)}
                       >
                         {loadingWarning === s.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <FileWarning className="h-3.5 w-3.5" />}
                       </Button>
                     </td>
                     <td className="p-3 text-center">
                       <Button
                         size="sm"
                         variant="ghost"
                         className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                         title="إرسال واتساب"
                         onClick={async () => {
                           // Fetch absence data for template
                           const { data: att } = await supabase
                             .from("attendance_records")
                             .select("status, date")
                             .eq("student_id", s.id)
                             .eq("status", "absent")
                             .order("date", { ascending: false });
                           const absences = att || [];
                           setWaStudent({
                             name: s.full_name,
                             phone: s.parent_phone,
                             absenceCount: absences.length,
                             lastDate: absences[0]?.date || "",
                           });
                           setWaTemplateType(absences.length > 0 ? "absence" : "full_mark");
                           setWaOpen(true);
                         }}
                       >
                         <MessageCircle className="h-3.5 w-3.5" />
                       </Button>
                     </td>
                   </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Student Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              تعديل بيانات الطالب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم الكامل *</Label>
              <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>رقم الهوية الوطنية</Label>
              <Input value={editForm.national_id} onChange={(e) => setEditForm({ ...editForm, national_id: e.target.value })} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>الفصل</Label>
              <Select value={editForm.class_id} onValueChange={(v) => setEditForm({ ...editForm, class_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>رقم جوال ولي الأمر</Label>
              <Input value={editForm.parent_phone} onChange={(e) => setEditForm({ ...editForm, parent_phone: e.target.value })} dir="ltr" />
            </div>
            <Button onClick={handleEdit} className="w-full">حفظ التعديلات</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Absence Warning Slip */}
      {warningStudent && (
        <AbsenceWarningSlip
          open={warningOpen}
          onOpenChange={setWarningOpen}
          studentId={warningStudent.id}
          studentName={warningStudent.name}
          className={warningStudent.className}
          absenceRate={warningStudent.absenceRate}
          totalAbsent={warningStudent.totalAbsent}
          totalDays={warningStudent.totalDays}
        />
      )}

      {/* WhatsApp Message Dialog */}
      {waStudent && (
        <WhatsAppMessageDialog
          open={waOpen}
          onOpenChange={setWaOpen}
          studentName={waStudent.name}
          parentPhone={waStudent.phone}
          templateType={waTemplateType}
          templateData={{
            student_name: waStudent.name,
            absence_count: waStudent.absenceCount,
            last_date: waStudent.lastDate,
          }}
        />
      )}
    </div>
  );
}
