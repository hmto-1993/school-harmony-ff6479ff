import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, BookOpen, ClipboardCheck, AlertTriangle,
  TrendingUp, Clock, UserCheck, UserX,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { format } from "date-fns";
import PeriodComparison from "@/components/dashboard/PeriodComparison";
// ClassGradesComparison removed - merged into PerformanceDashboard
import PerformanceDashboard from "@/components/dashboard/PerformanceDashboard";

interface ClassStats {
  name: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

export default function DashboardPage() {
  const { role } = useAuth();
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [todayPresent, setTodayPresent] = useState(0);
  const [todayAbsent, setTodayAbsent] = useState(0);
  const [todayLate, setTodayLate] = useState(0);
  const [todayNotRecorded, setTodayNotRecorded] = useState(0);
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [attendanceRate, setAttendanceRate] = useState(0);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const today = format(new Date(), "yyyy-MM-dd");

    const [
      { data: studentsData },
      { data: classesData },
      { data: attendanceData },
    ] = await Promise.all([
      supabase.from("students").select("id, class_id"),
      supabase.from("classes").select("id, name"),
      supabase.from("attendance_records").select("student_id, status, class_id").eq("date", today),
    ]);

    const students = studentsData || [];
    const classes = classesData || [];
    const attendance = attendanceData || [];

    setTotalStudents(students.length);
    setTotalClasses(classes.length);

    const present = attendance.filter((r) => r.status === "present").length;
    const absent = attendance.filter((r) => r.status === "absent").length;
    const late = attendance.filter((r) => r.status === "late").length;
    const recorded = attendance.length;
    const notRecorded = students.length - recorded;

    setTodayPresent(present);
    setTodayAbsent(absent);
    setTodayLate(late);
    setTodayNotRecorded(notRecorded > 0 ? notRecorded : 0);
    setAttendanceRate(students.length > 0 ? Math.round((present / students.length) * 100) : 0);

    // Per-class attendance stats
    const classMap: Record<string, ClassStats> = {};
    classes.forEach((c) => {
      classMap[c.id] = { name: c.name, present: 0, absent: 0, late: 0, total: 0 };
    });
    students.forEach((s) => {
      if (s.class_id && classMap[s.class_id]) classMap[s.class_id].total++;
    });
    attendance.forEach((a) => {
      if (a.class_id && classMap[a.class_id]) {
        if (a.status === "present") classMap[a.class_id].present++;
        else if (a.status === "absent") classMap[a.class_id].absent++;
        else if (a.status === "late") classMap[a.class_id].late++;
      }
    });
    setClassStats(Object.values(classMap).filter((c) => c.total > 0));
  };

  const attendancePieData = [
    { name: "حاضر", value: todayPresent },
    { name: "غائب", value: todayAbsent },
    { name: "متأخر", value: todayLate },
    { name: "لم يُسجَّل", value: todayNotRecorded },
  ].filter((d) => d.value > 0);

  const PIE_COLORS = ["hsl(142, 71%, 45%)", "hsl(0, 84%, 60%)", "hsl(45, 93%, 47%)", "hsl(215, 15%, 70%)"];

  const statCards = [
    { label: "إجمالي الطلاب", value: totalStudents, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "عدد الشُعب", value: totalClasses, icon: BookOpen, color: "text-accent-foreground", bg: "bg-accent/20" },
    { label: "الحضور اليوم", value: todayPresent, icon: UserCheck, color: "text-green-600", bg: "bg-green-100" },
    { label: "الغياب اليوم", value: todayAbsent, icon: UserX, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "المتأخرون", value: todayLate, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" },
    { label: "نسبة الحضور", value: `${attendanceRate}%`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground">
          إحصائيات اليوم — {format(new Date(), "yyyy/MM/dd")}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className={`rounded-xl p-2.5 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attendance Pie + Class Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attendance Pie */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              توزيع الحضور اليوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendancePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {attendancePieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-12">لا توجد بيانات حضور اليوم</p>
            )}
          </CardContent>
        </Card>

        {/* Per-Class Summary Table */}
        {classStats.length > 0 && (
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                ملخص الشُعب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right p-2.5 font-medium">الشُعبة</th>
                      <th className="text-center p-2.5 font-medium">عدد الطلاب</th>
                      <th className="text-center p-2.5 font-medium">حاضر</th>
                      <th className="text-center p-2.5 font-medium">غائب</th>
                      <th className="text-center p-2.5 font-medium">متأخر</th>
                      <th className="text-center p-2.5 font-medium">نسبة الحضور</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStats.map((cls) => {
                      const rate = cls.total > 0 ? Math.round((cls.present / cls.total) * 100) : 0;
                      return (
                        <tr key={cls.name} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-2.5 font-medium">{cls.name}</td>
                          <td className="p-2.5 text-center">{cls.total}</td>
                          <td className="p-2.5 text-center text-green-600 font-medium">{cls.present}</td>
                          <td className="p-2.5 text-center text-destructive font-medium">{cls.absent}</td>
                          <td className="p-2.5 text-center text-yellow-600 font-medium">{cls.late}</td>
                          <td className="p-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              rate >= 80 ? "bg-green-100 text-green-700" :
                              rate >= 50 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Weekly & Monthly Comparison (tabbed) */}
      <PeriodComparison />

      {/* Performance Dashboard - includes class comparison + student details */}
      <PerformanceDashboard />
    </div>
  );
}
