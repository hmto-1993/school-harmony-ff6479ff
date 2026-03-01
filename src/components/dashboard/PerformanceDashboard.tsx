import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell,
} from "recharts";
import { Trophy, Users, TrendingUp, TrendingDown, Star, AlertTriangle, BookOpen, ClipboardList } from "lucide-react";

interface ClassInfo { id: string; name: string; }
interface StudentInfo { id: string; full_name: string; class_id: string | null; }
interface GradeRecord { score: number | null; category_id: string; student_id: string; }
interface CategoryInfo { id: string; name: string; max_score: number; class_id: string | null; }

interface StudentRow {
  name: string;
  score: number;
  diff: number;
}

const EXAM_KEYWORDS = ["اختبار", "امتحان", "فترة", "نهائي", "test", "exam"];
const isExamCategory = (name: string) => EXAM_KEYWORDS.some(k => name.includes(k));

function getPerformanceColor(diff: number) {
  if (diff >= 5) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (diff > 0) return "bg-green-50 text-green-600 border-green-200";
  if (diff === 0) return "bg-muted text-muted-foreground border-border";
  if (diff > -5) return "bg-orange-50 text-orange-600 border-orange-200";
  return "bg-red-50 text-red-600 border-red-200";
}

function getScatterColor(score: number, avg: number) {
  const diff = score - avg;
  if (diff >= 5) return "hsl(142, 71%, 45%)";
  if (diff > 0) return "hsl(142, 71%, 60%)";
  if (diff > -5) return "hsl(43, 96%, 56%)";
  return "hsl(0, 72%, 51%)";
}

const COLORS_BAR = [
  "hsl(199, 89%, 48%)", "hsl(142, 71%, 45%)", "hsl(43, 96%, 56%)",
  "hsl(0, 72%, 51%)", "hsl(270, 60%, 55%)", "hsl(200, 80%, 50%)",
];

