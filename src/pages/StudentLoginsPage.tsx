import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Eye, TrendingUp, Calendar, FileSpreadsheet, FileText } from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import { ar } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface LoginRecord {
  id: string;
  student_id: string;
  class_id: string | null;
  logged_in_at: string;
  students: { full_name: string; national_id: string | null; class_id: string | null } | null;
}

interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  section: string;
}

export default function StudentLoginsPage() {
  const [logins, setLogins] = useState<LoginRecord[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: loginsData }, { data: classesData }] = await Promise.all([
      supabase
        .from("student_logins")
        .select("id, student_id, class_id, logged_in_at, students(full_name, national_id, class_id)")
        .order("logged_in_at", { ascending: false }),
      supabase.from("classes").select("id, name, grade, section"),
    ]);
    setLogins((loginsData as any) || []);
    setClasses(classesData || []);
    setLoading(false);
  };

  const cutoffDate = useMemo(() => subDays(new Date(), parseInt(dateRange)), [dateRange]);

  const filteredLogins = useMemo(() => {
    return logins.filter((l) => {
      const afterDate = isAfter(new Date(l.logged_in_at), cutoffDate);
      const matchesClass = selectedClass === "all" || l.class_id === selectedClass;
      return afterDate && matchesClass;
    });
  }, [logins, cutoffDate, selectedClass]);

  const uniqueStudents = useMemo(() => new Set(filteredLogins.map((l) => l.student_id)).size, [filteredLogins]);
  const totalLogins = filteredLogins.length;

  const studentStats = useMemo(() => {
    const map: Record<string, { name: string; classId: string | null; count: number; lastLogin: string }> = {};
    filteredLogins.forEach((l) => {
      if (!map[l.student_id]) {
        map[l.student_id] = {
          name: l.students?.full_name || "غير معروف",
          classId: l.class_id,
          count: 0,
          lastLogin: l.logged_in_at,
        };
      }
      map[l.student_id].count++;
      if (l.logged_in_at > map[l.student_id].lastLogin) {
        map[l.student_id].lastLogin = l.logged_in_at;
      }
    });
    return Object.entries(map)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLogins]);

  const classStats = useMemo(() => {
    const map: Record<string, { name: string; totalLogins: number; uniqueStudents: Set<string> }> = {};
    classes.forEach((c) => {
      map[c.id] = { name: c.name, totalLogins: 0, uniqueStudents: new Set() };
    });
    filteredLogins.forEach((l) => {
      if (l.class_id && map[l.class_id]) {
        map[l.class_id].totalLogins++;
        map[l.class_id].uniqueStudents.add(l.student_id);
      }
    });
    return Object.entries(map)
      .map(([id, data]) => ({
        id,
        name: data.name,
        totalLogins: data.totalLogins,
        uniqueStudents: data.uniqueStudents.size,
      }))
      .filter((c) => c.totalLogins > 0)
      .sort((a, b) => b.totalLogins - a.totalLogins);
  }, [filteredLogins, classes]);

  const dailyData = useMemo(() => {
    const days = parseInt(dateRange);
    const map: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      map[d] = 0;
    }
    filteredLogins.forEach((l) => {
      const d = format(new Date(l.logged_in_at), "yyyy-MM-dd");
      if (map[d] !== undefined) map[d]++;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: format(new Date(date), "MM/dd"),
        عدد: count,
      }));
  }, [filteredLogins, dateRange]);

  const getClassName = (classId: string | null) => {
    if (!classId) return "-";
    return classes.find((c) => c.id === classId)?.name || "-";
  };

  // --- Export helpers ---
  const getStudentsForClass = useCallback((classId: string) => {
    return studentStats.filter((s) => s.classId === classId);
  }, [studentStats]);

  const exportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Class summary
    const classSummary = classStats.map((c) => ({
      "الفصل": c.name,
      "إجمالي الزيارات": c.totalLogins,
      "عدد الطلاب": c.uniqueStudents,
      "متوسط/طالب": c.uniqueStudents > 0 ? +(c.totalLogins / c.uniqueStudents).toFixed(1) : 0,
    }));
    const ws1 = XLSX.utils.json_to_sheet(classSummary);
    XLSX.utils.book_append_sheet(wb, ws1, "ملخص الفصول");

    // Sheet 2: All students
    const allStudents = studentStats.map((s, i) => ({
      "#": i + 1,
      "اسم الطالب": s.name,
      "الفصل": getClassName(s.classId),
      "عدد الزيارات": s.count,
      "آخر دخول": format(new Date(s.lastLogin), "yyyy/MM/dd HH:mm"),
    }));
    const ws2 = XLSX.utils.json_to_sheet(allStudents);
    XLSX.utils.book_append_sheet(wb, ws2, "جميع الطلاب");

    // Per-class sheets
    classStats.forEach((c) => {
      const students = getStudentsForClass(c.id);
      if (students.length === 0) return;
      const data = students.map((s, i) => ({
        "#": i + 1,
        "اسم الطالب": s.name,
        "عدد الزيارات": s.count,
        "آخر دخول": format(new Date(s.lastLogin), "yyyy/MM/dd HH:mm"),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const sheetName = c.name.substring(0, 31); // Excel max 31 chars
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `سجل_دخول_الطلاب_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("تم تصدير ملف Excel بنجاح");
  }, [classStats, studentStats, getStudentsForClass, getClassName]);

  const exportPDF = useCallback(async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Load Arabic font - use built-in with RTL workaround
    doc.setFont("helvetica");

    const pageWidth = doc.internal.pageSize.getWidth();
    const title = "سجل دخول الطلاب";
    const dateStr = format(new Date(), "yyyy/MM/dd");

    // Title
    doc.setFontSize(16);
    doc.text(title, pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(dateStr, pageWidth / 2, 22, { align: "center" });

    // Class Summary Table
    doc.setFontSize(12);
    doc.text("ملخص الفصول", pageWidth - 14, 32, { align: "right" });

    autoTable(doc, {
      startY: 36,
      head: [["متوسط/طالب", "عدد الطلاب", "إجمالي الزيارات", "الفصل"]],
      body: classStats.map((c) => [
        c.uniqueStudents > 0 ? (c.totalLogins / c.uniqueStudents).toFixed(1) : "0",
        c.uniqueStudents.toString(),
        c.totalLogins.toString(),
        c.name,
      ]),
      styles: { font: "helvetica", halign: "center", fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246], halign: "center" },
      columnStyles: { 3: { halign: "right" } },
    });

    // Student details per class
    classStats.forEach((c) => {
      const students = getStudentsForClass(c.id);
      if (students.length === 0) return;

      doc.addPage();
      doc.setFontSize(14);
      doc.text(c.name, pageWidth / 2, 15, { align: "center" });

      autoTable(doc, {
        startY: 22,
        head: [["آخر دخول", "عدد الزيارات", "الفصل", "اسم الطالب", "#"]],
        body: students.map((s, i) => [
          format(new Date(s.lastLogin), "yyyy/MM/dd HH:mm"),
          s.count.toString(),
          getClassName(s.classId),
          s.name,
          (i + 1).toString(),
        ]),
        styles: { font: "helvetica", halign: "center", fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246], halign: "center" },
        columnStyles: { 3: { halign: "right" } },
      });
    });

    doc.save(`سجل_دخول_الطلاب_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("تم تصدير ملف PDF بنجاح");
  }, [classStats, studentStats, getStudentsForClass, getClassName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">سجل دخول الطلاب</h1>
          <p className="text-sm text-muted-foreground">تتبع ومراقبة دخول الطلاب على البوابة الإلكترونية</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="14">آخر 14 يوم</SelectItem>
              <SelectItem value="30">آخر 30 يوم</SelectItem>
              <SelectItem value="90">آخر 90 يوم</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[160px]">
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-primary/10 p-3">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalLogins}</p>
              <p className="text-xs text-muted-foreground">إجمالي الزيارات</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-chart-2/10 p-3">
              <Users className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{uniqueStudents}</p>
              <p className="text-xs text-muted-foreground">طلاب مختلفون</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-chart-3/10 p-3">
              <TrendingUp className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {uniqueStudents > 0 ? (totalLogins / uniqueStudents).toFixed(1) : 0}
              </p>
              <p className="text-xs text-muted-foreground">متوسط الزيارات/طالب</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-chart-4/10 p-3">
              <Calendar className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {classStats.length}
              </p>
              <p className="text-xs text-muted-foreground">فصول نشطة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الزيارات اليومية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="عدد" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="classes" dir="rtl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="classes">إحصائيات الفصول</TabsTrigger>
          <TabsTrigger value="students">إحصائيات الطلاب</TabsTrigger>
        </TabsList>

        <TabsContent value="classes">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">عدد الزيارات حسب الفصل</CardTitle>
            </CardHeader>
            <CardContent>
              {classStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
              ) : (
                <div className="space-y-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            color: "hsl(var(--foreground))",
                          }}
                          formatter={(value: number, name: string) => [
                            value,
                            name === "totalLogins" ? "الزيارات" : "الطلاب",
                          ]}
                        />
                        <Bar dataKey="totalLogins" name="الزيارات" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="uniqueStudents" name="الطلاب" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-auto rounded-xl border border-border/40">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-right">الفصل</TableHead>
                          <TableHead className="text-center">إجمالي الزيارات</TableHead>
                          <TableHead className="text-center">عدد الطلاب</TableHead>
                          <TableHead className="text-center">متوسط/طالب</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classStats.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{c.totalLogins}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{c.uniqueStudents}</TableCell>
                            <TableCell className="text-center">
                              {c.uniqueStudents > 0 ? (c.totalLogins / c.uniqueStudents).toFixed(1) : 0}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تفاصيل دخول الطلاب</CardTitle>
            </CardHeader>
            <CardContent>
              {studentStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
              ) : (
                <div className="overflow-auto rounded-xl border border-border/40">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right">#</TableHead>
                        <TableHead className="text-right">اسم الطالب</TableHead>
                        <TableHead className="text-right">الفصل</TableHead>
                        <TableHead className="text-center">عدد الزيارات</TableHead>
                        <TableHead className="text-center">آخر دخول</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentStats.map((s, i) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{getClassName(s.classId)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{s.count}</Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {format(new Date(s.lastLogin), "yyyy/MM/dd HH:mm", { locale: ar })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
