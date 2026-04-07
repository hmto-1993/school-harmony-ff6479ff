import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { safeWriteXLSX } from "@/lib/download-utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import type { ClassOption, CategoryOption } from "./noor-types";

interface NoorExcelTabProps {
  classes: ClassOption[];
  categories: CategoryOption[];
  selectedClass: string;
  setSelectedClass: (v: string) => void;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedPeriod: string;
  setSelectedPeriod: (v: string) => void;
}

export default function NoorExcelTab({
  classes, categories,
  selectedClass, setSelectedClass,
  selectedCategory, setSelectedCategory,
  selectedPeriod, setSelectedPeriod,
}: NoorExcelTabProps) {
  const [loading, setLoading] = useState(false);

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
      safeWriteXLSX(wb, fileName);

      toast.success("تم تصدير الملف بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء التصدير");
    } finally {
      setLoading(false);
    }
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
          <Label>المادة / المعيار</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!selectedClass}>
            <SelectTrigger><SelectValue placeholder={selectedClass ? "اختر المادة" : "اختر الفصل أولاً"} /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} (من {c.max_score})</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Button onClick={handleExport} disabled={loading || !selectedClass || !selectedCategory} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {loading ? "جاري التصدير..." : "تصدير"}
        </Button>
      </div>
    </div>
  );
}
