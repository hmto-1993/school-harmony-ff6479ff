import { Card } from "@/components/ui/card";
import { Users, UserCheck, UserX, Clock, LogOut, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "present" | "absent" | "late" | "early_leave" | "sick_leave";

interface AttendanceStatsProps {
  total: number;
  present: number;
  absent: number;
  late: number;
  earlyLeave: number;
  sickLeave: number;
  activeFilter?: StatusFilter;
  onFilterChange?: (filter: StatusFilter) => void;
}

const stats = [
  { key: "total", label: "إجمالي", icon: Users, gradient: "from-primary/5 via-card to-primary/10", iconBg: "bg-gradient-to-br from-primary to-primary/70", iconColor: "text-primary-foreground", ring: "ring-primary/10" },
  { key: "present", label: "حاضر", icon: UserCheck, gradient: "from-success/5 via-card to-success/10", iconBg: "bg-gradient-to-br from-success to-success/70", iconColor: "text-primary-foreground", ring: "ring-success/10" },
  { key: "absent", label: "غائب", icon: UserX, gradient: "from-destructive/5 via-card to-destructive/10", iconBg: "bg-gradient-to-br from-destructive to-destructive/70", iconColor: "text-primary-foreground", ring: "ring-destructive/10" },
  { key: "late", label: "متأخر", icon: Clock, gradient: "from-warning/5 via-card to-warning/10", iconBg: "bg-gradient-to-br from-warning to-warning/70", iconColor: "text-primary-foreground", ring: "ring-warning/10" },
  { key: "earlyLeave", label: "منصرف", icon: LogOut, gradient: "from-muted-foreground/5 via-card to-muted-foreground/10", iconBg: "bg-gradient-to-br from-muted-foreground to-muted-foreground/70", iconColor: "text-primary-foreground", ring: "ring-muted-foreground/10" },
  { key: "sickLeave", label: "مرضي", icon: Stethoscope, gradient: "from-info/5 via-card to-info/10", iconBg: "bg-gradient-to-br from-info to-info/70", iconColor: "text-primary-foreground", ring: "ring-info/10" },
] as const;

const filterKeyMap: Record<string, StatusFilter> = {
  total: "all",
  present: "present",
  absent: "absent",
  late: "late",
  earlyLeave: "early_leave",
  sickLeave: "sick_leave",
};

export default function AttendanceStats({ total, present, absent, late, earlyLeave, sickLeave, activeFilter = "all", onFilterChange }: AttendanceStatsProps) {
  const values: Record<string, number> = { total, present, absent, late, earlyLeave, sickLeave };

  if (total === 0) return null;

  const hasRecords = present > 0 || absent > 0 || late > 0 || earlyLeave > 0 || sickLeave > 0;

  const handleClick = (key: string) => {
    if (!onFilterChange || !hasRecords) return;
    // Don't switch to a status that has 0 students (except "all")
    if (key !== "total" && values[key] === 0) return;
    const filterVal = filterKeyMap[key];
    onFilterChange(activeFilter === filterVal && filterVal !== "all" ? "all" : filterVal);
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {stats.map((s, index) => {
        const filterVal = filterKeyMap[s.key];
        const isActive = activeFilter === filterVal || (activeFilter === "all" && s.key === "total");
        return (
          <Card
            key={s.key}
            onClick={() => handleClick(s.key)}
            className={cn(
              "relative overflow-hidden border-0 ring-1 shadow-lg p-3 text-center transition-all duration-500 group animate-fade-in",
              onFilterChange && hasRecords && (s.key === "total" || values[s.key] > 0) ? "cursor-pointer hover:scale-105" : "cursor-default opacity-60",
              `bg-gradient-to-br ${s.gradient}`,
              s.ring,
              isActive && onFilterChange && hasRecords && "ring-2 shadow-xl scale-[1.03]"
            )}
            style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
          >
            <div className={cn(
              "mx-auto w-9 h-9 rounded-xl flex items-center justify-center mb-2 shadow-md transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg",
              s.iconBg
            )}>
              <s.icon className={cn("h-4 w-4", s.iconColor)} />
            </div>
            <p className="text-2xl font-black text-foreground tabular-nums">{values[s.key]}</p>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
          </Card>
        );
      })}
    </div>
  );
}
