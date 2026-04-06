import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, UserX, BookOpen, FileWarning,
  TrendingUp, TrendingDown, Minus, Activity, Award, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp, BarChart3
} from "lucide-react";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { cn } from "@/lib/utils";
import AbsenceWarningSlip from "@/components/reports/AbsenceWarningSlip";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

interface DailyAttendance {
  day: string;
  present: number;
  absent: number;
  late: number;
  rate: number;
}

interface GradeDistribution {
  label: string;
  count: number;
  color: string;
}

interface BehaviorSummary {
  positive: number;
  negative: number;
  recentTrend: { day: string; positive: number; negative: number }[];
}

const GRADE_COLORS = [
  "hsl(142, 71%, 45%)",  // ممتاز - green
  "hsl(195, 100%, 45%)", // جيد جداً - cyan
  "hsl(45, 93%, 47%)",   // جيد - gold
  "hsl(25, 95%, 53%)",   // مقبول - orange
  "hsl(0, 84%, 60%)",    // ضعيف - red
];

export default function SmartDashboardSummary() {
  const { role, user } = useAuth();
  const [absentToday, setAbsentToday] = useState<AbsentStudent[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [currentLesson, setCurrentLesson] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentWeek } = useAcademicWeek();
  const [isOpen, setIsOpen] = useState(() => localStorage.getItem('smart-summary-open') !== 'false');

  // Chart data
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendance[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [behaviorSummary, setBehaviorSummary] = useState<BehaviorSummary>({ positive: 0, negative: 0, recentTrend: [] });
  const [absSettingsDisplay, setAbsSettingsDisplay] = useState({ mode: "percentage", threshold: 20, allowedSessions: 0 });

  // Warning slip state
  const [warningOpen, setWarningOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AtRiskStudent | null>(null);

  const openWarning = (student: AtRiskStudent) => {
    setSelectedStudent(student);
    setWarningOpen(true);
  };

  const toggleOpen = (open: boolean) => {
    setIsOpen(open);
    localStorage.setItem('smart-summary-open', String(open));
  };

  useEffect(() => {
    fetchSummary();
  }, [currentWeek]);

  const fetchSummary = async () => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const dayIndex = new Date().getDay();
    const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), "yyyy-MM-dd"));

    // Get teacher's class IDs if teacher role
    let teacherClassIds: string[] | null = null;
    if (role === "teacher" && user) {
      const { data: tc } = await supabase
        .from("teacher_classes")
        .select("class_id")
        .eq("teacher_id", user.id);
      teacherClassIds = (tc || []).map((t: any) => t.class_id);
      if (teacherClassIds.length === 0) {
        setLoading(false);
        return;
      }
    }

    // Build queries with optional class filter
    let absQuery = supabase
      .from("attendance_records")
      .select("student_id, students!inner(full_name, class_id, classes!inner(name))")
      .eq("date", today)
      .eq("status", "absent");
    if (teacherClassIds) absQuery = absQuery.in("class_id", teacherClassIds);

    let allAttQuery = supabase
      .from("attendance_records")
      .select("student_id, status, date")
      .gte("date", last7Days[0])
      .lte("date", last7Days[6]);
    if (teacherClassIds) allAttQuery = allAttQuery.in("class_id", teacherClassIds);

    let studentsQuery = supabase
      .from("students")
      .select("id, full_name, class_id, classes!inner(name)");
    if (teacherClassIds) studentsQuery = studentsQuery.in("class_id", teacherClassIds);

    let behaviorQuery = supabase
      .from("behavior_records")
      .select("type, date")
      .gte("date", last7Days[0])
      .lte("date", last7Days[6]);
    if (teacherClassIds) behaviorQuery = behaviorQuery.in("class_id", teacherClassIds);

    // Build full attendance query for at-risk calculation (include in parallel)
    let fullAttQuery = supabase.from("attendance_records").select("student_id, status, date").limit(5000);
    if (teacherClassIds) fullAttQuery = fullAttQuery.in("class_id", teacherClassIds);

    const [absRes, allAttRes, classesRes, lessonRes, settingsRes, gradesRes, behaviorRes, fullAttRes] = await Promise.all([
      absQuery,
      allAttQuery,
      studentsQuery,
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
      supabase
        .from("site_settings")
        .select("id, value")
        .in("id", ["absence_threshold", "absence_allowed_sessions", "absence_mode"]),
      supabase
        .from("grades")
        .select("score, category_id, student_id, grade_categories!inner(max_score)")
        .not("score", "is", null),
      behaviorQuery,
      fullAttQuery,
    ]);

    // Parse settings
    let threshold = 20;
    let allowedSessions = 0;
    let mode = "percentage";
    ((settingsRes as any).data || []).forEach((s: any) => {
      if (s.id === "absence_threshold") threshold = Number(s.value) || 20;
      if (s.id === "absence_allowed_sessions") allowedSessions = Number(s.value) || 0;
      if (s.id === "absence_mode") mode = s.value || "percentage";
    });
    setAbsSettingsDisplay({ mode, threshold, allowedSessions });

    // Absent today
    const absentList: AbsentStudent[] = (absRes.data || []).map((r: any) => ({
      id: r.student_id,
      full_name: r.students?.full_name || "",
      class_name: r.students?.classes?.name || "",
    }));
    setAbsentToday(absentList);
    setCurrentLesson(lessonRes.data?.lesson_title || null);

    // ── Daily Attendance Chart (last 7 days) ──
    const attData = allAttRes.data || [];
    const dayNames = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];
    const dailyMap: Record<string, { present: number; absent: number; late: number }> = {};
    last7Days.forEach(d => { dailyMap[d] = { present: 0, absent: 0, late: 0 }; });
    attData.forEach((r: any) => {
      if (dailyMap[r.date]) {
        if (r.status === "present") dailyMap[r.date].present++;
        else if (r.status === "absent") dailyMap[r.date].absent++;
        else if (r.status === "late") dailyMap[r.date].late++;
      }
    });
    const dailyArr: DailyAttendance[] = last7Days.map(d => {
      const v = dailyMap[d];
      const total = v.present + v.absent + v.late;
      return {
        day: dayNames[new Date(d).getDay()],
        present: v.present,
        absent: v.absent,
        late: v.late,
        rate: total > 0 ? Math.round((v.present / total) * 100) : 0,
      };
    });
    setDailyAttendance(dailyArr);

    const allGrades = (gradesRes.data || []) as any[];
    // Filter grades by teacher's students if applicable
    const studentIds = (classesRes.data || []).map((s: any) => s.id);
    const grades = teacherClassIds ? allGrades.filter((g: any) => studentIds.includes(g.student_id)) : allGrades;
    const distribution = [
      { label: "ممتاز", count: 0, color: GRADE_COLORS[0] },
      { label: "جيد جداً", count: 0, color: GRADE_COLORS[1] },
      { label: "جيد", count: 0, color: GRADE_COLORS[2] },
      { label: "مقبول", count: 0, color: GRADE_COLORS[3] },
      { label: "ضعيف", count: 0, color: GRADE_COLORS[4] },
    ];
    grades.forEach((g: any) => {
      const maxScore = g.grade_categories?.max_score || 100;
      const pct = (g.score / maxScore) * 100;
      if (pct >= 90) distribution[0].count++;
      else if (pct >= 80) distribution[1].count++;
      else if (pct >= 70) distribution[2].count++;
      else if (pct >= 60) distribution[3].count++;
      else distribution[4].count++;
    });
    setGradeDistribution(distribution.filter(d => d.count > 0));

    // ── Behavior Summary ──
    const behaviorData = behaviorRes.data || [];
    let positive = 0, negative = 0;
    const behaviorByDay: Record<string, { positive: number; negative: number }> = {};
    last7Days.forEach(d => { behaviorByDay[d] = { positive: 0, negative: 0 }; });
    behaviorData.forEach((b: any) => {
      const isPositive = ["positive", "إيجابي", "praise", "مشاركة", "participation", "excellence", "تميز"].some(
        t => b.type?.toLowerCase().includes(t)
      );
      if (isPositive) {
        positive++;
        if (behaviorByDay[b.date]) behaviorByDay[b.date].positive++;
      } else {
        negative++;
        if (behaviorByDay[b.date]) behaviorByDay[b.date].negative++;
      }
    });
    setBehaviorSummary({
      positive,
      negative,
      recentTrend: last7Days.map(d => ({
        day: dayNames[new Date(d).getDay()],
        positive: behaviorByDay[d].positive,
        negative: behaviorByDay[d].negative,
      })),
    });

    // ── At-Risk Students (reuse existing data instead of duplicate query) ──
    const students = classesRes.data || [];
    if (students.length > 0) {
      const fullDays: Record<string, { absent: number; total: Set<string> }> = {};
      (fullAttRes.data || []).forEach((r: any) => {
        if (!fullDays[r.student_id]) {
          fullDays[r.student_id] = { absent: 0, total: new Set() };
        }
        fullDays[r.student_id].total.add(r.date);
        if (r.status === "absent") fullDays[r.student_id].absent++;
      });

      const risk: AtRiskStudent[] = [];
      students.forEach((s: any) => {
        const data = fullDays[s.id];
        if (data && data.total.size >= 5) {
          const rate = (data.absent / data.total.size) * 100;
          let exceeded = false;
          if (mode === "sessions" && allowedSessions > 0) {
            exceeded = data.absent > allowedSessions;
          } else {
            exceeded = rate >= threshold;
          }
          if (exceeded) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="h-52 bg-muted/50 border-0" />
        ))}
      </div>
    );
  }

  // Calculate attendance trend
  const validDays = dailyAttendance.filter(d => d.present + d.absent + d.late > 0);
  const avgRate = validDays.length > 0 ? Math.round(validDays.reduce((s, d) => s + d.rate, 0) / validDays.length) : 0;
  const lastRate = validDays.length > 0 ? validDays[validDays.length - 1].rate : 0;
  const prevRate = validDays.length > 1 ? validDays[validDays.length - 2].rate : lastRate;
  const trendDir = lastRate > prevRate ? "up" : lastRate < prevRate ? "down" : "stable";

  return (
    <Collapsible open={isOpen} onOpenChange={toggleOpen}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          <h3 className="text-sm font-bold text-foreground">الملخص الذكي</h3>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isOpen ? "إخفاء" : "إظهار"}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

      {/* ── 1. Attendance Trend Chart ── */}
      <Card className="border-0 ring-1 ring-primary/15 bg-gradient-to-br from-primary/5 via-card to-primary/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
                <Activity className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">اتجاه الحضور</p>
                <p className="text-xs text-muted-foreground">آخر 7 أيام</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {trendDir === "up" && <TrendingUp className="h-4 w-4 text-success" />}
              {trendDir === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
              {trendDir === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
              <span className={cn("text-lg font-black", trendDir === "up" ? "text-success" : trendDir === "down" ? "text-destructive" : "text-foreground")}>
                {avgRate}%
              </span>
            </div>
          </div>
          <div className="h-28 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyAttendance} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, direction: 'rtl' }}
                  formatter={(value: number) => [`${value}%`, 'نسبة الحضور']}
                />
                <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#attendGrad)" dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Grade Distribution Pie ── */}
      <Card className="border-0 ring-1 ring-info/15 bg-gradient-to-br from-info/5 via-card to-info/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-info to-info/70 shadow-md">
              <Award className="h-4 w-4 text-info-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">توزيع الدرجات</p>
              <p className="text-xs text-muted-foreground">جميع التقييمات</p>
            </div>
          </div>
          {gradeDistribution.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="h-28 w-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gradeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={50}
                      paddingAngle={3}
                      dataKey="count"
                      strokeWidth={0}
                    >
                      {gradeDistribution.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11, direction: 'rtl' }}
                      formatter={(value: number, _: any, entry: any) => [value, entry.payload.label]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                {gradeDistribution.map((g, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
                    <span className="text-foreground font-medium truncate">{g.label}</span>
                    <span className="text-muted-foreground mr-auto">{g.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-28 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">لا توجد درجات مسجلة بعد</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 3. Behavior Chart ── */}
      <Card className="border-0 ring-1 ring-success/15 bg-gradient-to-br from-success/5 via-card to-success/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-success to-success/70 shadow-md">
                <ThumbsUp className="h-4 w-4 text-success-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">السلوك</p>
                <p className="text-xs text-muted-foreground">آخر 7 أيام</p>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <Badge className="bg-success/15 text-success border-0 gap-1">
                <ThumbsUp className="h-3 w-3" />{behaviorSummary.positive}
              </Badge>
              <Badge className="bg-destructive/15 text-destructive border-0 gap-1">
                <ThumbsDown className="h-3 w-3" />{behaviorSummary.negative}
              </Badge>
            </div>
          </div>
          <div className="h-28 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={behaviorSummary.recentTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11, direction: 'rtl' }}
                />
                <Bar dataKey="positive" name="إيجابي" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="negative" name="سلبي" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── 4. Current Lesson ── */}
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

      {/* ── 5. Absent Today ── */}
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

      {/* ── 6. At-Risk Students ── */}
      <Card className="border-0 ring-1 ring-warning/15 bg-gradient-to-br from-warning/5 via-card to-warning/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-warning to-warning/70 shadow-md">
              <AlertTriangle className="h-4 w-4 text-warning-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">حد الغياب {absSettingsDisplay.mode === "sessions" && absSettingsDisplay.allowedSessions > 0 ? `${absSettingsDisplay.allowedSessions} حصة` : `${absSettingsDisplay.threshold}%`}</p>
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
            <div className="max-h-28 overflow-y-auto space-y-1.5 scrollbar-thin">
              {atRiskStudents.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs bg-warning/5 rounded-lg px-2 py-1.5 gap-2">
                  <span className="font-medium text-foreground truncate flex-1">{s.full_name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-warning font-bold text-[10px]">{s.absenceRate}%</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => openWarning(s)}
                    >
                      <FileWarning className="h-3 w-3" />
                    </Button>
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

      {selectedStudent && (
        <AbsenceWarningSlip
          open={warningOpen}
          onOpenChange={setWarningOpen}
          studentId={selectedStudent.id}
          studentName={selectedStudent.full_name}
          className={selectedStudent.class_name}
          absenceRate={selectedStudent.absenceRate}
          totalAbsent={selectedStudent.totalAbsent}
          totalDays={selectedStudent.totalDays}
        />
      )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
