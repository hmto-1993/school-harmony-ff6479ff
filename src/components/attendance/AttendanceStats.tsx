import { Card } from "@/components/ui/card";
import { Users, UserCheck, UserX, Clock, LogOut, Stethoscope } from "lucide-react";

interface AttendanceStatsProps {
  total: number;
  present: number;
  absent: number;
  late: number;
  earlyLeave: number;
  sickLeave: number;
}

const stats = [
  { key: "total", label: "إجمالي", icon: Users, gradient: "from-primary/10 to-primary/5", iconBg: "bg-primary/15", iconColor: "text-primary" },
  { key: "present", label: "حاضر", icon: UserCheck, gradient: "from-success/10 to-success/5", iconBg: "bg-success/15", iconColor: "text-success" },
  { key: "absent", label: "غائب", icon: UserX, gradient: "from-destructive/10 to-destructive/5", iconBg: "bg-destructive/15", iconColor: "text-destructive" },
  { key: "late", label: "متأخر", icon: Clock, gradient: "from-warning/10 to-warning/5", iconBg: "bg-warning/15", iconColor: "text-warning" },
  { key: "earlyLeave", label: "منصرف", icon: LogOut, gradient: "from-muted-foreground/10 to-muted-foreground/5", iconBg: "bg-muted", iconColor: "text-muted-foreground" },
  { key: "sickLeave", label: "مرضي", icon: Stethoscope, gradient: "from-info/10 to-info/5", iconBg: "bg-info/15", iconColor: "text-info" },
] as const;

export default function AttendanceStats({ total, present, absent, late, earlyLeave, sickLeave }: AttendanceStatsProps) {
  const values: Record<string, number> = { total, present, absent, late, earlyLeave, sickLeave };

  if (total === 0) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {stats.map((s) => (
        <Card
          key={s.key}
          className={`relative overflow-hidden bg-gradient-to-br ${s.gradient} border-0 shadow-sm p-3 text-center transition-transform hover:scale-[1.03]`}
        >
          <div className={`mx-auto w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center mb-1.5`}>
            <s.icon className={`h-4 w-4 ${s.iconColor}`} />
          </div>
          <p className="text-xl font-bold text-foreground">{values[s.key]}</p>
          <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}
