import { Card } from "@/components/ui/card";
import {
  UserCheck, UserX, GraduationCap, TrendingUp, TrendingDown, Award,
  AlertTriangle, ShieldCheck, Sparkles, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AttendanceRow, GradeRow } from "@/hooks/useReportsData";

interface Props {
  activeTab: string;
  studentsCount: number;
  attendanceData: AttendanceRow[];
  gradeData: GradeRow[];
  selectedClass: string;
  dateFrom: string;
  dateTo: string;
  classes: { id: string }[];
}

interface StatCard {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  icon: any;
  tone: "primary" | "success" | "warning" | "destructive" | "info" | "accent";
  trend?: "up" | "down" | "flat";
}

const TONE_CLS: Record<string, { gradient: string; iconBg: string; iconColor: string; ring: string; valueColor: string }> = {
  primary:     { gradient: "from-primary/15 via-primary/5 to-transparent",         iconBg: "bg-primary/15",     iconColor: "text-primary",     ring: "ring-primary/15",     valueColor: "text-primary" },
  success:     { gradient: "from-success/20 via-success/5 to-transparent",         iconBg: "bg-success/15",     iconColor: "text-success",     ring: "ring-success/15",     valueColor: "text-success" },
  warning:     { gradient: "from-warning/20 via-warning/5 to-transparent",         iconBg: "bg-warning/15",     iconColor: "text-warning",     ring: "ring-warning/15",     valueColor: "text-warning" },
  destructive: { gradient: "from-destructive/20 via-destructive/5 to-transparent", iconBg: "bg-destructive/15", iconColor: "text-destructive", ring: "ring-destructive/15", valueColor: "text-destructive" },
  info:        { gradient: "from-info/20 via-info/5 to-transparent",               iconBg: "bg-info/15",        iconColor: "text-info",        ring: "ring-info/15",        valueColor: "text-info" },
  accent:      { gradient: "from-accent/20 via-accent/5 to-transparent",           iconBg: "bg-accent/15",      iconColor: "text-accent",      ring: "ring-accent/15",      valueColor: "text-accent" },
};

