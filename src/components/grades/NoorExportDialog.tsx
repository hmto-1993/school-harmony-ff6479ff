import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, Zap, Copy, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassOption {
  id: string;
  name: string;
  grade: string;
  section: string;
}

interface CategoryOption {
  id: string;
  name: string;
  max_score: number;
}

interface GradeEntry {
  name: string;
  nationalId: string;
  scores: { categoryName: string; maxScore: number; score: number | null }[];
}

function generateBookmarkletCode(students: GradeEntry[]): string {
  const script = `
(function(){
  var students = ${JSON.stringify(students)};
  var style = document.createElement('style');
  style.textContent = '#noorFillOverlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Tahoma,Arial,sans-serif;direction:rtl}#noorFillBox{background:#fff;border-radius:16px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)}#noorFillBox h2{margin:0 0 8px;color:#1a56db;font-size:18px}#noorFillBox .sub{color:#666;font-size:13px;margin-bottom:16px}#noorFillBox .row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:8px;margin-bottom:4px;font-size:13px}#noorFillBox .row.ok{background:#ecfdf5;color:#065f46}#noorFillBox .row.miss{background:#fef2f2;color:#991b1b}#noorFillBox .row.skip{background:#fefce8;color:#854d0e}#noorFillBox .scores{font-size:11px;color:#666;margin-top:2px}#noorFillBox .stats{display:flex;gap:12px;margin:12px 0;font-size:13px}#noorFillBox .stat{flex:1;text-align:center;padding:8px;border-radius:8px}#noorFillBox .stat.g{background:#ecfdf5;color:#065f46}#noorFillBox .stat.y{background:#fefce8;color:#854d0e}#noorFillBox .stat.r{background:#fef2f2;color:#991b1b}#noorFillBox button{padding:10px 24px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:bold}#noorFillBox .btnOk{background:#1a56db;color:#fff;margin-left:8px}#noorFillBox .btnOk:hover{background:#1e40af}#noorFillBox .btnCancel{background:#e5e7eb;color:#374151}#noorFillBox .catBadge{display:inline-block;background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:6px;font-size:11px;margin:0 2px}';
  document.head.appendChild(style);

  var allInputs = document.querySelectorAll('table input[type="text"], table input:not([type])');
  if(allInputs.length === 0){
    alert('لم يتم العثور على حقول إدخال درجات في هذه الصفحة.\\nتأكد من أنك في صفحة إدخال الدرجات في نظام نور.');
    return;
  }

  var totalCategories = students.length > 0 ? students[0].scores.length : 0;
  var matches = [];
  var matched = 0, unmatched = 0, noScore = 0;

  allInputs.forEach(function(inp){
    var row = inp.closest('tr');
    if(!row) return;
    var cells = row.querySelectorAll('td');
    var rowText = '';
    cells.forEach(function(c){ if(!c.querySelector('input')) rowText += ' ' + c.textContent.trim(); });
    rowText = rowText.trim();

    var found = null;
    for(var i=0;i<students.length;i++){
      var g = students[i];
      var studentName = g.name.replace(/\\s+/g,' ').trim();
      if(rowText.indexOf(studentName) !== -1 || (g.nationalId && g.nationalId !== 'غير مسجل' && rowText.indexOf(g.nationalId) !== -1)){
        found = g;
        break;
      }
    }

    if(found){
      var hasAnyScore = found.scores.some(function(s){ return s.score !== null && s.score !== undefined; });
      if(hasAnyScore){
        matches.push({input:inp, name:found.name, scores:found.scores, status:'ok'});
        matched++;
      } else {
        matches.push({input:inp, name:found.name, scores:found.scores, status:'skip'});
        noScore++;
      }
    } else {
      matches.push({input:inp, name:rowText.substring(0,40), scores:[], status:'miss'});
      unmatched++;
    }
  });

  var overlay = document.createElement('div');
  overlay.id = 'noorFillOverlay';
  var box = document.createElement('div');
  box.id = 'noorFillBox';

  var catNames = totalCategories > 0 ? students[0].scores.map(function(s){ return s.categoryName; }) : [];
  var html = '<h2>⚡ إدخال تلقائي للدرجات</h2>';
  html += '<div class="sub">المعايير: ' + catNames.map(function(n){ return '<span class="catBadge">' + n + '</span>'; }).join(' ') + '</div>';
  html += '<div class="stats">';
  html += '<div class="stat g"><strong>'+matched+'</strong><br>تطابق</div>';
  html += '<div class="stat y"><strong>'+noScore+'</strong><br>بدون درجة</div>';
  html += '<div class="stat r"><strong>'+unmatched+'</strong><br>لم يطابق</div>';
  html += '</div>';

  matches.forEach(function(m){
    var cls = m.status;
    var scoreText = '';
    if(m.status === 'ok'){
      scoreText = m.scores.filter(function(s){ return s.score !== null; }).map(function(s){ return s.categoryName + ': ' + s.score; }).join(' | ');
    } else if(m.status === 'skip'){
      scoreText = 'بدون درجة';
    } else {
      scoreText = 'لم يطابق';
    }
    html += '<div class="row '+cls+'"><span>'+m.name+'</span><span style="font-size:11px"><strong>'+scoreText+'</strong></span></div>';
  });

  html += '<div style="display:flex;justify-content:center;margin-top:16px;gap:8px">';
  html += '<button class="btnOk" id="noorFillConfirm">✓ تطبيق الدرجات</button>';
  html += '<button class="btnCancel" id="noorFillCancel">إلغاء</button>';
  html += '</div>';
  box.innerHTML = html;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  document.getElementById('noorFillCancel').onclick = function(){ overlay.remove(); };
  document.getElementById('noorFillConfirm').onclick = function(){
    var filled = 0;
    matches.forEach(function(m){
      if(m.status === 'ok'){
        // For multi-category: find all inputs in same row
        var row = m.input.closest('tr');
        if(!row) return;
        var rowInputs = row.querySelectorAll('input[type="text"], input:not([type])');
        var inputIdx = 0;
        for(var si=0; si<m.scores.length; si++){
          if(m.scores[si].score !== null && m.scores[si].score !== undefined && inputIdx < rowInputs.length){
            var targetInput = rowInputs[inputIdx];
            var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(targetInput, String(m.scores[si].score));
            targetInput.dispatchEvent(new Event('input', {bubbles:true}));
            targetInput.dispatchEvent(new Event('change', {bubbles:true}));
            targetInput.dispatchEvent(new Event('blur', {bubbles:true}));
            targetInput.style.backgroundColor = '#d1fae5';
            targetInput.style.transition = 'background 0.3s';
            filled++;
          }
          inputIdx++;
        }
      }
    });
    overlay.remove();
    var msg = document.createElement('div');
    msg.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#065f46;color:#fff;padding:12px 24px;border-radius:12px;z-index:99999;font-family:Tahoma;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.2)';
    msg.textContent = '✓ تم ملء '+filled+' درجة بنجاح - تأكد من المراجعة ثم اضغط حفظ';
    document.body.appendChild(msg);
    setTimeout(function(){ msg.remove(); }, 5000);
  };
})();`;

  return `javascript:${encodeURIComponent(script.replace(/\n\s*/g, ''))}`;
}

