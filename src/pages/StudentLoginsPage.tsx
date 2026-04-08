import { useEffect, useState, useMemo, useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Eye, TrendingUp, Calendar, UserCheck, Users2 } from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import { ar } from "date-fns/locale";
import ExportDialog from "@/components/student-logins/ExportDialog";

interface LoginRecord {
  id: string;
  student_id: string;
  class_id: string | null;
  logged_in_at: string;
  login_type: string;
  students: { full_name: string; national_id: string | null; class_id: string | null } | null;
}

interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  section: string;
}

export default function StudentLoginsPage() {
  const [loginsTab, setLoginsTab] = usePersistedState("student_logins_tab", "classes");
  const [logins, setLogins] = useState<LoginRecord[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7");
  const [loginTypeFilter, setLoginTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: loginsData }, { data: classesData }] = await Promise.all([
      supabase
        .from("student_logins")
        .select("id, student_id, class_id, logged_in_at, login_type, students(full_name, national_id, class_id)")
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
      const matchesType = loginTypeFilter === "all" || (l.login_type || "student") === loginTypeFilter;
      return afterDate && matchesClass && matchesType;
    });
  }, [logins, cutoffDate, selectedClass, loginTypeFilter]);

  const uniqueStudents = useMemo(() => new Set(filteredLogins.map((l) => l.student_id)).size, [filteredLogins]);
  const totalLogins = filteredLogins.length;
  const parentLogins = useMemo(() => logins.filter(l => isAfter(new Date(l.logged_in_at), cutoffDate) && (l.login_type === "parent")).length, [logins, cutoffDate]);
  const studentOnlyLogins = useMemo(() => logins.filter(l => isAfter(new Date(l.logged_in_at), cutoffDate) && (l.login_type || "student") === "student").length, [logins, cutoffDate]);

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

  const getStudentsForClass = useCallback((classId: string) => {
    return studentStats.filter((s) => s.classId === classId);
  }, [studentStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
            سجل الزيارات
          </h1>
          <p className="text-sm text-muted-foreground">تتبع ومراقبة زيارات الطلاب وأولياء الأمور على البوابة الإلكترونية</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportDialog
            classStats={classStats}
            studentStats={studentStats}
            filteredLogins={filteredLogins}
            getClassName={getClassName}
            getStudentsForClass={getStudentsForClass}
          />
          <Select value={loginTypeFilter} onValueChange={setLoginTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="student">الطلاب</SelectItem>
              <SelectItem value="parent">أولياء الأمور</SelectItem>
            </SelectContent>
          </Select>
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-card to-primary/10 dark:from-primary/10 dark:via-card dark:to-primary/5">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-3 shadow-md shadow-primary/25">
              <Eye className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalLogins}</p>
              <p className="text-xs text-muted-foreground">إجمالي الزيارات</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-accent/5 via-card to-accent/10 dark:from-accent/10 dark:via-card dark:to-accent/5">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-2xl bg-gradient-to-br from-accent to-accent/70 p-3 shadow-md shadow-accent/25">
              <Users className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{uniqueStudents}</p>
              <p className="text-xs text-muted-foreground">طلاب مختلفون</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500/5 via-card to-blue-500/10 dark:from-blue-500/10 dark:via-card dark:to-blue-500/5">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-2xl p-3 shadow-md" style={{ background: "linear-gradient(135deg, hsl(210 80% 55%), hsl(210 80% 55% / 0.7))", boxShadow: "0 4px 12px hsl(210 80% 55% / 0.25)" }}>
              <UserCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{studentOnlyLogins}</p>
              <p className="text-xs text-muted-foreground">زيارات الطلاب</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500/5 via-card to-purple-500/10 dark:from-purple-500/10 dark:via-card dark:to-purple-500/5">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-2xl p-3 shadow-md" style={{ background: "linear-gradient(135deg, hsl(270 60% 55%), hsl(270 60% 55% / 0.7))", boxShadow: "0 4px 12px hsl(270 60% 55% / 0.25)" }}>
              <Users2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{parentLogins}</p>
              <p className="text-xs text-muted-foreground">زيارات أولياء الأمور</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-success/5 via-card to-success/10 dark:from-success/10 dark:via-card dark:to-success/5">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-2xl p-3 shadow-md" style={{ background: "linear-gradient(135deg, hsl(var(--success)), hsl(var(--success) / 0.7))", boxShadow: "0 4px 12px hsl(var(--success) / 0.25)" }}>
              <TrendingUp className="h-5 w-5 text-success-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {uniqueStudents > 0 ? (totalLogins / uniqueStudents).toFixed(1) : 0}
              </p>
              <p className="text-xs text-muted-foreground">متوسط/طالب</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-warning/5 via-card to-warning/10 dark:from-warning/10 dark:via-card dark:to-warning/5">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-2xl p-3 shadow-md" style={{ background: "linear-gradient(135deg, hsl(var(--warning)), hsl(var(--warning) / 0.7))", boxShadow: "0 4px 12px hsl(var(--warning) / 0.25)" }}>
              <Calendar className="h-5 w-5 text-warning-foreground" />
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
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-primary to-accent" />
            الزيارات اليومية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    color: "hsl(var(--foreground))",
                    boxShadow: "0 8px 30px hsl(var(--primary) / 0.1)",
                  }}
                />
                <Bar dataKey="عدد" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Tabs value={loginsTab} onValueChange={setLoginsTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="classes">إحصائيات الفصول</TabsTrigger>
          <TabsTrigger value="students">إحصائيات الطلاب</TabsTrigger>
        </TabsList>

        <TabsContent value="classes">
          <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-primary to-accent" />
                عدد الزيارات حسب الفصل
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
              ) : (
                <div className="space-y-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classStats} layout="vertical">
                        <defs>
                          <linearGradient id="classBarGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                          </linearGradient>
                          <linearGradient id="classBarGradient2" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis dataKey="name" type="category" width={120} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "12px",
                            color: "hsl(var(--foreground))",
                            boxShadow: "0 8px 30px hsl(var(--primary) / 0.1)",
                          }}
                          formatter={(value: number, name: string) => [
                            value,
                            name === "totalLogins" ? "الزيارات" : "الطلاب",
                          ]}
                        />
                        <Bar dataKey="totalLogins" name="الزيارات" fill="url(#classBarGradient)" radius={[0, 6, 6, 0]} />
                        <Bar dataKey="uniqueStudents" name="الطلاب" fill="url(#classBarGradient2)" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-auto rounded-xl border border-border/30 shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-l from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10">
                          <TableHead className="text-right font-semibold">الفصل</TableHead>
                          <TableHead className="text-center font-semibold">إجمالي الزيارات</TableHead>
                          <TableHead className="text-center font-semibold">عدد الطلاب</TableHead>
                          <TableHead className="text-center font-semibold">متوسط/طالب</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classStats.map((c, i) => (
                          <TableRow key={c.id} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0 font-semibold">
                                {c.totalLogins}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-accent font-semibold">{c.uniqueStudents}</span>
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
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
          <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-accent to-primary" />
                تفاصيل دخول الطلاب
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
              ) : (
                <div className="overflow-auto rounded-xl border border-border/30 shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-l from-accent/5 to-primary/5 dark:from-accent/10 dark:to-primary/10">
                        <TableHead className="text-right font-semibold w-12">#</TableHead>
                        <TableHead className="text-right font-semibold">اسم الطالب</TableHead>
                        <TableHead className="text-right font-semibold">الفصل</TableHead>
                        <TableHead className="text-center font-semibold">عدد الزيارات</TableHead>
                        <TableHead className="text-center font-semibold">آخر دخول</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentStats.map((s, i) => (
                        <TableRow key={s.id} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                          <TableCell className="text-muted-foreground font-mono text-xs">{i + 1}</TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground">{getClassName(s.classId)}</TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-accent/15 text-accent hover:bg-accent/20 border-0 font-semibold">
                              {s.count}
                            </Badge>
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