function StatCardItem({ stat }: { stat: StatCard }) {
  const tone = TONE_CLS[stat.tone];
  const TrendIcon = stat.trend === "up" ? TrendingUp : stat.trend === "down" ? TrendingDown : Activity;
  return (
    <Card className={cn(
      "relative overflow-hidden border-0 ring-1 shadow-card hover:shadow-card-hover transition-all duration-300 group cursor-default",
      tone.ring
    )}>
      <div className={cn("absolute inset-0 bg-gradient-to-bl opacity-70", tone.gradient)} />
      <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full blur-2xl opacity-20 bg-current pointer-events-none" />
      <div className="relative p-4 flex items-start gap-3">
        <div className={cn(
          "rounded-2xl p-3 shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
          tone.iconBg
        )}>
          <stat.icon className={cn("h-5 w-5", tone.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">{stat.label}</p>
          <div className="flex items-baseline gap-1">
            <p className={cn("text-3xl font-black tabular-nums tracking-tight", tone.valueColor)}>
              {stat.value}
            </p>
            {stat.suffix && <span className="text-base font-bold text-muted-foreground">{stat.suffix}</span>}
            {stat.trend && (
              <TrendIcon className={cn(
                "h-3.5 w-3.5 mr-auto",
                stat.trend === "up" ? "text-success" : stat.trend === "down" ? "text-destructive" : "text-muted-foreground"
              )} />
            )}
          </div>
          {stat.hint && (
            <p className="text-[11px] text-muted-foreground/90 mt-1 line-clamp-1">{stat.hint}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function ReportsStatCards({
  activeTab, studentsCount, attendanceData, gradeData,
  selectedClass, dateFrom, dateTo, classes,
}: Props) {
  // ============ Attendance stats ============
  const total = attendanceData.length;
  const present = attendanceData.filter(r => r.status === "present").length;
  const absent = attendanceData.filter(r => r.status === "absent").length;
  const late = attendanceData.filter(r => r.status === "late").length;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

  // Most-absent student
  const absenceByStudent = new Map<string, { name: string; count: number }>();
  attendanceData.filter(r => r.status === "absent").forEach(r => {
    const cur = absenceByStudent.get(r.student_id) || { name: r.student_name, count: 0 };
    cur.count++;
    absenceByStudent.set(r.student_id, cur);
  });
  const topAbsent = [...absenceByStudent.values()].sort((a, b) => b.count - a.count)[0];

  // ============ Grades stats ============
  const validGrades = gradeData.filter(g => typeof g.total === "number" && !isNaN(g.total));
  const avgGrade = validGrades.length > 0
    ? Math.round((validGrades.reduce((s, g) => s + g.total, 0) / validGrades.length) * 10) / 10
    : 0;
  const topStudent = [...validGrades].sort((a, b) => b.total - a.total)[0];
  const passingCount = validGrades.filter(g => g.total >= 60).length;
  const passingRate = validGrades.length > 0 ? Math.round((passingCount / validGrades.length) * 100) : 0;

  // ============ Behavior stats (live fetch) ============
  const [behaviorStats, setBehaviorStats] = useState({ violations: 0, positive: 0, topName: "—", topCount: 0 });
  useEffect(() => {
    if (activeTab !== "behavior") return;
    const fetchBehavior = async () => {
      const targetIds = selectedClass === "all" ? classes.map(c => c.id) : [selectedClass];
      if (targetIds.length === 0) return;
      const { data } = await supabase
        .from("behavior_records")
        .select("type, student_id, students(full_name)")
        .in("class_id", targetIds)
        .gte("date", dateFrom)
        .lte("date", dateTo);
      const rows = data || [];
      const violations = rows.filter((r: any) => r.type === "negative" || r.type === "violation").length;
      const positive = rows.filter((r: any) => r.type === "positive").length;
      const byStudent = new Map<string, { name: string; count: number }>();
      rows.filter((r: any) => r.type !== "positive").forEach((r: any) => {
        const cur = byStudent.get(r.student_id) || { name: r.students?.full_name || "—", count: 0 };
        cur.count++;
        byStudent.set(r.student_id, cur);
      });
      const top = [...byStudent.values()].sort((a, b) => b.count - a.count)[0];
      setBehaviorStats({
        violations,
        positive,
        topName: top?.name || "لا يوجد",
        topCount: top?.count || 0,
      });
    };
    fetchBehavior();
  }, [activeTab, selectedClass, dateFrom, dateTo, classes]);

  // ============ Build cards by tab ============
  let cards: StatCard[] = [];

  if (activeTab === "attendance") {
    cards = [
      {
        label: "نسبة الانتظام",
        value: attendanceRate, suffix: "%",
        hint: `${present} حضور من ${total} سجل`,
        icon: UserCheck, tone: attendanceRate >= 85 ? "success" : attendanceRate >= 70 ? "warning" : "destructive",
        trend: attendanceRate >= 85 ? "up" : attendanceRate < 70 ? "down" : "flat",
      },
      {
        label: "الأكثر غياباً",
        value: topAbsent?.count ?? 0, suffix: topAbsent ? "غياب" : "",
        hint: topAbsent?.name || `لا غياب • ${absent} غياب • ${late} تأخر`,
        icon: UserX, tone: topAbsent && topAbsent.count >= 3 ? "destructive" : "warning",
      },
    ];
  } else if (activeTab === "grades") {
    cards = [
      {
        label: "متوسط الأداء",
        value: avgGrade, suffix: "/ 100",
        hint: `${validGrades.length} طالب • ${passingRate}% ناجحون`,
        icon: GraduationCap, tone: avgGrade >= 80 ? "success" : avgGrade >= 60 ? "info" : "warning",
        trend: avgGrade >= 80 ? "up" : avgGrade < 60 ? "down" : "flat",
      },
      {
        label: "الطالب الأول",
        value: topStudent ? Math.round(topStudent.total) : "—",
        suffix: topStudent ? "نقطة" : "",
        hint: topStudent?.student_name || "لا توجد بيانات",
        icon: Award, tone: "accent",
      },
    ];
  } else if (activeTab === "behavior") {
    cards = [
      {
        label: "إجمالي المخالفات",
        value: behaviorStats.violations,
        hint: `${behaviorStats.positive} ملاحظة إيجابية مقابلها`,
        icon: AlertTriangle, tone: behaviorStats.violations === 0 ? "success" : behaviorStats.violations >= 10 ? "destructive" : "warning",
        trend: behaviorStats.violations === 0 ? "up" : behaviorStats.violations >= 10 ? "down" : "flat",
      },
      {
        label: "الأكثر مخالفة",
        value: behaviorStats.topCount, suffix: behaviorStats.topCount > 0 ? "مخالفة" : "",
        hint: behaviorStats.topName,
        icon: behaviorStats.violations === 0 ? ShieldCheck : Sparkles,
        tone: behaviorStats.topCount >= 5 ? "destructive" : behaviorStats.topCount > 0 ? "warning" : "success",
      },
    ];
  }

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
      {cards.map((stat, i) => <StatCardItem key={i} stat={stat} />)}
    </div>
  );
}
