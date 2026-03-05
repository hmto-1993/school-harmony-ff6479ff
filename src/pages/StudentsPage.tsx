import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    academic_number: "",
    national_id: "",
    class_id: "",
    parent_phone: "",
  });

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importClassId, setImportClassId] = useState("");
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStudents();
    supabase.from("classes").select("id, name").order("name").then(({ data }) => setClasses(data || []));
  }, []);

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
      academic_number: form.academic_number || null,
      national_id: form.national_id || null,
      class_id: form.class_id || null,
      parent_phone: form.parent_phone || null,
    });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تمت إضافة الطالب بنجاح" });
      setDialogOpen(false);
      setForm({ full_name: "", academic_number: "", national_id: "", class_id: "", parent_phone: "" });
      fetchStudents();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("students").delete().eq("id", id);
    toast({ title: "تم", description: "تم حذف الطالب" });
    fetchStudents();
  };

  // ============ Import from Excel ============

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    if (fileRef.current) fileRef.current.value = "";
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
    const matchSearch = !search.trim() || s.full_name.includes(search) || s.academic_number?.includes(search);
    const matchClass = classFilter === "all" || s.class_id === classFilter;
    return matchSearch && matchClass;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">إدارة الطلاب</h1>
          <p className="text-muted-foreground">عرض وإدارة بيانات الطلاب</p>
        </div>
        {role === "admin" && (
          <div className="flex gap-2">
            {/* Import Button */}
            <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) resetImport(); }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-1.5">
                  <Upload className="h-4 w-4" />
                  استيراد من Excel
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    استيراد الطلاب من ملف Excel
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="rounded-lg border bg-muted/50 p-4 text-sm space-y-2">
                    <p className="font-medium">كيفية الاستيراد من منصة نور أو مدرستي:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>سجّل الدخول في منصة <strong>نور</strong> أو <strong>مدرستي</strong></li>
                       <li>انتقل إلى قائمة الطلاب واختر الفصل المطلوب</li>
                       <li>صدّر البيانات كملف Excel (أيقونة التصدير)</li>
                       <li>ارفع الملف هنا واختر الفصل المستهدف</li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-2">
                      الأعمدة المدعومة: <strong>اسم الطالب</strong> (مطلوب)، الرقم الأكاديمي، رقم الهوية، جوال ولي الأمر
                    </p>
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
                    <Label>ملف Excel أو CSV</Label>
                    <Input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="cursor-pointer"
                    />
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
                              <TableHead className="text-right">الرقم الأكاديمي</TableHead>
                              <TableHead className="text-right">رقم الهوية</TableHead>
                              <TableHead className="text-right">جوال ولي الأمر</TableHead>
                              <TableHead className="text-right">الحالة</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importRows.slice(0, 50).map((row, i) => (
                              <TableRow key={i} className={!row.valid ? "bg-destructive/5" : ""}>
                                <TableCell className="font-medium">{row.full_name || "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{row.academic_number || "—"}</TableCell>
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
                    <Label>الرقم الأكاديمي</Label>
                    <Input value={form.academic_number} onChange={(e) => setForm({ ...form, academic_number: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>الرقم الوطني</Label>
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

      <Card className="shadow-card">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو الرقم الأكاديمي..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
               <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="جميع الفصول" /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">جميع الفصول</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">الاسم الكامل</TableHead>
                  <TableHead className="text-right">الرقم الأكاديمي</TableHead>
                  <TableHead className="text-right">الفصل</TableHead>
                  <TableHead className="text-right">جوال ولي الأمر</TableHead>
                  {role === "admin" && <TableHead className="text-right">إجراءات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد نتائج</TableCell></TableRow>
                ) : filtered.map((s, i) => (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.academic_number || "—"}</TableCell>
                    <TableCell>{s.classes?.name || "—"}</TableCell>
                    <TableCell dir="ltr" className="text-muted-foreground">{s.parent_phone || "—"}</TableCell>
                    {role === "admin" && (
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
