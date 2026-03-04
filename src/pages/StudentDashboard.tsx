import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LogOut, GraduationCap, ClipboardCheck, ShieldCheck, CheckCircle, Clock, BookOpen } from "lucide-react";
import schoolLogo from "@/assets/school-logo.jpg";

const statusLabels: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  present: { label: "حاضر", variant: "default" },
  absent: { label: "غائب", variant: "destructive" },
  late: { label: "متأخر", variant: "secondary" },
  early_leave: { label: "خروج مبكر", variant: "outline" },
  sick_leave: { label: "إجازة مرضية", variant: "outline" },
};

export default function StudentDashboard() {
  const { student, signOut } = useAuth();
  const navigate = useNavigate();

  if (!student) {
    navigate("/login");
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Calculate grade summary
  const totalWeighted = student.grades.reduce((sum, g) => {
    const cat = g.grade_categories;
    if (!cat || g.score === null) return sum;
    return sum + (g.score / cat.max_score) * cat.weight;
  }, 0);
  const totalWeight = student.grades.reduce((sum, g) => {
    const cat = g.grade_categories;
    if (!cat || g.score === null) return sum;
    return sum + cat.weight;
  }, 0);
  const percentage = totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 100) : 0;

  const presentCount = student.attendance.filter((a) => a.status === "present").length;
  const absentCount = student.attendance.filter((a) => a.status === "absent").length;
  const positiveCount = student.behaviors.filter((b) => b.type === "إيجابي").length;
  const negativeCount = student.behaviors.filter((b) => b.type === "سلبي").length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={schoolLogo} alt="الشعار" className="h-10 w-10 rounded-lg object-contain" />
            <div>
              <h1 className="text-lg font-bold text-foreground">{student.full_name}</h1>
              {student.class && (
                <p className="text-xs text-muted-foreground">
                  {student.class.name} - {student.class.grade} ({student.class.section})
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            خروج
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex flex-col items-center p-4">
              <GraduationCap className="h-8 w-8 text-primary mb-2" />
              <p className="text-2xl font-bold text-foreground">{percentage}%</p>
              <p className="text-xs text-muted-foreground">المعدل العام</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-4">
              <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{presentCount}</p>
              <p className="text-xs text-muted-foreground">أيام الحضور</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-4">
              <Clock className="h-8 w-8 text-red-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{absentCount}</p>
              <p className="text-xs text-muted-foreground">أيام الغياب</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-4">
              <BookOpen className="h-8 w-8 text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{positiveCount}/{positiveCount + negativeCount}</p>
              <p className="text-xs text-muted-foreground">تقييم إيجابي</p>
            </CardContent>
          </Card>
        </div>

        {/* Details Tabs */}
        <Tabs defaultValue="grades" dir="rtl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="grades" className="gap-1">
              <GraduationCap className="h-4 w-4" />
              الدرجات
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-1">
              <ClipboardCheck className="h-4 w-4" />
              الحضور
            </TabsTrigger>
            <TabsTrigger value="behavior" className="gap-1">
              <ShieldCheck className="h-4 w-4" />
              السلوك
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grades">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">تفاصيل الدرجات</CardTitle>
              </CardHeader>
              <CardContent>
                {student.grades.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد درجات مسجلة</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-border/40 shadow-sm">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-gradient-to-l from-primary/8 to-primary/4 dark:from-primary/15 dark:to-primary/8">
                          <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">المعيار</th>
                          <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الدرجة</th>
                          <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">من</th>
                          <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl">الوزن</th>
                        </tr>
                      </thead>
                      <tbody>
                        {student.grades.map((g, i) => {
                          const isEven = i % 2 === 0;
                          const isLast = i === student.grades.length - 1;
                          return (
                            <tr
                              key={i}
                               className={cn(
                                isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                                !isLast && "border-b border-border/20"
                              )}
                            >
                              <td className={cn("p-3 text-right font-semibold border-l border-border/10", isLast && "first:rounded-br-xl")}>{g.grade_categories?.name || "-"}</td>
                              <td className="p-3 text-center border-l border-border/10">{g.score ?? "-"}</td>
                              <td className="p-3 text-center border-l border-border/10">{g.grade_categories?.max_score || "-"}</td>
                              <td className={cn("p-3 text-center", isLast && "last:rounded-bl-xl")}>{g.grade_categories?.weight || "-"}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">سجل الحضور</CardTitle>
              </CardHeader>
              <CardContent>
                {student.attendance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد سجلات حضور</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-border/40 shadow-sm">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-gradient-to-l from-primary/8 to-primary/4 dark:from-primary/15 dark:to-primary/8">
                          <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">التاريخ</th>
                          <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الحالة</th>
                          <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {student.attendance.map((a, i) => {
                          const s = statusLabels[a.status] || { label: a.status, variant: "outline" as const };
                          const isEven = i % 2 === 0;
                          const isLast = i === student.attendance.length - 1;
                          return (
                            <tr
                              key={i}
                               className={cn(
                                isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                                !isLast && "border-b border-border/20"
                              )}
                            >
                              <td className={cn("p-3 text-right border-l border-border/10", isLast && "first:rounded-br-xl")}>{a.date}</td>
                              <td className="p-3 text-center border-l border-border/10">
                                <Badge variant={s.variant}>{s.label}</Badge>
                              </td>
                              <td className={cn("p-3 text-right text-muted-foreground", isLast && "last:rounded-bl-xl")}>{a.notes || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="behavior">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">التقييمات السلوكية</CardTitle>
              </CardHeader>
              <CardContent>
                {student.behaviors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد تقييمات</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-border/40 shadow-sm">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-gradient-to-l from-primary/8 to-primary/4 dark:from-primary/15 dark:to-primary/8">
                          <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">التاريخ</th>
                          <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">النوع</th>
                          <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl">الملاحظة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {student.behaviors.map((b, i) => {
                          const isEven = i % 2 === 0;
                          const isLast = i === student.behaviors.length - 1;
                          return (
                            <tr
                              key={i}
                               className={cn(
                                isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                                !isLast && "border-b border-border/20"
                              )}
                            >
                              <td className={cn("p-3 text-right border-l border-border/10", isLast && "first:rounded-br-xl")}>{b.date}</td>
                              <td className="p-3 text-center border-l border-border/10">
                                <Badge variant={b.type === "إيجابي" ? "default" : "destructive"}>
                                  {b.type}
                                </Badge>
                              </td>
                              <td className={cn("p-3 text-right text-muted-foreground", isLast && "last:rounded-bl-xl")}>{b.note || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
