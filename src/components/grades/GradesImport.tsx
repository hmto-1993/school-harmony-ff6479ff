import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, CheckCircle2, AlertCircle, X, Save, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface GradeCategory {
  id: string;
  name: string;
  max_score: number;
  category_group: string;
}

interface StudentInfo {
  id: string;
  full_name: string;
  national_id: string | null;
}

interface ImportRow {
  studentName: string;
  studentId: string | null; // national_id from file
  score: number | null;
  matchedStudent: StudentInfo | null;
  status: "matched" | "not_found" | "invalid_score";
}

interface GradesImportProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
  selectedPeriod?: number;
}

export default function GradesImport({ selectedClass, onClassChange, selectedPeriod = 1 }: GradesImportProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingGrades, setExistingGrades] = useState<Record<string, string>>({}); // student_id -> grade_id

  useEffect(() => {
    if (!selectedClass) return;
    setSelectedCategory("");
    setImportRows([]);
    setFileName("");
    loadData();
  }, [selectedClass, selectedPeriod]);

  const loadData = async () => {
    const [{ data: cats }, { data: studs }] = await Promise.all([
      supabase.from("grade_categories").select("id, name, max_score, category_group").eq("class_id", selectedClass).order("sort_order"),
      supabase.from("students").select("id, full_name, national_id").eq("class_id", selectedClass).order("full_name"),
    ]);
    setCategories((cats as GradeCategory[]) || []);
    setStudents(studs || []);
  };

  useEffect(() => {
    if (!selectedCategory || students.length === 0) return;
    // Load existing grades for this category and period
    const loadExisting = async () => {
      const { data } = await supabase
        .from("grades")
        .select("id, student_id")
        .eq("category_id", selectedCategory)
        .eq("period", selectedPeriod)
        .in("student_id", students.map(s => s.id));
      const map: Record<string, string> = {};
      (data || []).forEach(g => { map[g.student_id] = g.id; });
      setExistingGrades(map);
    };
    loadExisting();
  }, [selectedCategory, selectedPeriod, students]);

  const matchStudent = useCallback((name: string, nationalId: string | null): StudentInfo | null => {
    // Try matching by national_id first
    if (nationalId) {
      const byId = students.find(s => s.national_id === nationalId);
      if (byId) return byId;
    }
    // Try exact name match
    const normalized = name.trim();
    const byName = students.find(s => s.full_name.trim() === normalized);
    if (byName) return byName;
    // Try partial match
    const partial = students.find(s =>
      s.full_name.trim().includes(normalized) || normalized.includes(s.full_name.trim())
    );
    return partial || null;
  }, [students]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        if (json.length === 0) {
          toast({ title: "ملف فارغ", description: "لا توجد بيانات في الملف", variant: "destructive" });
          return;
        }

        const cat = categories.find(c => c.id === selectedCategory);
        const maxScore = cat ? Number(cat.max_score) : 100;

        // Detect columns
        const headers = Object.keys(json[0]);
        const nameCol = headers.find(h => /اسم|الطالب|name|student/i.test(h)) || headers[0];
        const idCol = headers.find(h => /هوية|رقم|national|id/i.test(h));
        const scoreCol = headers.find(h => /درجة|score|grade|mark|نتيجة/i.test(h)) || headers[headers.length - 1];

        const rows: ImportRow[] = json.map((row) => {
          const studentName = String(row[nameCol] || "").trim();
          const studentId = idCol ? String(row[idCol] || "").trim() : null;
          const rawScore = row[scoreCol];
          let score: number | null = null;
          if (rawScore !== undefined && rawScore !== null && rawScore !== "") {
            score = Number(rawScore);
            if (isNaN(score)) score = null;
          }

          const matched = studentName ? matchStudent(studentName, studentId) : null;
          let status: ImportRow["status"] = "matched";
          if (!matched) status = "not_found";
          else if (score === null || score < 0 || score > maxScore) status = "invalid_score";

          return { studentName, studentId, score, matchedStudent: matched, status };
        }).filter(r => r.studentName);

        setImportRows(rows);
      } catch (err) {
        toast({ title: "خطأ في قراءة الملف", description: "تأكد من صيغة الملف", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeRow = (index: number) => {
    setImportRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (!user || !selectedCategory) return;
    setSaving(true);

    const validRows = importRows.filter(r => r.status === "matched" && r.matchedStudent && r.score !== null);

    for (const row of validRows) {
      const existingId = existingGrades[row.matchedStudent!.id];
      if (existingId) {
        await supabase.from("grades").update({ score: row.score }).eq("id", existingId);
      } else {
        await supabase.from("grades").insert({
          student_id: row.matchedStudent!.id,
          category_id: selectedCategory,
          score: row.score,
          recorded_by: user.id,
          period: selectedPeriod,
        });
      }
    }

    toast({ title: "تم الاستيراد", description: `تم استيراد درجات ${validRows.length} طالب بنجاح` });
    setSaving(false);
    setImportRows([]);
    setFileName("");
  };

  const downloadTemplate = () => {
    const cat = categories.find(c => c.id === selectedCategory);
    const ws = XLSX.utils.json_to_sheet(
      students.map((s, i) => ({
        "#": i + 1,
        "اسم الطالب": s.full_name,
        "رقم الهوية": s.national_id || "",
        [`الدرجة (من ${cat ? Number(cat.max_score) : 100})`]: "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الدرجات");
    XLSX.writeFile(wb, `قالب_درجات_${cat?.name || "import"}.xlsx`);
  };

  const matchedCount = importRows.filter(r => r.status === "matched").length;
  const notFoundCount = importRows.filter(r => r.status === "not_found").length;
  const invalidCount = importRows.filter(r => r.status === "invalid_score").length;

  return (
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          استيراد الدرجات من ملف
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Step 1: Select category */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">1. اختر فئة التقييم</label>
          <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setImportRows([]); setFileName(""); }}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="اختر الفئة..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name} (من {Number(cat.max_score)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCategory && (
          <>
            {/* Step 2: Upload or download template */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">2. رفع الملف أو تحميل القالب</label>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  تحميل قالب Excel
                </Button>
                <div className="relative">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button variant="default" className="gap-2 pointer-events-none">
                    <Download className="h-4 w-4" />
                    رفع ملف Excel / CSV
                  </Button>
                </div>
              </div>
              {fileName && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4" />
                  {fileName}
                </p>
              )}
            </div>

            {/* Step 3: Preview */}
            {importRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-sm font-semibold text-foreground">3. مراجعة البيانات</label>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> {matchedCount} مطابق
                    </Badge>
                    {notFoundCount > 0 && (
                      <Badge variant="secondary" className="gap-1 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 border-rose-200 dark:border-rose-500/20">
                        <AlertCircle className="h-3 w-3" /> {notFoundCount} غير موجود
                      </Badge>
                    )}
                    {invalidCount > 0 && (
                      <Badge variant="secondary" className="gap-1 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border-amber-200 dark:border-amber-500/20">
                        <AlertCircle className="h-3 w-3" /> {invalidCount} درجة خاطئة
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
                  <table className="w-full text-sm border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                        <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">#</th>
                        <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">اسم الطالب (ملف)</th>
                        <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الطالب المطابق</th>
                        <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الدرجة</th>
                        <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الحالة</th>
                        <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((row, i) => (
                        <tr key={i} className={cn(
                          i % 2 === 0 ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                          i < importRows.length - 1 && "border-b border-border/20"
                        )}>
                          <td className="p-3 text-muted-foreground font-medium">{i + 1}</td>
                          <td className="p-3 font-medium">{row.studentName}</td>
                          <td className="p-3">
                            {row.matchedStudent ? (
                              <span className="text-emerald-700 dark:text-emerald-300 font-medium">{row.matchedStudent.full_name}</span>
                            ) : (
                              <span className="text-rose-500">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold">
                            {row.score !== null ? row.score : "—"}
                          </td>
                          <td className="p-3 text-center">
                            {row.status === "matched" && <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />}
                            {row.status === "not_found" && <AlertCircle className="h-4 w-4 text-rose-500 mx-auto" />}
                            {row.status === "invalid_score" && <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />}
                          </td>
                          <td className="p-3 text-center">
                            <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Import button */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => { setImportRows([]); setFileName(""); }}>
                    إلغاء
                  </Button>
                  <Button onClick={handleImport} disabled={saving || matchedCount === 0} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "جارٍ الاستيراد..." : `استيراد ${matchedCount} درجة`}
                  </Button>
                </div>
              </div>
            )}

            {/* Info when no file yet */}
            {importRows.length === 0 && !fileName && (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-3 rounded-xl border-2 border-dashed border-border/50">
                <Download className="h-10 w-10 opacity-40" />
                <div>
                  <p className="font-medium">ارفع ملف Excel أو CSV يحتوي على درجات الطلاب</p>
                  <p className="text-xs mt-1">يجب أن يحتوي الملف على عمود لاسم الطالب وعمود للدرجة</p>
                  <p className="text-xs">أو حمّل القالب الجاهز وعبّئه ثم ارفعه</p>
                </div>
              </div>
            )}
          </>
        )}

        {!selectedCategory && categories.length > 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-3">
            <Users className="h-10 w-10 opacity-40" />
            <p className="font-medium">اختر فئة التقييم أولاً للبدء في استيراد الدرجات</p>
          </div>
        )}

        {categories.length === 0 && (
          <p className="text-center py-10 text-muted-foreground">لم يتم إعداد فئات التقييم لهذا الفصل بعد</p>
        )}
      </CardContent>
    </Card>
  );
}
