import { Card } from "@/components/ui/card";
import {
  UserCheck, UserX, GraduationCap, TrendingUp, TrendingDown, Award,
  AlertTriangle, ShieldCheck, Sparkles, Activity, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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

interface DetailRow { name: string; value: number; meta?: string }

interface StatCard {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  icon: any;
  tone: "primary" | "success" | "warning" | "destructive" | "info" | "accent";
  trend?: "up" | "down" | "flat";
  detail?: {
    title: string;
    description?: string;
    rows: DetailRow[];
    valueLabel: string;
    sortDir?: "asc" | "desc";
  };
}

const TONE_CLS: Record<string, { gradient: string; iconBg: string; iconColor: string; ring: string; valueColor: string; badge: string }> = {
  primary:     { gradient: "from-primary/15 via-primary/5 to-transparent",         iconBg: "bg-primary/15",     iconColor: "text-primary",     ring: "ring-primary/15",     valueColor: "text-primary",     badge: "bg-primary/15 text-primary" },
  success:     { gradient: "from-success/20 via-success/5 to-transparent",         iconBg: "bg-success/15",     iconColor: "text-success",     ring: "ring-success/15",     valueColor: "text-success",     badge: "bg-success/15 text-success" },
  warning:     { gradient: "from-warning/20 via-warning/5 to-transparent",         iconBg: "bg-warning/15",     iconColor: "text-warning",     ring: "ring-warning/15",     valueColor: "text-warning",     badge: "bg-warning/15 text-warning" },
  destructive: { gradient: "from-destructive/20 via-destructive/5 to-transparent", iconBg: "bg-destructive/15", iconColor: "text-destructive", ring: "ring-destructive/15", valueColor: "text-destructive", badge: "bg-destructive/15 text-destructive" },
  info:        { gradient: "from-info/20 via-info/5 to-transparent",               iconBg: "bg-info/15",        iconColor: "text-info",        ring: "ring-info/15",        valueColor: "text-info",        badge: "bg-info/15 text-info" },
  accent:      { gradient: "from-accent/20 via-accent/5 to-transparent",           iconBg: "bg-accent/15",      iconColor: "text-accent",      ring: "ring-accent/15",      valueColor: "text-accent",      badge: "bg-accent/15 text-accent" },
};

function StatCardItem({ stat, onClick }: { stat: StatCard; onClick?: () => void }) {
  const tone = TONE_CLS[stat.tone];
  const TrendIcon = stat.trend === "up" ? TrendingUp : stat.trend === "down" ? TrendingDown : Activity;
  const clickable = !!stat.detail && stat.detail.rows.length > 0;
  return (
    <Card
      onClick={clickable ? onClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
      className={cn(
        "relative overflow-hidden border-0 ring-1 shadow-card transition-all duration-300 group",
        tone.ring,
        clickable
          ? "cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : "cursor-default hover:shadow-card-hover"
      )}
    >
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
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">{stat.label}</p>
            {clickable && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold gap-0.5">
                {stat.detail!.rows.length}
                <ChevronLeft className="h-2.5 w-2.5" />
              </Badge>
            )}
          </div>
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
          {clickable && (
            <p className="text-[10px] text-muted-foreground/70 mt-1 font-medium">اضغط لعرض التفاصيل ←</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function DetailDialog({
  open, onOpenChange, stat,
}: { open: boolean; onOpenChange: (v: boolean) => void; stat: StatCard | null }) {
  if (!stat?.detail) return null;
  const tone = TONE_CLS[stat.tone];
  const dir = stat.detail.sortDir ?? "desc";
  const rows = [...stat.detail.rows].sort((a, b) => dir === "desc" ? b.value - a.value : a.value - b.value);
  const max = Math.max(1, ...rows.map(r => r.value));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("rounded-xl p-2.5", tone.iconBg)}>
              <stat.icon className={cn("h-5 w-5", tone.iconColor)} />
            </div>
            <div>
              <DialogTitle className="text-right">{stat.detail.title}</DialogTitle>
              {stat.detail.description && (
                <DialogDescription className="text-right text-xs mt-0.5">{stat.detail.description}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-1.5">
            {rows.map((row, i) => {
              const pct = (row.value / max) * 100;
              return (
                <div key={i} className="relative rounded-lg border bg-card p-2.5 hover:bg-muted/40 transition-colors">
                  <div
                    className={cn("absolute inset-y-0 right-0 rounded-lg opacity-15", tone.iconBg)}
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative flex items-center gap-2">
                    <span className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                      tone.badge
                    )}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{row.name}</p>
                      {row.meta && <p className="text-[10px] text-muted-foreground truncate">{row.meta}</p>}
                    </div>
                    <div className="text-left shrink-0">
                      <span className={cn("text-base font-black tabular-nums", tone.valueColor)}>{row.value}</span>
                      <span className="text-[10px] text-muted-foreground mr-0.5">{stat.detail!.valueLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">لا توجد بيانات</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function ReportsStatCards({
  activeTab, studentsCount, attendanceData, gradeData,
  selectedClass, dateFrom, dateTo, classes,
}: Props) {
  const [openDetail, setOpenDetail] = useState<number | null>(null);

  // ============ Attendance stats ============
  const total = attendanceData.length;
  const present = attendanceData.filter(r => r.status === "present").length;
  const absent = attendanceData.filter(r => r.status === "absent").length;
  const late = attendanceData.filter(r => r.status === "late").length;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

  const absenceByStudent = new Map<string, { name: string; count: number; lateCount: number }>();
  attendanceData.forEach(r => {
    if (r.status !== "absent" && r.status !== "late") return;
    const cur = absenceByStudent.get(r.student_id) || { name: r.student_name, count: 0, lateCount: 0 };
    if (r.status === "absent") cur.count++;
    else cur.lateCount++;
    absenceByStudent.set(r.student_id, cur);
  });
  const absenceList: DetailRow[] = [...absenceByStudent.values()]
    .filter(s => s.count > 0)
    .map(s => ({ name: s.name, value: s.count, meta: s.lateCount > 0 ? `${s.lateCount} تأخر` : undefined }));
  const topAbsent = [...absenceList].sort((a, b) => b.value - a.value)[0];

  // ============ Grades stats ============
  const validGrades = gradeData.filter(g => typeof g.total === "number" && !isNaN(g.total));
  const avgGrade = validGrades.length > 0
    ? Math.round((validGrades.reduce((s, g) => s + g.total, 0) / validGrades.length) * 10) / 10
    : 0;
  const sortedGrades = [...validGrades].sort((a, b) => b.total - a.total);
  const topStudent = sortedGrades[0];
  const passingCount = validGrades.filter(g => g.total >= 60).length;
  const passingRate = validGrades.length > 0 ? Math.round((passingCount / validGrades.length) * 100) : 0;
  const topList: DetailRow[] = sortedGrades.map(g => ({
    name: g.student_name,
    value: Math.round(g.total),
    meta: g.total >= 90 ? "ممتاز" : g.total >= 80 ? "جيد جداً" : g.total >= 60 ? "ناجح" : "يحتاج دعم",
  }));

  // ============ Behavior stats (live fetch) ============
  const [behaviorStats, setBehaviorStats] = useState<{
    violations: number; positive: number;
    violationRows: DetailRow[];
  }>({ violations: 0, positive: 0, violationRows: [] });

  useEffect(() => {
    const fetchBehavior = async () => {
      const targetIds = selectedClass === "all" ? classes.map(c => c.id) : [selectedClass];
      if (targetIds.length === 0) { setBehaviorStats({ violations: 0, positive: 0, violationRows: [] }); return; }
      const { data } = await supabase
        .from("behavior_records")
        .select("type, note, student_id, students(full_name)")
        .in("class_id", targetIds)
        .gte("date", dateFrom)
        .lte("date", dateTo);
      const rows = data || [];
      const violations = rows.filter((r: any) => r.type === "negative" || r.type === "violation").length;
      const positive = rows.filter((r: any) => r.type === "positive").length;
      const byStudent = new Map<string, { name: string; count: number; lastNote?: string }>();
      rows.filter((r: any) => r.type !== "positive").forEach((r: any) => {
        const cur: { name: string; count: number; lastNote?: string } =
          byStudent.get(r.student_id) || { name: r.students?.full_name || "—", count: 0 };
        cur.count++;
        if (r.note) cur.lastNote = r.note;
        byStudent.set(r.student_id, cur);
      });
      const violationRows: DetailRow[] = [...byStudent.values()].map(s => ({
        name: s.name, value: s.count,
        meta: s.lastNote ? `آخر ملاحظة: ${s.lastNote}` : undefined,
      }));
      setBehaviorStats({ violations, positive, violationRows });
    };
    fetchBehavior();
  }, [selectedClass, dateFrom, dateTo, classes]);

  // ============ Build all cards (always visible) ============
  const cards: StatCard[] = [
    {
      label: "نسبة الانتظام",
      value: attendanceRate, suffix: "%",
      hint: `${present} حضور من ${total} سجل`,
      icon: UserCheck,
      tone: attendanceRate >= 85 ? "success" : attendanceRate >= 70 ? "warning" : "destructive",
      trend: attendanceRate >= 85 ? "up" : attendanceRate < 70 ? "down" : "flat",
    },
    {
      label: "الأكثر غياباً",
      value: topAbsent?.value ?? 0, suffix: topAbsent ? "غياب" : "",
      hint: topAbsent?.name || `لا غياب • ${absent} غياب • ${late} تأخر`,
      icon: UserX,
      tone: topAbsent && topAbsent.value >= 3 ? "destructive" : "warning",
      detail: {
        title: "ترتيب الطلاب حسب الغياب",
        description: `${absenceList.length} طالب • إجمالي ${absent} غياب و ${late} تأخر`,
        rows: absenceList, valueLabel: "غياب", sortDir: "desc",
      },
    },
    {
      label: "متوسط الأداء",
      value: avgGrade, suffix: "/ 100",
      hint: `${validGrades.length} طالب • ${passingRate}% ناجحون`,
      icon: GraduationCap,
      tone: avgGrade >= 80 ? "success" : avgGrade >= 60 ? "info" : "warning",
      trend: avgGrade >= 80 ? "up" : avgGrade < 60 ? "down" : "flat",
    },
    {
      label: "الطالب الأول",
      value: topStudent ? Math.round(topStudent.total) : "—",
      suffix: topStudent ? "نقطة" : "",
      hint: topStudent?.student_name || "لا توجد بيانات",
      icon: Award, tone: "accent",
      detail: {
        title: "ترتيب الطلاب حسب الدرجات",
        description: `${validGrades.length} طالب • متوسط ${avgGrade} • ${passingCount} ناجح`,
        rows: topList, valueLabel: "نقطة", sortDir: "desc",
      },
    },
    {
      label: "إجمالي المخالفات",
      value: behaviorStats.violations,
      hint: `${behaviorStats.positive} ملاحظة إيجابية مقابلها`,
      icon: AlertTriangle,
      tone: behaviorStats.violations === 0 ? "success" : behaviorStats.violations >= 10 ? "destructive" : "warning",
      trend: behaviorStats.violations === 0 ? "up" : behaviorStats.violations >= 10 ? "down" : "flat",
    },
    {
      label: "الأكثر مخالفة",
      value: behaviorStats.violationRows[0]?.value ?? 0,
      suffix: behaviorStats.violationRows.length > 0 ? "مخالفة" : "",
      hint: behaviorStats.violationRows[0]?.name || "لا توجد مخالفات",
      icon: behaviorStats.violations === 0 ? ShieldCheck : Sparkles,
      tone: (behaviorStats.violationRows[0]?.value ?? 0) >= 5
        ? "destructive"
        : (behaviorStats.violationRows[0]?.value ?? 0) > 0 ? "warning" : "success",
      detail: {
        title: "ترتيب الطلاب حسب المخالفات",
        description: `${behaviorStats.violationRows.length} طالب • إجمالي ${behaviorStats.violations} مخالفة`,
        rows: behaviorStats.violationRows, valueLabel: "مخالفة", sortDir: "desc",
      },
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
        {cards.map((stat, i) => (
          <StatCardItem key={i} stat={stat} onClick={() => setOpenDetail(i)} />
        ))}
      </div>
      <DetailDialog
        open={openDetail !== null}
        onOpenChange={(v) => { if (!v) setOpenDetail(null); }}
        stat={openDetail !== null ? cards[openDetail] : null}
      />
    </>
  );
}
