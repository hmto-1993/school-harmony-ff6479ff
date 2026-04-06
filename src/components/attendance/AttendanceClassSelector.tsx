import { Users, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeeklyProgress } from "@/hooks/useAttendanceData";

interface Props {
  classes: { id: string; name: string }[];
  classesLoading: boolean;
  selectedClass: string;
  onSelectClass: (id: string) => void;
  weeklyProgress: WeeklyProgress;
  weeklyProgressLoaded: boolean;
  overrideLock: boolean;
}

const colorPalette = [
  { gradient: "from-primary/15 to-primary/5", border: "border-primary/40", text: "text-primary", iconBg: "bg-primary/20" },
  { gradient: "from-accent/15 to-accent/5", border: "border-accent/40", text: "text-accent", iconBg: "bg-accent/20" },
  { gradient: "from-success/15 to-success/5", border: "border-success/40", text: "text-success", iconBg: "bg-success/20" },
  { gradient: "from-warning/15 to-warning/5", border: "border-warning/40", text: "text-warning", iconBg: "bg-warning/20" },
  { gradient: "from-info/15 to-info/5", border: "border-info/40", text: "text-info", iconBg: "bg-info/20" },
  { gradient: "from-destructive/15 to-destructive/5", border: "border-destructive/40", text: "text-destructive", iconBg: "bg-destructive/20" },
];

export default function AttendanceClassSelector({
  classes, classesLoading, selectedClass, onSelectClass,
  weeklyProgress, weeklyProgressLoaded, overrideLock,
}: Props) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Users className="h-4 w-4" />
        اختر الفصل
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {classesLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border-2 border-border/30 p-3 text-center animate-pulse">
              <div className="mx-auto w-10 h-10 rounded-lg bg-muted/50 mb-2" />
              <div className="h-4 w-20 mx-auto rounded bg-muted/50 mb-1.5" />
              <div className="h-4 w-10 mx-auto rounded-full bg-muted/40" />
            </div>
          ))
        ) : classes.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-8">لا توجد فصول مسندة إليك</div>
        ) : (
          classes.map((c, index) => {
            const isSelected = selectedClass === c.id;
            const color = colorPalette[index % colorPalette.length];
            const progress = weeklyProgress[c.id];
            const sessions = progress?.sessions ?? 0;
            const limit = progress?.limit ?? 5;
            const isComplete = sessions >= limit;
            return (
              <button
                key={c.id}
                onClick={() => onSelectClass(c.id)}
                className={cn(
                  "relative rounded-xl border-2 p-3 text-center transition-all duration-300 group cursor-pointer animate-fade-in",
                  `bg-gradient-to-br ${color.gradient}`,
                  isSelected
                    ? `${color.border} ring-2 ring-current/10 shadow-lg scale-[1.02]`
                    : "border-border/30 hover:border-border/60 hover:shadow-md hover:scale-[1.01]"
                )}
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
              >
                <div className={cn(
                  "mx-auto w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-all duration-300 group-hover:scale-110",
                  isSelected ? color.iconBg : "bg-muted/50"
                )}>
                  <Users className={cn("h-5 w-5", isSelected ? color.text : "text-muted-foreground")} />
                </div>
                <p className={cn("text-sm font-bold truncate", isSelected ? color.text : "text-foreground")}>{c.name}</p>
                {weeklyProgressLoaded ? (
                  <div className={cn(
                    "mt-1.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                    isComplete && !overrideLock
                      ? "bg-success/15 text-success border-success/30"
                      : isComplete && overrideLock
                      ? "bg-success/15 text-success border-success/30"
                      : "bg-muted/60 text-muted-foreground border-border/40"
                  )}>
                    {isComplete && !overrideLock ? <Lock className="h-2.5 w-2.5" /> : isComplete ? <CheckCircle2 className="h-2.5 w-2.5" /> : null}
                    {sessions}/{limit}
                  </div>
                ) : (
                  <div className="mt-1.5 inline-block h-4 w-10 rounded-full bg-muted/50 animate-pulse" />
                )}
                {isSelected && <div className={cn("absolute top-2 left-2 w-2.5 h-2.5 rounded-full animate-pulse", "bg-primary")} />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