export default function PerformanceDashboard() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [levelsClassFilter, setLevelsClassFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: cls }, { data: stu }, { data: grd }, { data: cat }] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("students").select("id, full_name, class_id"),
      supabase.from("grades").select("score, category_id, student_id"),
      supabase.from("grade_categories").select("id, name, max_score, class_id").order("sort_order"),
    ]);
    setClasses(cls || []);
    setStudents(stu || []);
    setGrades(grd || []);
    setCategories(cat || []);
  };

  const { dailyCats, examCats } = useMemo(() => {
    const daily = categories.filter(c => !isExamCategory(c.name));
    const exams = categories.filter(c => isExamCategory(c.name));
    return { dailyCats: daily, examCats: exams };
  }, [categories]);

  const computeData = (catFilter: CategoryInfo[], levelsFilter: string) => {
    const catIds = new Set(catFilter.map(c => c.id));
    const catMax: Record<string, number> = {};
    catFilter.forEach(c => { catMax[c.id] = c.max_score; });

    const filteredGrades = grades.filter(g => catIds.has(g.category_id) && g.score != null);

    // Per-student totals
    const studentTotals: Record<string, { total: number; maxTotal: number }> = {};
    filteredGrades.forEach(g => {
      if (!studentTotals[g.student_id]) studentTotals[g.student_id] = { total: 0, maxTotal: 0 };
      studentTotals[g.student_id].total += g.score!;
      studentTotals[g.student_id].maxTotal += (catMax[g.category_id] || 0);
    });

    // Class averages for bar chart
    const classAverages = classes.map(cls => {
      const classStudents = students.filter(s => s.class_id === cls.id);
      const scores = classStudents
        .map(s => studentTotals[s.id])
        .filter(Boolean)
        .map(t => t.maxTotal > 0 ? (t.total / t.maxTotal) * 100 : 0);
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0;
      return { className: cls.name, classId: cls.id, average: avg, studentCount: classStudents.length };
    }).filter(c => c.studentCount > 0);

    // Scatter uses global selectedClass
    const scatterStudents = selectedClass === "all" ? students : students.filter(s => s.class_id === selectedClass);
    const scatterRows = scatterStudents.map(s => {
      const t = studentTotals[s.id];
      const score = t ? (t.maxTotal > 0 ? Math.round((t.total / t.maxTotal) * 100 * 10) / 10 : 0) : 0;
      return { name: s.full_name, score, diff: 0 };
    });
    const scatterAvg = scatterRows.length > 0 ? Math.round(scatterRows.reduce((a, b) => a + b.score, 0) / scatterRows.length * 10) / 10 : 0;
    const scatter = scatterRows.map((r, i) => ({ name: r.name, score: r.score, index: i + 1 }));

    // Levels uses levelsFilter
    const levelsStudents = levelsFilter === "all" ? students : students.filter(s => s.class_id === levelsFilter);
    let studentRows = levelsStudents.map(s => {
      const t = studentTotals[s.id];
      const score = t ? (t.maxTotal > 0 ? Math.round((t.total / t.maxTotal) * 100 * 10) / 10 : 0) : 0;
      return { name: s.full_name, score, diff: 0 };
    });
    const classAvg = studentRows.length > 0 ? Math.round(studentRows.reduce((a, b) => a + b.score, 0) / studentRows.length * 10) / 10 : 0;
    studentRows.forEach(r => { r.diff = Math.round((r.score - classAvg) * 10) / 10; });
    studentRows.sort((a, b) => b.score - a.score);

    return { classAverages, studentRows, classAvg, scatter, scatterAvg };
  };

  const dailyData = useMemo(() => computeData(dailyCats, levelsClassFilter), [dailyCats, grades, students, classes, selectedClass, levelsClassFilter]);
  const examData = useMemo(() => computeData(examCats, levelsClassFilter), [examCats, grades, students, classes, selectedClass, levelsClassFilter]);

  const renderSection = (data: ReturnType<typeof computeData>, emptyMsg: string) => (
    <div className="space-y-4">
      {/* Bar chart */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            مقارنة متوسط الشُعب
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.classAverages.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.classAverages} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="className" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, "المتوسط"]} />
                <Bar dataKey="average" name="متوسط %" radius={[6, 6, 0, 0]}>
                  {data.classAverages.map((e, i) => (
                    <Cell key={i} fill={e.average >= 80 ? "hsl(142, 71%, 45%)" : e.average >= 60 ? "hsl(43, 96%, 56%)" : "hsl(0, 72%, 51%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">{emptyMsg}</p>
          )}
        </CardContent>
      </Card>

      {/* Student levels - Top 5 & Bottom 5 */}
      {data.studentRows.length > 0 && (() => {
        const top5 = data.studentRows.slice(0, 5);
        const bottom5 = data.studentRows.length > 5 ? data.studentRows.slice(-5).reverse() : [];
        
        const renderLevelTable = (rows: StudentRow[], startRank: number, isBottom?: boolean) => (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="border-b bg-muted/60">
                  <th className="text-right p-2 font-medium">#</th>
                  <th className="text-right p-2 font-medium">الطالب</th>
                  <th className="text-center p-2 font-medium">النسبة %</th>
                  <th className="text-center p-2 font-medium">الفرق</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.name + i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-2 text-muted-foreground">{isBottom ? data.studentRows.length - (rows.length - 1 - i) : i + 1}</td>
                    <td className="p-2 font-medium flex items-center gap-1.5">
                      {!isBottom && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                      {isBottom && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                      {row.name}
                    </td>
                    <td className="p-2 text-center font-bold">{row.score}%</td>
                    <td className="p-2 text-center">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${getPerformanceColor(row.diff)}`}>
                        {row.diff > 0 && <TrendingUp className="h-3 w-3" />}
                        {row.diff < 0 && <TrendingDown className="h-3 w-3" />}
                        {row.diff > 0 ? "+" : ""}{row.diff}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

        return (
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  مستويات الطلاب
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={levelsClassFilter} onValueChange={setLevelsClassFilter}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="اختر الشعبة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الشُعب</SelectItem>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">المتوسط: <span className="font-bold text-foreground">{data.classAvg}%</span></span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 mb-2">
                    <Trophy className="h-4 w-4" />
                    أفضل 5 طلاب
                  </h4>
                  {renderLevelTable(top5, 1)}
                </div>
                {bottom5.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-destructive flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      أقل 5 طلاب
                    </h4>
                    {renderLevelTable(bottom5, data.studentRows.length - 4, true)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Scatter */}
      {data.scatter.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              توزيع الدرجات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="index" tick={{ fontSize: 11 }} label={{ value: "ترتيب", position: "insideBottom", offset: -5, fontSize: 10 }} />
                <YAxis dataKey="score" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: "%", angle: -90, position: "insideLeft", fontSize: 10 }} />
                <ZAxis range={[70, 70]} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-xs">
                      <p className="font-bold">{d.name}</p>
                      <p>النسبة: {d.score}%</p>
                    </div>
                  );
                }} />
                <Scatter data={data.scatter}>
                  {data.scatter.map((s, i) => (
                    <Cell key={i} fill={getScatterColor(s.score, data.scatterAvg)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(142, 71%, 45%)" }} /> متفوق</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(43, 96%, 56%)" }} /> متوسط</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(0, 72%, 51%)" }} /> يحتاج دعم</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          تحليل أداء الطلاب
        </h2>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="اختر الشعبة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الشُعب</SelectItem>
            {classes.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="daily" dir="rtl">
        <TabsList>
          <TabsTrigger value="daily" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            المشاركة والواجبات
          </TabsTrigger>
          <TabsTrigger value="exams" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            الاختبارات
          </TabsTrigger>
        </TabsList>
        <TabsContent value="daily">
          {renderSection(dailyData, "لا توجد بيانات للمشاركة والواجبات")}
        </TabsContent>
        <TabsContent value="exams">
          {renderSection(examData, "لا توجد بيانات اختبارات")}
        </TabsContent>
      </Tabs>
    </div>
  );
}