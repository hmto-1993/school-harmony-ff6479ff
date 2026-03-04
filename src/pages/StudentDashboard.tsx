import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المعيار</TableHead>
                        <TableHead className="text-center">الدرجة</TableHead>
                        <TableHead className="text-center">من</TableHead>
                        <TableHead className="text-center">الوزن</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {student.grades.map((g, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-right font-medium">{g.grade_categories?.name || "-"}</TableCell>
                          <TableCell className="text-center">{g.score ?? "-"}</TableCell>
                          <TableCell className="text-center">{g.grade_categories?.max_score || "-"}</TableCell>
                          <TableCell className="text-center">{g.grade_categories?.weight || "-"}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-center">الحالة</TableHead>
                        <TableHead className="text-right">ملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {student.attendance.map((a, i) => {
                        const s = statusLabels[a.status] || { label: a.status, variant: "outline" as const };
                        return (
                          <TableRow key={i}>
                            <TableCell className="text-right">{a.date}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={s.variant}>{s.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{a.notes || "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-center">النوع</TableHead>
                        <TableHead className="text-right">الملاحظة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {student.behaviors.map((b, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-right">{b.date}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={b.type === "إيجابي" ? "default" : "destructive"}>
                              {b.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{b.note || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
