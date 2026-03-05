import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Pencil, X, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ClassInfo {
  id: string;
  name: string;
}

interface CategoryInfo {
  id: string;
  name: string;
  weight: number;
  max_score: number;
  class_id: string;
}

interface SummaryRow {
  student_id: string;
  full_name: string;
  class_name: string;
  class_id: string;
  grades: Record<string, number | null>;
  grade_ids: Record<string, string>;
  total: string;
}

interface GradesSummaryProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
}

export default function GradesSummary({ selectedClass, onClassChange }: GradesSummaryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryInfo[]>([]);
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editedGrades, setEditedGrades] = useState<Record<string, number | null>>({});
  const [saving, setSaving] = useState(false);
  const [searchName, setSearchName] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);

    const [{ data: classesData }, { data: studentsData }, { data: catsData }] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("students").select("id, full_name, class_id").order("full_name"),
      supabase.from("grade_categories").select("*").order("sort_order"),
    ]);

    const cls = classesData || [];
    const students = studentsData || [];
    const cats = (catsData || []) as CategoryInfo[];

    // Fetch all grades
    const studentIds = students.map((s) => s.id);
    let allGrades: any[] = [];
    if (studentIds.length > 0) {
      const { data: gradesData } = await supabase
        .from("grades")
        .select("id, student_id, category_id, score")
        .in("student_id", studentIds);
      allGrades = gradesData || [];
    }

    const gradesMap = new Map<string, Map<string, { score: number | null; id: string }>>();
    allGrades.forEach((g) => {
      if (!gradesMap.has(g.student_id)) gradesMap.set(g.student_id, new Map());
      gradesMap.get(g.student_id)!.set(g.category_id, { score: g.score != null ? Number(g.score) : null, id: g.id });
    });

    const classMap = new Map(cls.map((c) => [c.id, c.name]));

    const rows: SummaryRow[] = students
      .filter((s) => s.class_id)
      .map((s) => {
        const classCats = cats.filter((c) => c.class_id === s.class_id);
        const studentGradesMap = gradesMap.get(s.id) || new Map();
        const grades: Record<string, number | null> = {};
        const gradeIds: Record<string, string> = {};

        classCats.forEach((c) => {
          const g = studentGradesMap.get(c.id);
          grades[c.id] = g?.score ?? null;
          if (g?.id) gradeIds[c.id] = g.id;
        });

        // calc total
        let total = 0;
        let totalWeight = 0;
        classCats.forEach((cat) => {
          const score = grades[cat.id];
          if (score !== null && score !== undefined) {
            const weight = Number(cat.weight);
            total += (score / Number(cat.max_score)) * weight;
            totalWeight += weight;
          }
        });
        const totalStr = totalWeight > 0 ? ((total / totalWeight) * 100).toFixed(1) : "—";

        return {
          student_id: s.id,
          full_name: s.full_name,
          class_name: classMap.get(s.class_id!) || "",
          class_id: s.class_id!,
          grades,
          grade_ids: gradeIds,
          total: totalStr,
        };
      });

    setClasses(cls);
    setAllCategories(cats);
    setSummaryRows(rows);
    setLoading(false);
  };

  const startEdit = (studentId: string) => {
    const row = summaryRows.find((r) => r.student_id === studentId);
    if (row) {
      setEditingStudent(studentId);
      setEditedGrades({ ...row.grades });
    }
  };

  const cancelEdit = () => {
    setEditingStudent(null);
    setEditedGrades({});
  };

  const handleEditGrade = (categoryId: string, value: string) => {
    const numValue = value === "" ? null : Math.min(100, Math.max(0, Number(value)));
    setEditedGrades((prev) => ({ ...prev, [categoryId]: numValue }));
  };

  const saveEdit = async () => {
    if (!user || !editingStudent) return;
    setSaving(true);

    const row = summaryRows.find((r) => r.student_id === editingStudent);
    if (!row) return;

    const classCats = allCategories.filter((c) => c.class_id === row.class_id);

    for (const cat of classCats) {
      const score = editedGrades[cat.id];
      const existingId = row.grade_ids[cat.id];

      if (score !== null && score !== undefined) {
        if (existingId) {
          await supabase.from("grades").update({ score }).eq("id", existingId);
        } else {
          await supabase.from("grades").insert({
            student_id: editingStudent,
            category_id: cat.id,
            score,
            recorded_by: user.id,
          });
        }
      }
    }

    toast({ title: "تم الحفظ", description: "تم تعديل الدرجات بنجاح" });
    setSaving(false);
    setEditingStudent(null);
    setEditedGrades({});
    loadAllData();
  };

  // Filter and group by class
  const filteredRows = summaryRows.filter((r) => {
    const matchesName = !searchName || r.full_name.includes(searchName);
    const matchesClass = !selectedClass || selectedClass === "all" || r.class_id === selectedClass;
    return matchesName && matchesClass;
  });

  const groupedByClass = classes
    .map((cls) => ({
      ...cls,
      students: filteredRows.filter((r) => r.class_id === cls.id),
      categories: allCategories.filter((c) => c.class_id === cls.id),
    }))
    .filter((g) => g.students.length > 0);

  if (loading) {
    return <p className="text-center py-12 text-muted-foreground">جارٍ تحميل الخلاصة...</p>;
  }

  if (groupedByClass.length === 0) {
    return <p className="text-center py-12 text-muted-foreground">لا توجد بيانات درجات بعد</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث باسم الطالب..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={selectedClass || "all"} onValueChange={(v) => onClassChange(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-56">
             <SelectValue placeholder="جميع الفصول" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">جميع الفصول</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {groupedByClass.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">لا توجد نتائج مطابقة</p>
      ) : groupedByClass.map((group) => (
        <Card key={group.id} className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{group.name}</CardTitle>
              <Badge variant="secondary">{group.students.length} طالب</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                    <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">#</th>
                    <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[180px]">الطالب</th>
                    {group.categories.map((cat) => (
                      <th key={cat.id} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[100px]">
                        <div>{cat.name}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          ({Number(cat.weight)}%) من {Number(cat.max_score)}
                        </div>
                      </th>
                    ))}
                    <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[80px]">المجموع %</th>
                    <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 w-[80px] last:rounded-tl-xl">تعديل</th>
                  </tr>
                </thead>
                <tbody>
                  {group.students.map((sg, i) => {
                    const isEditing = editingStudent === sg.student_id;
                    const isEven = i % 2 === 0;
                    const isLast = i === group.students.length - 1;
                    return (
                      <tr
                        key={sg.student_id}
                        className={cn(
                          isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                          !isLast && "border-b border-border/20"
                        )}
                      >
                        <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{i + 1}</td>
                        <td className="p-3 font-semibold border-l border-border/10">{sg.full_name}</td>
                        {group.categories.map((cat) => (
                          <td key={cat.id} className="p-3 text-center border-l border-border/10">
                            {isEditing ? (
                              <Input
                                type="number"
                                min={0}
                                max={Number(cat.max_score)}
                                value={editedGrades[cat.id] ?? ""}
                                onChange={(e) => handleEditGrade(cat.id, e.target.value)}
                                className="w-20 mx-auto text-center h-8"
                                dir="ltr"
                              />
                            ) : (
                              <span className={sg.grades[cat.id] == null ? "text-muted-foreground" : ""}>
                                {sg.grades[cat.id] ?? "—"}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="p-3 text-center font-bold border-l border-border/10">
                          {isEditing ? "..." : sg.total}
                        </td>
                        <td className={cn("p-3 text-center", isLast && "last:rounded-bl-xl")}>
                          {isEditing ? (
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                                <X className="h-4 w-4" />
                              </Button>
                              <Button size="sm" onClick={saveEdit} disabled={saving}>
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(sg.student_id)}
                              disabled={!!editingStudent}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
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
