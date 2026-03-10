import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Pencil, X, Search, Columns, Rows } from "lucide-react";
import GradesExportDialog, { ExportTableGroup } from "./GradesExportDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ClassInfo { id: string; name: string; }
interface CategoryInfo { id: string; name: string; weight: number; max_score: number; class_id: string; category_group: string; }

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
  selectedPeriod?: number;
  categoryGroupFilter?: string;
}

type EditMode = "row" | "column" | null;

export default function GradesSummary({ selectedClass, onClassChange, selectedPeriod = 1, categoryGroupFilter }: GradesSummaryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryInfo[]>([]);
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchName, setSearchName] = useState("");

  // Edit state
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editingColumnCatId, setEditingColumnCatId] = useState<string | null>(null);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  // For row edit: { [catId]: score }
  const [rowEdits, setRowEdits] = useState<Record<string, number | null>>({});
  // For column edit: { [studentId]: score }
  const [colEdits, setColEdits] = useState<Record<string, number | null>>({});

  useEffect(() => { loadAllData(); }, [selectedPeriod]);

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
    const studentIds = students.map((s) => s.id);

    let allGrades: any[] = [];
    if (studentIds.length > 0) {
      const { data: gradesData } = await supabase
        .from("grades").select("id, student_id, category_id, score, period")
        .in("student_id", studentIds).eq("period", selectedPeriod);
      allGrades = gradesData || [];
    }

    const gradesMap = new Map<string, Map<string, { score: number | null; id: string }>>();
    allGrades.forEach((g) => {
      if (!gradesMap.has(g.student_id)) gradesMap.set(g.student_id, new Map());
      gradesMap.get(g.student_id)!.set(g.category_id, { score: g.score != null ? Number(g.score) : null, id: g.id });
    });

    const classMap = new Map(cls.map((c) => [c.id, c.name]));

    const rows: SummaryRow[] = students.filter((s) => s.class_id).map((s) => {
      const classCats = cats.filter((c) => c.class_id === s.class_id);
      const studentGradesMap = gradesMap.get(s.id) || new Map();
      const grades: Record<string, number | null> = {};
      const gradeIds: Record<string, string> = {};

      classCats.forEach((c) => {
        const g = studentGradesMap.get(c.id);
        grades[c.id] = g?.score ?? null;
        if (g?.id) gradeIds[c.id] = g.id;
      });

      let total = 0, maxTotal = 0;
      classCats.forEach((cat) => {
        maxTotal += Number(cat.max_score);
        if (grades[cat.id] !== null && grades[cat.id] !== undefined) total += grades[cat.id]!;
      });

      return {
        student_id: s.id, full_name: s.full_name,
        class_name: classMap.get(s.class_id!) || "", class_id: s.class_id!,
        grades, grade_ids: gradeIds, total: maxTotal > 0 ? `${total} / ${maxTotal}` : "—",
      };
    });

    setClasses(cls);
    setAllCategories(cats);
    setSummaryRows(rows);
    setLoading(false);
  };

  // === ROW EDIT ===
  const startRowEdit = (studentId: string) => {
    const row = summaryRows.find((r) => r.student_id === studentId);
    if (row) {
      setEditMode("row");
      setEditingStudent(studentId);
      setRowEdits({ ...row.grades });
    }
  };

  const handleRowGrade = (categoryId: string, value: string, maxScore: number) => {
    const numValue = value === "" ? null : Math.min(maxScore, Math.max(0, Number(value)));
    setRowEdits((prev) => ({ ...prev, [categoryId]: numValue }));
  };

  const saveRowEdit = async () => {
    if (!user || !editingStudent) return;
    setSaving(true);
    const row = summaryRows.find((r) => r.student_id === editingStudent);
    if (!row) return;
    const classCats = allCategories.filter((c) => c.class_id === row.class_id);

    for (const cat of classCats) {
      const score = rowEdits[cat.id];
      const existingId = row.grade_ids[cat.id];
      if (score !== null && score !== undefined) {
        if (existingId) {
          await supabase.from("grades").update({ score }).eq("id", existingId);
        } else {
          await supabase.from("grades").insert({
            student_id: editingStudent, category_id: cat.id, score, recorded_by: user.id, period: selectedPeriod,
          });
        }
      }
    }
    toast({ title: "تم الحفظ", description: "تم تعديل درجات الطالب بنجاح" });
    cancelEdit();
    loadAllData();
  };

  // === COLUMN EDIT ===
  const startColumnEdit = (catId: string, classId: string) => {
    const classStudents = summaryRows.filter(r => r.class_id === classId);
    const initial: Record<string, number | null> = {};
    classStudents.forEach(s => { initial[s.student_id] = s.grades[catId] ?? null; });
    setEditMode("column");
    setEditingColumnCatId(catId);
    setEditingClassId(classId);
    setColEdits(initial);
  };

  const handleColGrade = (studentId: string, value: string, maxScore: number) => {
    const numValue = value === "" ? null : Math.min(maxScore, Math.max(0, Number(value)));
    setColEdits((prev) => ({ ...prev, [studentId]: numValue }));
  };

  const setAllColumnGrades = (value: string, maxScore: number) => {
    const numValue = value === "" ? null : Math.min(maxScore, Math.max(0, Number(value)));
    setColEdits(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => { updated[k] = numValue; });
      return updated;
    });
  };

  const saveColumnEdit = async () => {
    if (!user || !editingColumnCatId) return;
    setSaving(true);
    const classStudents = summaryRows.filter(r => r.class_id === editingClassId);

    for (const s of classStudents) {
      const score = colEdits[s.student_id];
      const existingId = s.grade_ids[editingColumnCatId];
      if (score !== null && score !== undefined) {
        if (existingId) {
          await supabase.from("grades").update({ score }).eq("id", existingId);
        } else {
          await supabase.from("grades").insert({
            student_id: s.student_id, category_id: editingColumnCatId, score, recorded_by: user.id, period: selectedPeriod,
          });
        }
      }
    }
    toast({ title: "تم الحفظ", description: "تم تعديل درجات العمود بنجاح" });
    cancelEdit();
    loadAllData();
  };

  const cancelEdit = () => {
    setEditMode(null);
    setEditingStudent(null);
    setEditingColumnCatId(null);
    setEditingClassId(null);
    setRowEdits({});
    setColEdits({});
    setSaving(false);
  };

  const isEditing = editMode !== null;

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

  const calcSubtotal = (grades: Record<string, number | null>, cats: CategoryInfo[]) => {
    let score = 0, max = 0;
    cats.forEach(cat => {
      max += Number(cat.max_score);
      if (grades[cat.id] != null) score += grades[cat.id]!;
    });
    return { score, max };
  };

  // Get effective grade for a cell considering edit modes
  const getEffectiveGrade = (studentId: string, catId: string, originalGrade: number | null): number | null => {
    if (editMode === "row" && editingStudent === studentId) {
      return rowEdits[catId] ?? null;
    }
    if (editMode === "column" && editingColumnCatId === catId) {
      return colEdits[studentId] ?? null;
    }
    return originalGrade;
  };

  const getEffectiveGrades = (sg: SummaryRow): Record<string, number | null> => {
    const grades = { ...sg.grades };
    if (editMode === "row" && editingStudent === sg.student_id) {
      return { ...rowEdits };
    }
    if (editMode === "column" && editingColumnCatId) {
      grades[editingColumnCatId] = colEdits[sg.student_id] ?? sg.grades[editingColumnCatId];
    }
    return grades;
  };

  const isCellEditable = (studentId: string, catId: string): boolean => {
    if (editMode === "row" && editingStudent === studentId) return true;
    if (editMode === "column" && editingColumnCatId === catId) return true;
    return false;
  };

  if (loading) return <p className="text-center py-12 text-muted-foreground">جارٍ تحميل الخلاصة...</p>;

  return (
    <div className="space-y-4">
      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث باسم الطالب..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="pr-9" />
        </div>
      </div>

      {/* Export button */}
      {groupedByClass.length > 0 && (
        <div className="flex justify-end">
          <GradesExportDialog
            title="التقييم النهائي"
            fileName="التقييم_النهائي"
            groups={groupedByClass.map((group) => {
              const classworkCats = group.categories.filter(c => c.category_group === 'classwork');
              const examCats = group.categories.filter(c => c.category_group === 'exams');
              const otherCats = group.categories.filter(c => c.category_group !== 'classwork' && c.category_group !== 'exams');
              const headers = [
                "#", "الطالب",
                ...classworkCats.map(c => c.name), ...(classworkCats.length > 0 ? ["مجموع المهام"] : []),
                ...examCats.map(c => c.name), ...(examCats.length > 0 ? ["مجموع الاختبارات"] : []),
                ...otherCats.map(c => c.name),
                "المجموع",
              ];
              const rows = group.students.map((sg, i) => {
                const cwSub = calcSubtotal(sg.grades, classworkCats);
                const exSub = calcSubtotal(sg.grades, examCats);
                return [
                  String(i + 1), sg.full_name,
                  ...classworkCats.map(c => sg.grades[c.id] != null ? String(sg.grades[c.id]) : "—"),
                  ...(classworkCats.length > 0 ? [`${cwSub.score} / ${cwSub.max}`] : []),
                  ...examCats.map(c => sg.grades[c.id] != null ? String(sg.grades[c.id]) : "—"),
                  ...(examCats.length > 0 ? [`${exSub.score} / ${exSub.max}`] : []),
                  ...otherCats.map(c => sg.grades[c.id] != null ? String(sg.grades[c.id]) : "—"),
                  sg.total,
                ];
              });
              return { className: group.name, headers, rows } as ExportTableGroup;
            })}
          />
        </div>
      )}

      {groupedByClass.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">لا توجد بيانات درجات بعد</p>
      ) : groupedByClass.map((group) => {
    const classworkCats = group.categories.filter(c => c.category_group === 'classwork');
        const examCats = group.categories.filter(c => c.category_group === 'exams');
        const otherCats = group.categories.filter(c => c.category_group !== 'classwork' && c.category_group !== 'exams');

        const hasClasswork = !categoryGroupFilter ? classworkCats.length > 0 : categoryGroupFilter === 'classwork' && classworkCats.length > 0;
        const hasExams = !categoryGroupFilter ? examCats.length > 0 : categoryGroupFilter === 'exams' && examCats.length > 0;
        const hasOther = !categoryGroupFilter ? otherCats.length > 0 : false;

        const allCatsForGroup = [...classworkCats, ...examCats, ...otherCats];

        return (
          <Card key={group.id} className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <Badge variant="secondary">{group.students.length} طالب</Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedPeriod === 1 ? "فترة أولى" : "فترة ثانية"}
                  </Badge>
                </div>

                {/* Edit Menu Button */}
                {!isEditing && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Pencil className="h-4 w-4" />
                        تعديل
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="end">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1">تعديل عمود (فئة كاملة)</p>
                        {allCatsForGroup.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => startColumnEdit(cat.id, group.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors text-right"
                          >
                            <Columns className="h-4 w-4 text-primary shrink-0" />
                            <span>{cat.name}</span>
                            <Badge variant="outline" className="text-[10px] mr-auto">{Number(cat.max_score)}</Badge>
                          </button>
                        ))}
                        <div className="border-t my-1.5" />
                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1">تعديل صف (طالب)</p>
                        <p className="text-[11px] text-muted-foreground px-2 pb-1">اضغط على أيقونة القلم بجانب اسم الطالب</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Save / Cancel for column edit */}
                {editMode === "column" && editingClassId === group.id && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary border-primary/30">
                      تعديل: {allCategories.find(c => c.id === editingColumnCatId)?.name}
                    </Badge>
                    <Input
                      type="number"
                      placeholder="تعبئة الكل"
                      className="w-24 h-8 text-center"
                      dir="ltr"
                      min={0}
                      max={Number(allCategories.find(c => c.id === editingColumnCatId)?.max_score || 100)}
                      onChange={(e) => setAllColumnGrades(e.target.value, Number(allCategories.find(c => c.id === editingColumnCatId)?.max_score || 100))}
                    />
                    <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}><X className="h-4 w-4" /></Button>
                    <Button size="sm" onClick={saveColumnEdit} disabled={saving}><Save className="h-4 w-4 ml-1" /> حفظ</Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    {/* Group headers row */}
                    <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                      <th rowSpan={2} className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">#</th>
                      <th rowSpan={2} className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[160px]">الطالب</th>
                      {hasClasswork && (
                        <th colSpan={classworkCats.length + 1} className="text-center p-2 font-bold text-xs border-b border-primary/20 bg-primary/5 text-primary">
                          المهام الادائية والمشاركة والتفاعل
                        </th>
                      )}
                      {hasExams && (
                        <th colSpan={examCats.length + 1} className="text-center p-2 font-bold text-xs border-b border-primary/20 bg-accent/5 text-primary">
                          الاختبارات
                        </th>
                      )}
                      {hasOther && otherCats.map(cat => (
                        <th key={cat.id} rowSpan={2} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[80px]">
                          <div>{cat.name}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">من {Number(cat.max_score)}</div>
                        </th>
                      ))}
                      <th rowSpan={2} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[80px]">المجموع</th>
                      <th rowSpan={2} className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 w-[60px] last:rounded-tl-xl">تعديل</th>
                    </tr>
                    {/* Sub-headers row */}
                    <tr className="bg-muted/30">
                      {hasClasswork && (
                        <>
                          {classworkCats.map(cat => (
                            <th key={cat.id} className={cn(
                              "text-center p-2 font-medium text-xs border-b-2 border-primary/20 min-w-[70px]",
                              editMode === "column" && editingColumnCatId === cat.id ? "bg-primary/15 text-primary" : "text-muted-foreground"
                            )}>
                              <div>{cat.name}</div>
                              <div className="text-[10px] font-normal">من {Number(cat.max_score)}</div>
                            </th>
                          ))}
                          <th className="text-center p-2 font-bold text-xs border-b-2 border-primary/20 text-primary min-w-[60px] bg-primary/5">المجموع</th>
                        </>
                      )}
                      {hasExams && (
                        <>
                          {examCats.map(cat => (
                            <th key={cat.id} className={cn(
                              "text-center p-2 font-medium text-xs border-b-2 border-primary/20 min-w-[70px]",
                              editMode === "column" && editingColumnCatId === cat.id ? "bg-primary/15 text-primary" : "text-muted-foreground"
                            )}>
                              <div>{cat.name}</div>
                              <div className="text-[10px] font-normal">من {Number(cat.max_score)}</div>
                            </th>
                          ))}
                          <th className="text-center p-2 font-bold text-xs border-b-2 border-primary/20 text-primary min-w-[60px] bg-accent/5">المجموع</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {group.students.map((sg, i) => {
                      const isRowEditing = editMode === "row" && editingStudent === sg.student_id;
                      const isEven = i % 2 === 0;
                      const isLast = i === group.students.length - 1;
                      const currentGrades = getEffectiveGrades(sg);

                      const classworkSub = calcSubtotal(currentGrades, classworkCats);
                      const examSub = calcSubtotal(currentGrades, examCats);
                      const allSub = calcSubtotal(currentGrades, group.categories);

                      const renderCell = (cat: CategoryInfo) => {
                        const editable = isCellEditable(sg.student_id, cat.id);
                        if (editable) {
                          const val = editMode === "row" ? rowEdits[cat.id] : colEdits[sg.student_id];
                          return (
                            <Input
                              type="number" min={0} max={Number(cat.max_score)}
                              value={val ?? ""}
                              onChange={(e) => {
                                if (editMode === "row") handleRowGrade(cat.id, e.target.value, Number(cat.max_score));
                                else handleColGrade(sg.student_id, e.target.value, Number(cat.max_score));
                              }}
                              className="w-16 mx-auto text-center h-8" dir="ltr"
                            />
                          );
                        }
                        return (
                          <span className={sg.grades[cat.id] == null ? "text-muted-foreground" : ""}>
                            {currentGrades[cat.id] ?? "—"}
                          </span>
                        );
                      };

                      return (
                        <tr key={sg.student_id} className={cn(
                          isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                          !isLast && "border-b border-border/20",
                          isRowEditing && "bg-primary/5 ring-1 ring-inset ring-primary/20"
                        )}>
                          <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{i + 1}</td>
                          <td className="p-3 font-semibold border-l border-border/10">{sg.full_name}</td>

                          {/* Classwork categories */}
                          {hasClasswork && (
                            <>
                              {classworkCats.map(cat => (
                                <td key={cat.id} className={cn(
                                  "p-2 text-center border-l border-border/10",
                                  editMode === "column" && editingColumnCatId === cat.id && "bg-primary/5"
                                )}>
                                  {renderCell(cat)}
                                </td>
                              ))}
                              <td className="p-2 text-center font-bold border-l border-border/10 bg-primary/5 text-primary">
                                {classworkSub.score} / {classworkSub.max}
                              </td>
                            </>
                          )}

                          {/* Exam categories */}
                          {hasExams && (
                            <>
                              {examCats.map(cat => (
                                <td key={cat.id} className={cn(
                                  "p-2 text-center border-l border-border/10",
                                  editMode === "column" && editingColumnCatId === cat.id && "bg-primary/5"
                                )}>
                                  {renderCell(cat)}
                                </td>
                              ))}
                              <td className="p-2 text-center font-bold border-l border-border/10 bg-accent/5 text-primary">
                                {examSub.score} / {examSub.max}
                              </td>
                            </>
                          )}

                          {/* Other categories */}
                          {hasOther && otherCats.map(cat => (
                            <td key={cat.id} className={cn(
                              "p-2 text-center border-l border-border/10",
                              editMode === "column" && editingColumnCatId === cat.id && "bg-primary/5"
                            )}>
                              {renderCell(cat)}
                            </td>
                          ))}

                          {/* Grand total */}
                          <td className="p-2 text-center font-bold border-l border-border/10">
                            {allSub.score} / {allSub.max}
                          </td>

                          {/* Edit button per row */}
                          <td className={cn("p-3 text-center", isLast && "last:rounded-bl-xl")}>
                            {isRowEditing ? (
                              <div className="flex gap-1 justify-center">
                                <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}><X className="h-4 w-4" /></Button>
                                <Button size="sm" onClick={saveRowEdit} disabled={saving}><Save className="h-4 w-4" /></Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => startRowEdit(sg.student_id)} disabled={isEditing}>
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
        );
      })}
    </div>
  );
}
