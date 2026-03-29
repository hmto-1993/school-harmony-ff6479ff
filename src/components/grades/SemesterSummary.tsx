import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, TrendingDown, Minus, Download, Printer, FileText } from "lucide-react";
import GradesExportDialog, { ExportTableGroup, ExportExtraSheet } from "./GradesExportDialog";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { printGradesTable, exportGradesTableAsPDF } from "@/lib/grades-print";
import { format } from "date-fns";

interface ClassInfo { id: string; name: string; }
interface CategoryInfo { id: string; name: string; max_score: number; class_id: string; category_group: string; }

interface SemesterRow {
  student_id: string;
  full_name: string;
  class_id: string;
  class_name: string;
  classworkTotal1: number;
  classworkTotal2: number;
  classworkMax: number;
  examTotal1: number;
  examTotal2: number;
  examMax: number;
  grandTotal: number;
  grandMax: number;
}

interface SemesterSummaryProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
}

export default function SemesterSummary({ selectedClass, onClassChange }: SemesterSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [rows, setRows] = useState<SemesterRow[]>([]);
  const [searchName, setSearchName] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: classesData }, { data: studentsData }, { data: catsData }] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("students").select("id, full_name, class_id").order("full_name"),
      supabase.from("grade_categories").select("*").order("sort_order"),
    ]);

    const cls = classesData || [];
    const students = studentsData || [];
    const cats = (catsData || []) as CategoryInfo[];
    const studentIds = students.map(s => s.id);

    let allGrades: any[] = [];
    if (studentIds.length > 0) {
      const { data } = await supabase
        .from("grades")
        .select("student_id, category_id, score, period")
        .in("student_id", studentIds);
      allGrades = data || [];
    }

    const gradesMap = new Map<string, Map<number, Map<string, number | null>>>();
    allGrades.forEach(g => {
      if (!gradesMap.has(g.student_id)) gradesMap.set(g.student_id, new Map());
      const periodMap = gradesMap.get(g.student_id)!;
      if (!periodMap.has(g.period)) periodMap.set(g.period, new Map());
      periodMap.get(g.period)!.set(g.category_id, g.score != null ? Number(g.score) : null);
    });

    const classMap = new Map(cls.map(c => [c.id, c.name]));

    const result: SemesterRow[] = students.filter(s => s.class_id).map(s => {
      const classCats = cats.filter(c => c.class_id === s.class_id);
      const classworkCats = classCats.filter(c => c.category_group === 'classwork');
      const examCats = classCats.filter(c => c.category_group === 'exams');
      const studentPeriods = gradesMap.get(s.id) || new Map();
      const p1Map = studentPeriods.get(1) || new Map();
      const p2Map = studentPeriods.get(2) || new Map();

      const sumCats = (catList: CategoryInfo[], pMap: Map<string, number | null>) => {
        let total = 0;
        catList.forEach(cat => {
          const sc = pMap.get(cat.id);
          if (sc != null) total += sc;
        });
        return total;
      };
      const maxCats = (catList: CategoryInfo[]) => catList.reduce((s, c) => s + Number(c.max_score), 0);

      const classworkMax = maxCats(classworkCats);
      const examMax = maxCats(examCats);
      const cw1 = sumCats(classworkCats, p1Map);
      const cw2 = sumCats(classworkCats, p2Map);
      const ex1 = sumCats(examCats, p1Map);
      const ex2 = sumCats(examCats, p2Map);

      return {
        student_id: s.id,
        full_name: s.full_name,
        class_id: s.class_id!,
        class_name: classMap.get(s.class_id!) || "",
        classworkTotal1: cw1, classworkTotal2: cw2, classworkMax,
        examTotal1: ex1, examTotal2: ex2, examMax,
        grandTotal: cw1 + cw2 + ex1 + ex2,
        grandMax: (classworkMax + examMax) * 2,
      };
    });

    setClasses(cls);
    setRows(result);
    setLoading(false);
  };

  const filtered = rows.filter(r => {
    const matchName = !searchName || r.full_name.includes(searchName);
    const matchClass = !selectedClass || selectedClass === "all" || r.class_id === selectedClass;
    return matchName && matchClass;
  });

  const grouped = classes
    .map(cls => ({
      ...cls,
      students: filtered.filter(r => r.class_id === cls.id),
    }))
    .filter(g => g.students.length > 0);

  const getPercentage = (score: number, max: number) => max > 0 ? Math.round((score / max) * 100) : 0;

  const getGradeLabel = (pct: number) => {
    if (pct >= 90) return { label: "ممتاز", color: "text-emerald-600 dark:text-emerald-400" };
    if (pct >= 80) return { label: "جيد جداً", color: "text-blue-600 dark:text-blue-400" };
    if (pct >= 70) return { label: "جيد", color: "text-sky-600 dark:text-sky-400" };
    if (pct >= 60) return { label: "مقبول", color: "text-amber-600 dark:text-amber-400" };
    return { label: "ضعيف", color: "text-rose-600 dark:text-rose-400" };
  };

  const getTrend = (t1: number, t2: number) => {
    if (t2 > t1) return "up";
    if (t2 < t1) return "down";
    return "same";
  };

  const handlePrintTable = async (classId: string, className: string) => {
    const group = grouped.find(g => g.id === classId);
    if (!group) return;

    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th rowspan="2" style="width:30px;">#</th>
            <th rowspan="2" style="width:20%;">الطالب</th>
            <th colspan="2" class="subtotal-header">الفترة الأولى</th>
            <th colspan="2" class="subtotal-header">الفترة الثانية</th>
            <th rowspan="2">الإجمالي</th>
            <th rowspan="2">النسبة</th>
            <th rowspan="2">التقدير</th>
          </tr>
          <tr>
            <th>المهام والمشاركة</th>
            <th>الاختبارات</th>
            <th>المهام والمشاركة</th>
            <th>الاختبارات</th>
          </tr>
        </thead>
        <tbody>
          ${group.students.map((sg, i) => {
            const pct = getPercentage(sg.grandTotal, sg.grandMax);
            const grade = getGradeLabel(pct);
            const gradeClass = pct >= 90 ? "grade-excellent" : pct >= 80 ? "grade-very-good" : pct >= 70 ? "grade-good" : pct >= 60 ? "grade-acceptable" : "grade-weak";
            return `
              <tr>
                <td>${i + 1}</td>
                <td>${sg.full_name}</td>
                <td>${sg.classworkTotal1} / ${sg.classworkMax}</td>
                <td>${sg.examTotal1} / ${sg.examMax}</td>
                <td>${sg.classworkTotal2} / ${sg.classworkMax}</td>
                <td>${sg.examTotal2} / ${sg.examMax}</td>
                <td class="subtotal-cell">${sg.grandTotal} / ${sg.grandMax}</td>
                <td>${pct}%</td>
                <td class="${gradeClass}">${grade.label}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;

    await printGradesTable({
      orientation: "landscape",
      title: `ملخص الفصل الدراسي — ${className}`,
      subtitle: format(new Date(), "yyyy/MM/dd"),
      reportType: "grades",
      tableHTML,
    });
  };

  const handleExportPDF = async (classId: string, className: string) => {
    const group = grouped.find(g => g.id === classId);
    if (!group) return;

    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th rowspan="2" style="width:30px;">#</th>
            <th rowspan="2" style="width:20%;">الطالب</th>
            <th colspan="2" class="subtotal-header">الفترة الأولى</th>
            <th colspan="2" class="subtotal-header">الفترة الثانية</th>
            <th rowspan="2">الإجمالي</th>
            <th rowspan="2">النسبة</th>
            <th rowspan="2">التقدير</th>
          </tr>
          <tr>
            <th>المهام والمشاركة</th>
            <th>الاختبارات</th>
            <th>المهام والمشاركة</th>
            <th>الاختبارات</th>
          </tr>
        </thead>
        <tbody>
          ${group.students.map((sg, i) => {
            const pct = getPercentage(sg.grandTotal, sg.grandMax);
            const grade = getGradeLabel(pct);
            const gradeClass = pct >= 90 ? "grade-excellent" : pct >= 80 ? "grade-very-good" : pct >= 70 ? "grade-good" : pct >= 60 ? "grade-acceptable" : "grade-weak";
            return `
              <tr>
                <td>${i + 1}</td>
                <td>${sg.full_name}</td>
                <td>${sg.classworkTotal1} / ${sg.classworkMax}</td>
                <td>${sg.examTotal1} / ${sg.examMax}</td>
                <td>${sg.classworkTotal2} / ${sg.classworkMax}</td>
                <td>${sg.examTotal2} / ${sg.examMax}</td>
                <td class="subtotal-cell">${sg.grandTotal} / ${sg.grandMax}</td>
                <td>${pct}%</td>
                <td class="${gradeClass}">${grade.label}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;

    try {
      await exportGradesTableAsPDF({
        orientation: "landscape",
        title: `ملخص الفصل الدراسي — ${className}`,
        subtitle: format(new Date(), "yyyy/MM/dd"),
        reportType: "grades",
        tableHTML,
        fileName: `ملخص_الفصل_${className}_${format(new Date(), "yyyy-MM-dd")}`,
      });
    } catch { /* handled */ }
  };

  if (loading) return <p className="text-center py-12 text-muted-foreground">جارٍ تحميل ملخص الفصل...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 no-print">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث باسم الطالب..." value={searchName} onChange={e => setSearchName(e.target.value)} className="pr-9" />
        </div>
      </div>

      {grouped.length > 0 && (
        <div className="flex justify-end no-print">
          <GradesExportDialog
            title="ملخص الفصل"
            fileName="ملخص_الفصل"
            groups={grouped.map((group) => {
              const groupHeaders: { label: string; colSpan: number }[] = [
                { label: "#", colSpan: 1 },
                { label: "الطالب", colSpan: 1 },
                { label: "الفترة الأولى", colSpan: 2 },
                { label: "الفترة الثانية", colSpan: 2 },
                { label: "الإجمالي", colSpan: 1 },
                { label: "النسبة", colSpan: 1 },
                { label: "التقدير", colSpan: 1 },
              ];
              const headers = ["#", "الطالب", "المهام والمشاركة", "الاختبارات", "المهام والمشاركة", "الاختبارات", "الإجمالي", "النسبة", "التقدير"];
              const rows = group.students.map((sg, i) => {
                const pct = getPercentage(sg.grandTotal, sg.grandMax);
                const grade = getGradeLabel(pct);
                return [
                  String(i + 1), sg.full_name,
                  `${sg.classworkTotal1} / ${sg.classworkMax}`,
                  `${sg.examTotal1} / ${sg.examMax}`,
                  `${sg.classworkTotal2} / ${sg.classworkMax}`,
                  `${sg.examTotal2} / ${sg.examMax}`,
                  `${sg.grandTotal} / ${sg.grandMax}`,
                  `${pct}%`,
                  grade.label,
                ];
              });
              return { className: group.name, headers, rows, groupHeaders } as ExportTableGroup;
            })}
            extraSheets={(() => {
              const sheets: ExportExtraSheet[] = [];
              // Grade distribution stats per class
              const statsData: Record<string, string | number>[] = [];
              grouped.forEach((group) => {
                const counts = { "ممتاز": 0, "جيد جداً": 0, "جيد": 0, "مقبول": 0, "ضعيف": 0 };
                group.students.forEach((sg) => {
                  const pct = getPercentage(sg.grandTotal, sg.grandMax);
                  const grade = getGradeLabel(pct);
                  counts[grade.label as keyof typeof counts]++;
                });
                statsData.push({
                  "الفصل": group.name,
                  "عدد الطلاب": group.students.length,
                  "ممتاز": counts["ممتاز"],
                  "جيد جداً": counts["جيد جداً"],
                  "جيد": counts["جيد"],
                  "مقبول": counts["مقبول"],
                  "ضعيف": counts["ضعيف"],
                  "نسبة الممتاز %": group.students.length > 0 ? Math.round((counts["ممتاز"] / group.students.length) * 100) : 0,
                  "نسبة النجاح %": group.students.length > 0 ? Math.round(((group.students.length - counts["ضعيف"]) / group.students.length) * 100) : 0,
                });
              });
              sheets.push({ name: "إحصائيات التقديرات", data: statsData });

              // Per-student percentages for charting
              const chartData: Record<string, string | number>[] = [];
              grouped.forEach((group) => {
                group.students.forEach((sg) => {
                  const pct = getPercentage(sg.grandTotal, sg.grandMax);
                  chartData.push({
                    "الفصل": group.name,
                    "الطالب": sg.full_name,
                    "النسبة المئوية": pct,
                    "التقدير": getGradeLabel(pct).label,
                  });
                });
              });
              sheets.push({ name: "بيانات الرسم البياني", data: chartData });

              return sheets;
            })()}
          />
        </div>
      )}

      {grouped.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">لا توجد بيانات درجات بعد</p>
      ) : grouped.map(group => (
        <Card key={group.id} className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
          <CardHeader className="pb-3 no-print">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{group.name}</CardTitle>
                <Badge variant="secondary">{group.students.length} طالب</Badge>
                <Badge variant="outline" className="text-xs">ملخص الفصل الدراسي</Badge>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="تصدير PDF" onClick={() => handleExportPDF(group.id, group.name)}>
                  <FileText className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="طباعة" onClick={() => handlePrintTable(group.id, group.name)}>
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="hidden print:block text-center mb-2">
              <h2 className="text-sm font-bold">{group.name} — ملخص الفصل الدراسي</h2>
            </div>
            <div className="w-full overflow-x-auto -mx-1 px-1 rounded-xl border border-border/40 shadow-sm" dir="rtl">
              <table className="w-full text-sm border-separate border-spacing-0" style={{ tableLayout: "auto" }} dir="rtl">
                <thead>
                  <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                    <th rowSpan={2} className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">#</th>
                    <th rowSpan={2} className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[160px]">الطالب</th>
                    <th colSpan={2} className="text-center p-2 font-semibold text-primary text-xs border-b border-primary/20 bg-primary/5">
                      الفترة الأولى
                    </th>
                    <th colSpan={2} className="text-center p-2 font-semibold text-primary text-xs border-b border-primary/20 bg-accent/5">
                      الفترة الثانية
                    </th>
                    <th rowSpan={2} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[90px]">الإجمالي</th>
                    <th rowSpan={2} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[70px]">النسبة</th>
                    <th rowSpan={2} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[70px] last:rounded-tl-xl">التقدير</th>
                  </tr>
                  <tr className="bg-muted/30">
                    <th className="text-center p-2 font-medium text-xs border-b-2 border-primary/20 text-muted-foreground min-w-[90px]">المهام والمشاركة</th>
                    <th className="text-center p-2 font-medium text-xs border-b-2 border-primary/20 text-muted-foreground min-w-[90px]">الاختبارات</th>
                    <th className="text-center p-2 font-medium text-xs border-b-2 border-primary/20 text-muted-foreground min-w-[90px]">المهام والمشاركة</th>
                    <th className="text-center p-2 font-medium text-xs border-b-2 border-primary/20 text-muted-foreground min-w-[90px]">الاختبارات</th>
                  </tr>
                </thead>
                <tbody>
                  {group.students.map((sg, i) => {
                    const isEven = i % 2 === 0;
                    const isLast = i === group.students.length - 1;
                    const pct = getPercentage(sg.grandTotal, sg.grandMax);
                    const grade = getGradeLabel(pct);
                    const totalP1 = sg.classworkTotal1 + sg.examTotal1;
                    const totalP2 = sg.classworkTotal2 + sg.examTotal2;
                    const trend = getTrend(totalP1, totalP2);

                    return (
                      <tr key={sg.student_id} className={cn(
                        isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                        !isLast && "border-b border-border/20"
                      )}>
                        <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{i + 1}</td>
                        <td className="p-3 font-semibold border-l border-border/10">{sg.full_name}</td>

                        {/* Period 1 */}
                        <td className="p-2 text-center font-bold border-l border-border/10 text-primary">
                          {sg.classworkTotal1} / {sg.classworkMax}
                        </td>
                        <td className="p-2 text-center font-bold border-l border-border/10 text-primary">
                          {sg.examTotal1} / {sg.examMax}
                        </td>

                        {/* Period 2 */}
                        <td className="p-2 text-center font-bold border-l border-border/10 text-primary">
                          {sg.classworkTotal2} / {sg.classworkMax}
                        </td>
                        <td className="p-2 text-center font-bold border-l border-border/10 text-primary">
                          {sg.examTotal2} / {sg.examMax}
                        </td>

                        {/* Grand total */}
                        <td className="p-2 text-center border-l border-border/10">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-bold">{sg.grandTotal}</span>
                            <span className="text-muted-foreground text-xs">/ {sg.grandMax}</span>
                            {trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                            {trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-rose-500" />}
                            {trend === "same" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        </td>

                        {/* Percentage */}
                        <td className="p-2 text-center border-l border-border/10">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-xs">{pct}%</span>
                            <Progress value={pct} className="h-1.5 w-14" />
                          </div>
                        </td>

                        {/* Grade label */}
                        <td className={cn("p-2 text-center font-bold text-xs", isLast && "last:rounded-bl-xl", grade.color)}>
                          {grade.label}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
