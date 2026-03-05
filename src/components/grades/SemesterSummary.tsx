import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface ClassInfo { id: string; name: string; }
interface CategoryInfo { id: string; name: string; max_score: number; class_id: string; }

interface SemesterRow {
  student_id: string;
  full_name: string;
  class_id: string;
  class_name: string;
  period1: Record<string, number | null>;
  period2: Record<string, number | null>;
  total1: number;
  total2: number;
  maxTotal: number;
}

interface SemesterSummaryProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
}

export default function SemesterSummary({ selectedClass, onClassChange }: SemesterSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryInfo[]>([]);
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

    // Map: student_id -> period -> category_id -> score
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
      const studentPeriods = gradesMap.get(s.id) || new Map();
      const p1Map = studentPeriods.get(1) || new Map();
      const p2Map = studentPeriods.get(2) || new Map();

      const period1: Record<string, number | null> = {};
      const period2: Record<string, number | null> = {};
      let total1 = 0, total2 = 0, maxTotal = 0;

      classCats.forEach(cat => {
        const s1 = p1Map.get(cat.id) ?? null;
        const s2 = p2Map.get(cat.id) ?? null;
        period1[cat.id] = s1;
        period2[cat.id] = s2;
        maxTotal += Number(cat.max_score);
        if (s1 != null) total1 += s1;
        if (s2 != null) total2 += s2;
      });

      return {
        student_id: s.id,
        full_name: s.full_name,
        class_id: s.class_id!,
        class_name: classMap.get(s.class_id!) || "",
        period1, period2, total1, total2, maxTotal,
      };
    });

    setClasses(cls);
    setAllCategories(cats);
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
      categories: allCategories.filter(c => c.class_id === cls.id),
    }))
    .filter(g => g.students.length > 0);

  const getTrend = (t1: number, t2: number) => {
    if (t2 > t1) return "up";
    if (t2 < t1) return "down";
    return "same";
  };

  const getPercentage = (score: number, max: number) => max > 0 ? Math.round((score / max) * 100) : 0;

  const getGradeLabel = (pct: number) => {
    if (pct >= 90) return { label: "ممتاز", color: "text-emerald-600 dark:text-emerald-400" };
    if (pct >= 80) return { label: "جيد جداً", color: "text-blue-600 dark:text-blue-400" };
    if (pct >= 70) return { label: "جيد", color: "text-sky-600 dark:text-sky-400" };
    if (pct >= 60) return { label: "مقبول", color: "text-amber-600 dark:text-amber-400" };
    return { label: "ضعيف", color: "text-rose-600 dark:text-rose-400" };
  };

  if (loading) return <p className="text-center py-12 text-muted-foreground">جارٍ تحميل ملخص الفصل...</p>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث باسم الطالب..." value={searchName} onChange={e => setSearchName(e.target.value)} className="pr-9" />
        </div>
        <Select value={selectedClass || "all"} onValueChange={v => onClassChange(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="جميع الفصول" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفصول</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {grouped.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">لا توجد بيانات درجات بعد</p>
      ) : grouped.map(group => (
        <Card key={group.id} className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{group.name}</CardTitle>
              <Badge variant="secondary">{group.students.length} طالب</Badge>
              <Badge variant="outline" className="text-xs">ملخص الفصل الدراسي</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                    <th rowSpan={2} className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">#</th>
                    <th rowSpan={2} className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[160px]">الطالب</th>
                    <th colSpan={group.categories.length + 1} className="text-center p-2 font-semibold text-primary text-xs border-b border-primary/20 bg-primary/5">
                      الفترة الأولى
                    </th>
                    <th colSpan={group.categories.length + 1} className="text-center p-2 font-semibold text-primary text-xs border-b border-primary/20 bg-accent/5">
                      الفترة الثانية
                    </th>
                    <th rowSpan={2} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[90px]">الإجمالي</th>
                    <th rowSpan={2} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[70px]">النسبة</th>
                    <th rowSpan={2} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[70px] last:rounded-tl-xl">التقدير</th>
                  </tr>
                  <tr className="bg-muted/30">
                    {group.categories.map(cat => (
                      <th key={`p1-${cat.id}`} className="text-center p-2 font-medium text-xs border-b-2 border-primary/20 text-muted-foreground min-w-[70px]">
                        {cat.name}
                      </th>
                    ))}
                    <th className="text-center p-2 font-medium text-xs border-b-2 border-primary/20 text-primary min-w-[60px]">المجموع</th>
                    {group.categories.map(cat => (
                      <th key={`p2-${cat.id}`} className="text-center p-2 font-medium text-xs border-b-2 border-primary/20 text-muted-foreground min-w-[70px]">
                        {cat.name}
                      </th>
                    ))}
                    <th className="text-center p-2 font-medium text-xs border-b-2 border-primary/20 text-primary min-w-[60px]">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {group.students.map((sg, i) => {
                    const isEven = i % 2 === 0;
                    const isLast = i === group.students.length - 1;
                    const grandTotal = sg.total1 + sg.total2;
                    const grandMax = sg.maxTotal * 2;
                    const pct = getPercentage(grandTotal, grandMax);
                    const grade = getGradeLabel(pct);
                    const trend = getTrend(sg.total1, sg.total2);

                    return (
                      <tr key={sg.student_id} className={cn(
                        isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                        !isLast && "border-b border-border/20"
                      )}>
                        <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{i + 1}</td>
                        <td className="p-3 font-semibold border-l border-border/10">{sg.full_name}</td>
                        
                        {/* Period 1 scores */}
                        {group.categories.map(cat => (
                          <td key={`p1-${cat.id}`} className="p-2 text-center border-l border-border/10">
                            <span className={sg.period1[cat.id] == null ? "text-muted-foreground" : ""}>
                              {sg.period1[cat.id] ?? "—"}
                            </span>
                          </td>
                        ))}
                        <td className="p-2 text-center font-bold border-l border-border/10 text-primary">
                          {sg.total1} / {sg.maxTotal}
                        </td>

                        {/* Period 2 scores */}
                        {group.categories.map(cat => (
                          <td key={`p2-${cat.id}`} className="p-2 text-center border-l border-border/10">
                            <span className={sg.period2[cat.id] == null ? "text-muted-foreground" : ""}>
                              {sg.period2[cat.id] ?? "—"}
                            </span>
                          </td>
                        ))}
                        <td className="p-2 text-center font-bold border-l border-border/10 text-primary">
                          {sg.total2} / {sg.maxTotal}
                        </td>

                        {/* Grand total */}
                        <td className="p-2 text-center border-l border-border/10">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-bold">{grandTotal}</span>
                            <span className="text-muted-foreground text-xs">/ {grandMax}</span>
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
