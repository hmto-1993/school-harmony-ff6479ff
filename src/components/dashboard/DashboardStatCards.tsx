import { Card } from "@/components/ui/card";
import { Users, BookOpen, UserCheck, UserX, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface Props {
  totalStudents: number;
  totalClasses: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  attendanceRate: number;
  loading: boolean;
}

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    if (target === 0) { setValue(0); prev.current = 0; return; }
    const start = prev.current;
    const diff = target - start;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(start + diff * ease));
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = target;
    }
    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

const stats = [
  { key: "totalStudents", label: "إجمالي الطلاب", icon: Users, gradient: "from-primary/15 via-primary/5 to-transparent", iconBg: "bg-primary/15", iconColor: "text-primary", ring: "ring-primary/10" },
  { key: "totalClasses", label: "عدد الفصول", icon: BookOpen, gradient: "from-accent/15 via-accent/5 to-transparent", iconBg: "bg-accent/15", iconColor: "text-accent", ring: "ring-accent/10" },
  { key: "todayPresent", label: "الحضور اليوم", icon: UserCheck, gradient: "from-success/15 via-success/5 to-transparent", iconBg: "bg-success/15", iconColor: "text-success", ring: "ring-success/10" },
  { key: "todayAbsent", label: "الغياب اليوم", icon: UserX, gradient: "from-destructive/15 via-destructive/5 to-transparent", iconBg: "bg-destructive/15", iconColor: "text-destructive", ring: "ring-destructive/10" },
  { key: "todayLate", label: "المتأخرون", icon: Clock, gradient: "from-warning/15 via-warning/5 to-transparent", iconBg: "bg-warning/15", iconColor: "text-warning", ring: "ring-warning/10" },
  { key: "attendanceRate", label: "نسبة الحضور", icon: TrendingUp, gradient: "from-info/15 via-info/5 to-transparent", iconBg: "bg-info/15", iconColor: "text-info", ring: "ring-info/10", suffix: "%" as const },
] as const;

export default function DashboardStatCards(props: Props) {
  const values: Record<string, number> = {
    totalStudents: props.totalStudents,
    totalClasses: props.totalClasses,
    todayPresent: props.todayPresent,
    todayAbsent: props.todayAbsent,
    todayLate: props.todayLate,
    attendanceRate: props.attendanceRate,
  };

  const animatedValues = {
    totalStudents: useCountUp(props.totalStudents),
    totalClasses: useCountUp(props.totalClasses),
    todayPresent: useCountUp(props.todayPresent),
    todayAbsent: useCountUp(props.todayAbsent),
    todayLate: useCountUp(props.todayLate),
    attendanceRate: useCountUp(props.attendanceRate),
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <Card
          key={stat.key}
          className={cn(
            "relative overflow-hidden border-0 ring-1 shadow-card hover:shadow-card-hover transition-all duration-500 group cursor-default",
            stat.ring,
            "animate-fade-in"
          )}
          style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
        >
          {/* Gradient background */}
          <div className={cn("absolute inset-0 bg-gradient-to-bl opacity-60", stat.gradient)} />
          
          <div className="relative p-4 flex flex-col items-center text-center gap-3">
            <div className={cn(
              "rounded-2xl p-3 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg",
              stat.iconBg
            )}>
              <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
            </div>
            
            <div>
              {props.loading ? (
                <div className="h-8 w-12 mx-auto rounded-lg bg-muted animate-pulse" />
              ) : (
                <p className="text-3xl font-black tabular-nums tracking-tight text-foreground">
                  {animatedValues[stat.key as keyof typeof animatedValues]}
                  {"suffix" in stat && <span className="text-lg font-bold text-muted-foreground mr-0.5">%</span>}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground font-medium mt-1">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