export default function NoorExportDialog() {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("1");
  const [loading, setLoading] = useState(false);
  const [bookmarkletCode, setBookmarkletCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [generatingBookmarklet, setGeneratingBookmarklet] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("classes").select("id, name, grade, section").then(({ data }) => {
        setClasses(data || []);
      });
    }
  }, [open]);

  useEffect(() => {
    if (selectedClass) {
      setSelectedCategory("");
      setSelectedCategories([]);
      setBookmarkletCode("");
      supabase
        .from("grade_categories")
        .select("id, name, max_score")
        .eq("class_id", selectedClass)
        .order("sort_order")
        .then(({ data }) => {
          setCategories(data || []);
        });
    } else {
      setCategories([]);
    }
  }, [selectedClass]);

  useEffect(() => {
    setBookmarkletCode("");
  }, [selectedCategory, selectedCategories, selectedPeriod]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectAllCategories = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map(c => c.id));
    }
  };

  const fetchMultiCategoryGradeData = async (): Promise<GradeEntry[]> => {
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, national_id")
      .eq("class_id", selectedClass)
      .order("full_name");

    if (!students || students.length === 0) return [];

    const selectedCats = categories.filter(c => selectedCategories.includes(c.id));

    // Fetch grades for all selected categories
    const { data: grades } = await supabase
      .from("grades")
      .select("student_id, score, category_id")
      .eq("period", Number(selectedPeriod))
      .in("category_id", selectedCategories)
      .in("student_id", students.map(s => s.id));

    // Build a map: studentId -> categoryId -> score
    const gradeMap = new Map<string, Map<string, number | null>>();
    (grades || []).forEach(g => {
      if (!gradeMap.has(g.student_id)) gradeMap.set(g.student_id, new Map());
      gradeMap.get(g.student_id)!.set(g.category_id, g.score);
    });

    return students.map(s => ({
      name: s.full_name,
      nationalId: s.national_id || "غير مسجل",
      scores: selectedCats.map(cat => ({
        categoryName: cat.name,
        maxScore: cat.max_score,
        score: gradeMap.get(s.id)?.get(cat.id) ?? null,
      })),
    }));
  };

  const handleExport = async () => {
    if (!selectedClass || !selectedCategory) {
      toast.error("يرجى اختيار الفصل والمادة أولاً");
      return;
    }

    setLoading(true);
    try {
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name, national_id")
        .eq("class_id", selectedClass)
        .order("full_name");

      if (studentsError) throw studentsError;
      if (!students || students.length === 0) {
        toast.error("لا يوجد طلاب في هذا الفصل");
        setLoading(false);
        return;
      }

      const studentIds = students.map((s) => s.id);
      const { data: grades, error: gradesError } = await supabase
        .from("grades")
        .select("student_id, score")
        .eq("category_id", selectedCategory)
        .eq("period", Number(selectedPeriod))
        .in("student_id", studentIds);

      if (gradesError) throw gradesError;

      const gradeMap = new Map<string, number | null>();
      (grades || []).forEach((g) => gradeMap.set(g.student_id, g.score));

      const category = categories.find((c) => c.id === selectedCategory);
      const cls = classes.find((c) => c.id === selectedClass);

      const rows = students.map((s) => ({
        "رقم الهوية": s.national_id || "غير مسجل",
        "اسم الطالب": s.full_name,
        "الدرجة": gradeMap.has(s.id) ? (gradeMap.get(s.id) ?? "لم تُدخل") : "لم تُدخل",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 15 }, { wch: 30 }, { wch: 10 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "درجات نور");

      const periodLabel = selectedPeriod === "1" ? "ف1" : "ف2";
      const fileName = `نور_${cls?.name || "فصل"}_${category?.name || "مادة"}_${periodLabel}.xlsx`;
      XLSX.writeFile(wb, fileName, { bookType: "xlsx", type: "binary" });

      toast.success("تم تصدير الملف بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء التصدير");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBookmarklet = async () => {
    if (!selectedClass || selectedCategories.length === 0) {
      toast.error("يرجى اختيار الفصل ومعيار تقييم واحد على الأقل");
      return;
    }

    setGeneratingBookmarklet(true);
    try {
      const gradeData = await fetchMultiCategoryGradeData();
      if (gradeData.length === 0) {
        toast.error("لا يوجد طلاب في هذا الفصل");
        return;
      }
      const code = generateBookmarkletCode(gradeData);
      setBookmarkletCode(code);
      toast.success("تم تجهيز كود الإدخال التلقائي");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء تجهيز البيانات");
    } finally {
      setGeneratingBookmarklet(false);
    }
  };

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    toast.success("تم نسخ الكود");
    setTimeout(() => setCopied(false), 2000);
  };

  const classSelector = (
    <div className="space-y-2">
      <Label>الفصل</Label>
      <Select value={selectedClass} onValueChange={setSelectedClass}>
        <SelectTrigger>
          <SelectValue placeholder="اختر الفصل" />
        </SelectTrigger>
        <SelectContent>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name} - {c.grade} ({c.section})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const periodSelector = (
    <div className="space-y-2">
      <Label>الفترة</Label>
      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">الفترة الأولى</SelectItem>
          <SelectItem value="2">الفترة الثانية</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const excelCategorySelector = (
    <div className="space-y-2">
      <Label>المادة / المعيار</Label>
      <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!selectedClass}>
        <SelectTrigger>
          <SelectValue placeholder={selectedClass ? "اختر المادة" : "اختر الفصل أولاً"} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name} (من {c.max_score})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const multiCategorySelector = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>المعايير</Label>
        {categories.length > 0 && (
          <button
            type="button"
            onClick={selectAllCategories}
            className="text-xs text-primary hover:underline"
          >
            {selectedCategories.length === categories.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </button>
        )}
      </div>
      {!selectedClass ? (
        <p className="text-sm text-muted-foreground">اختر الفصل أولاً</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد معايير لهذا الفصل</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto rounded-lg border border-border/50 p-3">
          {categories.map((c) => (
            <label
              key={c.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                selectedCategories.includes(c.id)
                  ? "bg-primary/10"
                  : "hover:bg-muted/50"
              )}
            >
              <Checkbox
                checked={selectedCategories.includes(c.id)}
                onCheckedChange={() => toggleCategory(c.id)}
              />
              <span className="text-sm flex-1">{c.name}</span>
              <span className="text-xs text-muted-foreground">من {c.max_score}</span>
            </label>
          ))}
        </div>
      )}
      {selectedCategories.length > 0 && (
        <p className="text-xs text-muted-foreground">
          تم اختيار {selectedCategories.length} معيار
        </p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          تصدير لنظام نور
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            تصدير درجات لنظام نور
          </DialogTitle>
          <DialogDescription>
            صدّر ملف Excel أو أنشئ كود إدخال تلقائي لصفحة نور
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="excel" dir="rtl">
          <TabsList className="w-full">
            <TabsTrigger value="excel" className="flex-1 gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              ملف Excel
            </TabsTrigger>
            <TabsTrigger value="auto" className="flex-1 gap-2">
              <Zap className="h-4 w-4" />
              إدخال تلقائي
            </TabsTrigger>
          </TabsList>

          <TabsContent value="excel">
            <div className="space-y-4 py-2">
              {classSelector}
              {excelCategorySelector}
              {periodSelector}
            </div>
            <div className="flex justify-end mt-2">
              <Button onClick={handleExport} disabled={loading || !selectedClass || !selectedCategory} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {loading ? "جاري التصدير..." : "تصدير"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="auto">
            <div className="space-y-4 py-2">
              {classSelector}
              {multiCategorySelector}
              {periodSelector}
            </div>

            <div className="flex justify-end mt-2">
              <Button
                onClick={handleGenerateBookmarklet}
                disabled={generatingBookmarklet || !selectedClass || selectedCategories.length === 0}
                className="gap-2"
                variant="default"
              >
                {generatingBookmarklet ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {generatingBookmarklet ? "جاري التجهيز..." : "تجهيز كود الإدخال"}
              </Button>
            </div>

            {bookmarkletCode && (
              <div className="mt-4 space-y-3 animate-fade-in">
                <div className="rounded-xl border border-border/40 bg-muted/30 p-4 space-y-3">
                  <h4 className="font-bold text-sm flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" />
                    طريقة الاستخدام
                  </h4>
                  <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>انسخ الكود أدناه</li>
                    <li>افتح <strong className="text-foreground">نظام نور</strong> وادخل صفحة إدخال الدرجات للفصل والمعيار المطلوب</li>
                    <li>افتح <strong className="text-foreground">وحدة التحكم (Console)</strong> في المتصفح بالضغط على <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">F12</kbd></li>
                    <li>الصق الكود في وحدة التحكم واضغط <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">Enter</kbd></li>
                    <li>راجع المطابقة ثم اضغط <strong className="text-foreground">تطبيق الدرجات</strong></li>
                    <li className="text-amber-600 dark:text-amber-400 font-medium">⚠️ لا تنسَ الضغط على حفظ في نور بعد الإدخال</li>
                  </ol>
                </div>

                <Button
                  onClick={handleCopyBookmarklet}
                  variant="outline"
                  className={cn("w-full gap-2 transition-all", copied && "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 text-emerald-700 dark:text-emerald-400")}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "تم النسخ ✓" : "نسخ الكود"}
                </Button>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">أو اسحب هذا الزر إلى شريط المفضلة:</p>
                  <a
                    href={bookmarkletCode}
                    onClick={(e) => e.preventDefault()}
                    draggable
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 cursor-grab active:cursor-grabbing shadow-md"
                  >
                    <Zap className="h-4 w-4" />
                    إدخال درجات نور
                  </a>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
