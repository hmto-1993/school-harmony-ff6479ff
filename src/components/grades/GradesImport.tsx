import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, CheckCircle2, AlertCircle, X, Save, Users, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { safeWriteXLSX } from "@/lib/download-utils";

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
  confirmed: boolean;
  manualOverride: boolean;
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
  const pdfRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [existingGrades, setExistingGrades] = useState<Record<string, string>>({});

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
    // 1) National ID match (most reliable)
    if (nationalId) {
      const byId = students.find(s => s.national_id === nationalId);
      if (byId) return byId;
    }

    // Arabic-aware normalization: strip diacritics, normalize alef/yaa/taa marbuta, collapse spaces
    const normalize = (s: string) =>
      s
        .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // tashkeel + tatweel
        .replace(/[إأآا]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/\s+/g, " ")
        .trim();

    // Merge "عبد X" into a single token (عبدالله, عبدالرحمن...) so it isn't treated as two parts
    const mergeAbd = (tokens: string[]): string[] => {
      const out: string[] = [];
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === "عبد" && i + 1 < tokens.length) {
          out.push("عبد" + tokens[i + 1]);
          i++;
        } else {
          out.push(tokens[i]);
        }
      }
      return out;
    };

    const tokenize = (s: string) => {
      const raw = normalize(s)
        .split(" ")
        .filter(t => t.length > 0 && !["بن", "بنت"].includes(t));
      return mergeAbd(raw).filter(t => t.length > 1);
    };

    const fileName = normalize(name);
    const fileTokens = tokenize(name);
    if (fileTokens.length === 0) return null;

    // 2) Exact normalized match
    const exact = students.find(s => normalize(s.full_name) === fileName);
    if (exact) return exact;

    // 3) Substring (either way)
    const sub = students.find(s => {
      const sn = normalize(s.full_name);
      return sn.includes(fileName) || fileName.includes(sn);
    });
    if (sub) return sub;

    // 4) Minimum-token match: first + last + (middle if available)
    //    A student matches if their full name contains the file's first + last token,
    //    AND if the file has 3+ tokens, also the second token.
    const fileFirst = fileTokens[0];
    const fileLast = fileTokens[fileTokens.length - 1];
    const fileSecond = fileTokens.length >= 3 ? fileTokens[1] : null;

    const candidates = students
      .map(s => {
        const studentTokens = tokenize(s.full_name);
        if (studentTokens.length === 0) return null;

        const hasFirst = studentTokens.includes(fileFirst);
        const hasLast = studentTokens.includes(fileLast);
        if (!hasFirst || !hasLast) return null;

        // If file has a middle name, prefer students whose name also contains it
        const hasSecond = fileSecond ? studentTokens.includes(fileSecond) : true;

        // Score: more shared tokens + bonus for middle name match
        const shared = fileTokens.filter(t => studentTokens.includes(t)).length;
        const score = shared + (hasSecond ? 0.5 : 0);
        return { student: s, score, hasSecond };
      })
      .filter((c): c is { student: StudentInfo; score: number; hasSecond: boolean } => c !== null);

    if (candidates.length === 0) return null;

    // Prefer ones with middle-name match, then highest score
    candidates.sort((a, b) => {
      if (a.hasSecond !== b.hasSecond) return a.hasSecond ? -1 : 1;
      return b.score - a.score;
    });

    // Only return if unambiguous (top score strictly higher than next, or only one)
    if (candidates.length === 1) return candidates[0].student;
    if (candidates[0].score > candidates[1].score) return candidates[0].student;

    return null;
  }, [students]);

  const processRows = useCallback((rawRows: { name: string; id: string | null; score: number | null }[]) => {
    const cat = categories.find(c => c.id === selectedCategory);
    const maxScore = cat ? Number(cat.max_score) : 100;

    const rows: ImportRow[] = rawRows
      .filter(r => r.name)
      .map((row) => {
        const matched = matchStudent(row.name, row.id);
        let status: ImportRow["status"] = "matched";
        if (!matched) status = "not_found";
        else if (row.score === null || row.score < 0 || row.score > maxScore) status = "invalid_score";
        return {
          studentName: row.name,
          studentId: row.id,
          score: row.score,
          matchedStudent: matched,
          status,
          confirmed: status === "matched", // auto-confirm clean matches; user can untick
          manualOverride: false,
        };
      });

    setImportRows(rows);
  }, [categories, selectedCategory, matchStudent]);

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

        const headers = Object.keys(json[0]);
        const nameCol = headers.find(h => /اسم|الطالب|name|student/i.test(h)) || headers[0];
        const idCol = headers.find(h => /هوية|رقم|national|id/i.test(h));
        const scoreCol = headers.find(h => /درجة|score|grade|mark|نتيجة/i.test(h)) || headers[headers.length - 1];

        const rawRows = json.map((row) => {
          const name = String(row[nameCol] || "").trim();
          const id = idCol ? String(row[idCol] || "").trim() || null : null;
          const rawScore = row[scoreCol];
          let score: number | null = null;
          if (rawScore !== undefined && rawScore !== null && rawScore !== "") {
            score = Number(rawScore);
            if (isNaN(score)) score = null;
          }
          return { name, id, score };
        });

        processRows(rawRows);
      } catch (err) {
        toast({ title: "خطأ في قراءة الملف", description: "تأكد من صيغة الملف", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "الملف كبير جداً", description: "الحد الأقصى 10 ميجابايت", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    setParsingPdf(true);
    setImportRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const pdfBase64 = btoa(binary);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/parse-pdf-grades`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ pdfBase64 }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "فشل في تحليل الملف");
      }

      const { grades } = await resp.json();

      if (!grades || grades.length === 0) {
        toast({ title: "لم يتم العثور على بيانات", description: "لم يتمكن النظام من استخراج درجات من هذا الملف", variant: "destructive" });
        setParsingPdf(false);
        return;
      }

      const rawRows = grades.map((g: any) => ({
        name: String(g.student_name || "").trim(),
        id: g.national_id ? String(g.national_id).trim() : null,
        score: g.score !== null && g.score !== undefined ? Number(g.score) : null,
      }));

      processRows(rawRows);
      toast({ title: "تم تحليل الملف", description: `تم استخراج ${rawRows.length} سجل من ملف PDF` });
    } catch (err: any) {
      toast({ title: "خطأ في تحليل PDF", description: err.message || "حدث خطأ غير متوقع", variant: "destructive" });
    } finally {
      setParsingPdf(false);
      if (pdfRef.current) pdfRef.current.value = "";
    }
  };

  const removeRow = (index: number) => {
    setImportRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (!user || !selectedCategory) return;
    setSaving(true);

    const validRows = importRows.filter(r => r.status === "matched" && r.matchedStudent && r.score !== null);

    const updates: PromiseLike<any>[] = [];
    const inserts: { student_id: string; category_id: string; score: number | null; recorded_by: string; period: number }[] = [];

    for (const row of validRows) {
      const existingId = existingGrades[row.matchedStudent!.id];
      if (existingId) {
        updates.push(supabase.from("grades").update({ score: row.score }).eq("id", existingId).then());
      } else {
        inserts.push({
          student_id: row.matchedStudent!.id,
          category_id: selectedCategory,
          score: row.score,
          recorded_by: user.id,
          period: selectedPeriod,
        });
      }
    }

    const ops: PromiseLike<any>[] = [...updates];
    if (inserts.length > 0) {
      ops.push(supabase.from("grades").upsert(inserts, { onConflict: "student_id,category_id,date,period" }).then());
    }
    await Promise.all(ops);

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
    safeWriteXLSX(wb, `قالب_درجات_${cat?.name || "import"}.xlsx`);
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
                    <FileSpreadsheet className="h-4 w-4" />
                    رفع Excel / CSV
                  </Button>
                </div>
                <div className="relative">
                  <input
                    ref={pdfRef}
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfSelect}
                    disabled={parsingPdf}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button variant="secondary" className="gap-2 pointer-events-none" disabled={parsingPdf}>
                    {parsingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {parsingPdf ? "جارٍ التحليل..." : "رفع ملف PDF"}
                  </Button>
                </div>
              </div>
              {fileName && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  {fileName.endsWith(".pdf") ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                  {fileName}
                  {parsingPdf && <span className="text-xs text-primary">(جارٍ تحليل الملف بالذكاء الاصطناعي...)</span>}
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
                  <p className="font-medium">ارفع ملف Excel أو CSV أو PDF يحتوي على درجات الطلاب</p>
                  <p className="text-xs mt-1">يجب أن يحتوي الملف على اسم الطالب (أو رقم الهوية) والدرجة</p>
                  <p className="text-xs">ملفات PDF يتم تحليلها تلقائياً بالذكاء الاصطناعي</p>
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
