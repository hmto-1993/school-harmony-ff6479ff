import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Zap, Copy, Check, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateBookmarkletCode } from "./generate-bookmarklet";
import type { ClassOption, CategoryOption, GradeEntry } from "./noor-types";

interface NoorAutoTabProps {
  classes: ClassOption[];
  categories: CategoryOption[];
  selectedClass: string;
  setSelectedClass: (v: string) => void;
  selectedCategories: string[];
  toggleCategory: (id: string) => void;
  selectAllCategories: () => void;
  selectedPeriod: string;
  setSelectedPeriod: (v: string) => void;
  fetchMultiCategoryGradeData: () => Promise<GradeEntry[]>;
}

export default function NoorAutoTab({
  classes, categories,
  selectedClass, setSelectedClass,
  selectedCategories, toggleCategory, selectAllCategories,
  selectedPeriod, setSelectedPeriod,
  fetchMultiCategoryGradeData,
}: NoorAutoTabProps) {
  const [bookmarkletCode, setBookmarkletCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [generatingBookmarklet, setGeneratingBookmarklet] = useState(false);

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

  return (
    <div>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>الفصل</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} - {c.grade} ({c.section})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>المعايير</Label>
            {categories.length > 0 && (
              <button type="button" onClick={selectAllCategories} className="text-xs text-primary hover:underline">
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
                    selectedCategories.includes(c.id) ? "bg-primary/10" : "hover:bg-muted/50"
                  )}
                >
                  <Checkbox checked={selectedCategories.includes(c.id)} onCheckedChange={() => toggleCategory(c.id)} />
                  <span className="text-sm flex-1">{c.name}</span>
                  <span className="text-xs text-muted-foreground">من {c.max_score}</span>
                </label>
              ))}
            </div>
          )}
          {selectedCategories.length > 0 && (
            <p className="text-xs text-muted-foreground">تم اختيار {selectedCategories.length} معيار</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>الفترة</Label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">الفترة الأولى</SelectItem>
              <SelectItem value="2">الفترة الثانية</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <Button
          onClick={handleGenerateBookmarklet}
          disabled={generatingBookmarklet || !selectedClass || selectedCategories.length === 0}
          className="gap-2"
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
    </div>
  );
}
