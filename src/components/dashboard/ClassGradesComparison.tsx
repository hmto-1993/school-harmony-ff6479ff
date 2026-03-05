import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BookOpen, Trophy } from "lucide-react";

interface ClassInfo {
  id: string;
  name: string;
}

interface CategoryInfo {
  id: string;
  name: string;
  max_score: number;
  class_id: string | null;
}

interface ClassAvg {
  className: string;
  [category: string]: string | number;
}

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 47%)",
  "hsl(0, 84%, 60%)",
  "hsl(270, 60%, 55%)",
  "hsl(200, 80%, 50%)",
];

export default function ClassGradesComparison() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [dailyCategories, setDailyCategories] = useState<CategoryInfo[]>([]);
  const [examCategories, setExamCategories] = useState<CategoryInfo[]>([]);
  const [dailyChartData, setDailyChartData] = useState<ClassAvg[]>([]);
  const [examChartData, setExamChartData] = useState<ClassAvg[]>([]);
  const [dailyCatNames, setDailyCatNames] = useState<string[]>([]);
  const [examCatNames, setExamCatNames] = useState<string[]>([]);

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    if (classes.length > 0) {
      buildCharts();
    }
  }, [selectedClass, dailyCategories, examCategories, classes]);

  const fetchInitial = async () => {
    const [{ data: classesData }, { data: categoriesData }] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("grade_categories").select("id, name, max_score, class_id").order("sort_order"),
    ]);

    const cls = classesData || [];
    const cats = categoriesData || [];
    setClasses(cls);

    // Separate daily (participation/homework) from exam categories by name heuristic
    const examKeywords = ["اختبار", "امتحان", "فترة", "نهائي", "test", "exam"];
    const daily = cats.filter(c => !examKeywords.some(k => c.name.includes(k)));
    const exams = cats.filter(c => examKeywords.some(k => c.name.includes(k)));

    setDailyCategories(daily);
    setExamCategories(exams);
  };

  const buildCharts = async () => {
    await Promise.all([
      buildCategoryChart(dailyCategories, setDailyChartData, setDailyCatNames),
      buildCategoryChart(examCategories, setExamChartData, setExamCatNames),
    ]);
  };

  const buildCategoryChart = async (
    categories: CategoryInfo[],
    setData: (d: ClassAvg[]) => void,
    setCatNames: (n: string[]) => void,
  ) => {
    if (categories.length === 0) {
      setData([]);
      setCatNames([]);
      return;
    }

    const catIds = categories.map(c => c.id);
    const { data: gradesData } = await supabase
      .from("grades")
      .select("score, category_id, student_id")
      .in("category_id", catIds);

    const { data: studentsData } = await supabase
      .from("students")
      .select("id, class_id");

    const grades = gradesData || [];
    const students = studentsData || [];

    const studentClassMap: Record<string, string> = {};
    students.forEach(s => {
      if (s.class_id) studentClassMap[s.id] = s.class_id;
    });

    const catNameMap: Record<string, string> = {};
    categories.forEach(c => { catNameMap[c.id] = c.name; });
    const uniqueCatNames = [...new Set(categories.map(c => c.name))];
    setCatNames(uniqueCatNames);

    const targetClasses = selectedClass === "all"
      ? classes
      : classes.filter(c => c.id === selectedClass);

    const chartData: ClassAvg[] = targetClasses.map(cls => {
      const classStudentIds = students.filter(s => s.class_id === cls.id).map(s => s.id);
      const classGrades = grades.filter(g => classStudentIds.includes(g.student_id));

      const entry: ClassAvg = { className: cls.name };
      uniqueCatNames.forEach(catName => {
        const relevantCatIds = categories.filter(c => c.name === catName).map(c => c.id);
        const catGrades = classGrades.filter(g => relevantCatIds.includes(g.category_id) && g.score !== null);
        const avg = catGrades.length > 0
          ? Math.round(catGrades.reduce((sum, g) => sum + (g.score || 0), 0) / catGrades.length * 10) / 10
          : 0;
        entry[catName] = avg;
      });
      return entry;
    });

    setData(chartData);
  };

  const renderChart = (data: ClassAvg[], catNames: string[], emptyMsg: string) => {
    if (data.length === 0 || catNames.length === 0) {
      return <p className="text-center text-sm text-muted-foreground py-8">{emptyMsg}</p>;
    }
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="className" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          {catNames.map((cat, i) => (
            <Bar key={cat} dataKey={cat} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            مقارنة مستويات الفصول
          </CardTitle>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="اختر الفصل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفصول</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" dir="rtl">
          <TabsList className="mb-4">
            <TabsTrigger value="daily">المشاركة والواجبات</TabsTrigger>
            <TabsTrigger value="exams">الاختبارات</TabsTrigger>
          </TabsList>
          <TabsContent value="daily">
            {renderChart(dailyChartData, dailyCatNames, "لا توجد بيانات للمشاركة والواجبات")}
          </TabsContent>
          <TabsContent value="exams">
            {renderChart(examChartData, examCatNames, "لا توجد بيانات اختبارات")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
