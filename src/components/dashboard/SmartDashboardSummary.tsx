import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, UserX, BookOpen, TrendingDown, FileWarning } from "lucide-react";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { cn } from "@/lib/utils";
import AbsenceWarningSlip from "@/components/reports/AbsenceWarningSlip";

interface AbsentStudent {
  id: string;
  full_name: string;
  class_name: string;
}

interface AtRiskStudent {
  id: string;
  full_name: string;
  class_name: string;
  absenceRate: number;
  totalAbsent: number;
  totalDays: number;
}

export default function SmartDashboardSummary() {
  const [absentToday, setAbsentToday] = useState<AbsentStudent[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [currentLesson, setCurrentLesson] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentWeek } = useAcademicWeek();

  // Warning slip state
  const [warningOpen, setWarningOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AtRiskStudent | null>(null);

  const openWarning = (student: AtRiskStudent) => {
    setSelectedStudent(student);
    setWarningOpen(true);
  };

  useEffect(() => {
    fetchSummary();
  }, [currentWeek]);

  const fetchSummary = async () => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const dayIndex = new Date().getDay(); // 0=Sun

    // Fetch absent today, all attendance records, classes, and current lesson in parallel
    const [absRes, allAttRes, classesRes, lessonRes] = await Promise.all([
      supabase
        .from("attendance_records")
        .select("student_id, students!inner(full_name, class_id, classes!inner(name))")
        .eq("date", today)
        .eq("status", "absent"),
      supabase
        .from("attendance_records")
        .select("student_id, status, date"),
      supabase
        .from("students")
        .select("id, full_name, class_id, classes!inner(name)"),
      currentWeek
        ? supabase
            .from("lesson_plans")
            .select("lesson_title")
            .eq("week_number", currentWeek)
            .eq("day_index", dayIndex)
            .eq("slot_index", 0)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Absent today
    const absentList: AbsentStudent[] = (absRes.data || []).map((r: any) => ({
      id: r.student_id,
      full_name: r.students?.full_name || "",
      class_name: r.students?.classes?.name || "",
    }));
    setAbsentToday(absentList);

    // Current lesson
    setCurrentLesson(lessonRes.data?.lesson_title || null);

    // Calculate at-risk students (>=20% absence rate)
    const allAtt = allAttRes.data || [];
    const students = classesRes.data || [];

    if (allAtt.length > 0 && students.length > 0) {
      // Count unique dates per student
      const studentDays: Record<string, { absent: number; total: Set<string> }> = {};
      allAtt.forEach((r: any) => {
        if (!studentDays[r.student_id]) {
          studentDays[r.student_id] = { absent: 0, total: new Set() };
        }
        studentDays[r.student_id].total.add(r.date);
        if (r.status === "absent") studentDays[r.student_id].absent++;
      });

      const risk: AtRiskStudent[] = [];
      students.forEach((s: any) => {
        const data = studentDays[s.id];
        if (data && data.total.size >= 5) {
          const rate = (data.absent / data.total.size) * 100;
          if (rate >= 20) {
            risk.push({
              id: s.id,
              full_name: s.full_name,
              class_name: (s as any).classes?.name || "",
              absenceRate: Math.round(rate),
              totalAbsent: data.absent,
              totalDays: data.total.size,
            });
          }
        }
      });
      risk.sort((a, b) => b.absenceRate - a.absenceRate);
      setAtRiskStudents(risk);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-28 bg-muted/50 border-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Current Lesson - FIRST */}
      <Card className="border-0 ring-1 ring-info/15 bg-gradient-to-br from-info/5 via-card to-info/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-info to-info/70 shadow-md">
              <BookOpen className="h-4 w-4 text-info-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">درس اليوم</p>
              <p className="text-xs text-muted-foreground">
                {currentWeek ? `الأسبوع ${currentWeek}` : "الخطة الدراسية"}
              </p>
            </div>
          </div>
          {currentLesson ? (
            <div className="bg-info/5 rounded-lg px-3 py-2">
              <p className="text-sm font-semibold text-foreground">{currentLesson}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">لم يتم تعيين درس لهذا اليوم</p>
          )}
        </CardContent>
      </Card>

      {/* Absent Today */}
      <Card className="border-0 ring-1 ring-destructive/15 bg-gradient-to-br from-destructive/5 via-card to-destructive/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-destructive to-destructive/70 shadow-md">
              <UserX className="h-4 w-4 text-destructive-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">الغياب اليوم</p>
              <p className="text-xs text-muted-foreground">إجمالي الغائبين</p>
            </div>
            <Badge variant="destructive" className="mr-auto text-lg px-3 py-0.5">
              {absentToday.length}
            </Badge>
          </div>
          {absentToday.length > 0 ? (
            <div className="max-h-24 overflow-y-auto space-y-1 scrollbar-thin">
              {absentToday.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs bg-destructive/5 rounded-lg px-2 py-1">
                  <span className="font-medium text-foreground truncate">{s.full_name}</span>
                  <span className="text-muted-foreground text-[10px]">{s.class_name}</span>
                </div>
              ))}
              {absentToday.length > 5 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  +{absentToday.length - 5} طالب آخر
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-success font-medium">✓ لا يوجد غياب اليوم</p>
          )}
        </CardContent>
      </Card>

      {/* At-Risk Students (20% limit) */}
      <Card className="border-0 ring-1 ring-warning/15 bg-gradient-to-br from-warning/5 via-card to-warning/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-warning to-warning/70 shadow-md">
              <AlertTriangle className="h-4 w-4 text-warning-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">حد الغياب 20%</p>
              <p className="text-xs text-muted-foreground">طلاب بلغوا الحد</p>
            </div>
            <Badge className={cn(
              "mr-auto text-lg px-3 py-0.5",
              atRiskStudents.length > 0
                ? "bg-warning text-warning-foreground hover:bg-warning/80"
                : "bg-success text-success-foreground hover:bg-success/80"
            )}>
              {atRiskStudents.length}
            </Badge>
          </div>
          {atRiskStudents.length > 0 ? (
            <div className="max-h-24 overflow-y-auto space-y-1 scrollbar-thin">
              {atRiskStudents.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs bg-warning/5 rounded-lg px-2 py-1">
                  <span className="font-medium text-foreground truncate">{s.full_name}</span>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-warning" />
                    <span className="text-warning font-bold text-[10px]">{s.absenceRate}%</span>
                  </div>
                </div>
              ))}
              {atRiskStudents.length > 5 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  +{atRiskStudents.length - 5} طالب آخر
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-success font-medium">✓ لا يوجد طلاب بلغوا الحد</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
