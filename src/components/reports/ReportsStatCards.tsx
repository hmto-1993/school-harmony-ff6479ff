import { Card } from "@/components/ui/card";
import { Users, UserCheck, UserX, Clock, GraduationCap, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttendanceRow, GradeRow } from "@/hooks/useReportsData";

interface Props {
  studentsCount: number;
  attendanceData: AttendanceRow[];
  gradeData: GradeRow[];
}

const cardConfig = [
  { key: "students", label: "عدد الطلاب", icon: Users, gradient: "from-primary/15 via-primary/5 to-transparent", iconBg: "bg-primary/15", iconColor: "text-primary", ring: "ring-primary/10" },
  { key: "attendanceRate", label: "نسبة الحضور", icon: TrendingUp, gradient: "from-info/15 via-info/5 to-transparent", iconBg: "bg-info/15", iconColor: "text-info", ring: "ring-info/10", suffix: "%" },
  { key: "present", label: "إجمالي الحاضرين", icon: UserCheck, gradient: "from-success/15 via-success/5 to-transparent", iconBg: "bg-success/15", iconColor: "text-success", ring: "ring-success/10" },
  { key: "absent", label: "إجمالي الغياب", icon: UserX, gradient: "from-destructive/15 via-destructive/5 to-transparent", iconBg: "bg-destructive/15", iconColor: "text-destructive", ring: "ring-destructive/10" },
  { key: "late", label: "إجمالي التأخر", icon: Clock, gradient: "from-warning/15 via-warning/5 to-transparent", iconBg: "bg-warning/15", iconColor: "text-warning", ring: "ring-warning/10" },
  { key: "avgGrade", label: "متوسط الدرجات", icon: GraduationCap, gradient: "from-accent/15 via-accent/5 to-transparent", iconBg: "bg-accent/15", iconColor: "text-accent", ring: "ring-accent/10" },
] as const;

export default function ReportsStatCards({ studentsCount, attendanceData, gradeData }: Props) {
  const total = attendanceData.length;
  const present = attendanceData.filter(r => r.status === "present").length;
  const absent = attendanceData.filter(r => r.status === "absent").length;
  const late = attendanceData.filter(r => r.status === "late").length;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

  const validGrades = gradeData.filter(g => typeof g.total === "number" && !isNaN(g.total));
  const avgGrade = validGrades.length > 0
    ? Math.round((validGrades.reduce((s, g) => s + g.total, 0) / validGrades.length) * 10) / 10
    : 0;

  const values: Record<string, number> = {
    students: studentsCount,
    attendanceRate,
    present,
    absent,
    late,
    avgGrade,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
      {cardConfig.map(stat => (
        <Card
          key={stat.key}
          className={cn(
            "relative overflow-hidden border-0 ring-1 shadow-card hover:shadow-card-hover transition-all duration-200 group cursor-default",
            stat.ring
          )}
        >
          <div className={cn("absolute inset-0 bg-gradient-to-bl opacity-60", stat.gradient)} />
          <div className="relative p-3 flex flex-col items-center text-center gap-2">
            <div className={cn(
              "rounded-2xl p-2.5 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg",
              stat.iconBg
            )}>
              <stat.icon className={cn("h-4 w-4", stat.iconColor)} />
            </div>
            <div>
              <p className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                {values[stat.key]}
                {"suffix" in stat && <span className="text-sm font-bold text-muted-foreground mr-0.5">%</span>}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
