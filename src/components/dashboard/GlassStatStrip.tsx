import { Users, BookOpen, UserCheck, AlertCircle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  totalStudents: number;
  totalClasses: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  attendanceRate: number;
  loading?: boolean;
}

export default function GlassStatStrip(props: Props) {
  const alerts = props.todayAbsent + props.todayLate;
  const rateTone =
    props.attendanceRate >= 90 ? "text-success" :
    props.attendanceRate >= 70 ? "text-warning" : "text-destructive";

  const items = [
    {
      key: "rate",
      label: "نسبة الحضور",
      value: `${props.attendanceRate}%`,
      icon: Activity,
      color: rateTone,
      bg: "bg-primary/10",
      ring: "ring-primary/20",
    },
    {
      key: "present",
      label: "حاضر اليوم",
      value: `${props.todayPresent}/${props.totalStudents || 0}`,
      icon: UserCheck,
      color: "text-success",
      bg: "bg-success/10",
      ring: "ring-success/20",
    },
    {
      key: "alerts",
      label: "تنبيهات (غياب/تأخر)",
      value: String(alerts),
      icon: AlertCircle,
      color: alerts > 0 ? "text-destructive" : "text-muted-foreground",
      bg: "bg-destructive/10",
      ring: "ring-destructive/20",
    },
    {
      key: "students",
      label: "إجمالي الطلاب",
      value: String(props.totalStudents),
      icon: Users,
      color: "text-info",
      bg: "bg-info/10",
      ring: "ring-info/20",
    },
    {
      key: "classes",
      label: "الفصول",
      value: String(props.totalClasses),
      icon: BookOpen,
      color: "text-accent",
      bg: "bg-accent/10",
      ring: "ring-accent/20",
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((it) => (
        <div
          key={it.key}
          className={cn(
            "group relative overflow-hidden rounded-2xl border border-border/30 bg-card/70 backdrop-blur-md p-3.5 ring-1 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
            it.ring
          )}
        >
          <div className={cn("absolute -top-6 -left-6 h-20 w-20 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity", it.bg)} />
          <div className="relative flex items-center gap-3">
            <div className={cn("rounded-xl p-2.5 shrink-0 transition-transform group-hover:scale-110", it.bg)}>
              <it.icon className={cn("h-4.5 w-4.5", it.color)} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              {props.loading ? (
                <div className="h-7 w-12 rounded-md bg-muted animate-pulse" />
              ) : (
                <div className={cn("text-2xl font-black tabular-nums tracking-tight leading-none", it.color)}>
                  {it.value}
                </div>
              )}
              <div className="text-[11px] text-muted-foreground font-medium mt-1 truncate">{it.label}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
