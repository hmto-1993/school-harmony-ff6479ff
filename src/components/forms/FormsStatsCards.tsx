import { Card } from "@/components/ui/card";
import { FileText, Award, Moon, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Stats } from "@/hooks/useFormsPageData";

interface Props {
  stats: Stats;
}

const statCardConfig = [
  { key: "totalForms", label: "النماذج الصادرة", icon: FileText, gradient: "from-primary/15 via-primary/5 to-transparent", iconBg: "bg-primary/15", iconColor: "text-primary", ring: "ring-primary/10" },
  { key: "excellentStudents", label: "الطلاب المتميزون", icon: Award, gradient: "from-warning/15 via-warning/5 to-transparent", iconBg: "bg-warning/15", iconColor: "text-warning", ring: "ring-warning/10" },
  { key: "sleepCases", label: "حالات النوم", icon: Moon, gradient: "from-info/15 via-info/5 to-transparent", iconBg: "bg-info/15", iconColor: "text-info", ring: "ring-info/10" },
  { key: "disciplineRate", label: "نسبة الانضباط", icon: ShieldCheck, gradient: "from-success/15 via-success/5 to-transparent", iconBg: "bg-success/15", iconColor: "text-success", ring: "ring-success/10", suffix: "%" },
] as const;

export default function FormsStatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statCardConfig.map(stat => {
        const value = stat.key === "disciplineRate" ? `${stats[stat.key]}%` : stats[stat.key];
        return (
          <Card key={stat.key} className={cn("relative overflow-hidden border-0 ring-1 shadow-card p-3 flex items-center gap-3", stat.ring)}>
            <div className={cn("absolute inset-0 bg-gradient-to-bl opacity-60", stat.gradient)} />
            <div className={cn("relative rounded-xl p-2.5", stat.iconBg)}>
              <stat.icon className={cn("h-4 w-4", stat.iconColor)} />
            </div>
            <div className="relative">
              <p className="text-xl font-black tabular-nums text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
