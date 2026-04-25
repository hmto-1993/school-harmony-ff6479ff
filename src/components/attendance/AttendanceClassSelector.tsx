import { Users, Lock, CheckCircle2, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export default function AttendanceClassSelector({
  classes, classesLoading, selectedClass, onSelectClass,
  weeklyProgress, weeklyProgressLoaded, overrideLock,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        <span>اختر الفصل لبدء التحضير</span>
      </div>

      {classesLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">لا توجد فصول مسندة إليك</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {classes.map((cls) => {
            const isActive = selectedClass === cls.id;
            const progress = weeklyProgress[cls.id];
            const sessions = progress?.sessions ?? 0;
            const limit = progress?.limit ?? 5;
            const isComplete = sessions >= limit;
            return (
              <button
                key={cls.id}
                onClick={() => onSelectClass(cls.id)}
                className={cn(
                  "group relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-right transition-all duration-200",
                  "backdrop-blur-md shadow-sm hover:scale-[1.02] hover:shadow-md",
                  isActive
                    ? "border-primary bg-gradient-to-br from-primary/15 to-accent/10 shadow-primary/20"
                    : "border-border/40 bg-background/60 hover:border-primary/40 hover:bg-background/80"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  )}>
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <span className={cn(
                    "font-bold text-sm truncate",
                    isActive ? "text-primary" : "text-foreground"
                  )}>
                    {cls.name}
                  </span>
                </div>
                {weeklyProgressLoaded ? (
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className={cn(
                      "h-5 px-1.5 text-[10px] font-bold shrink-0 gap-0.5",
                      isComplete && !overrideLock && "bg-success/15 text-success hover:bg-success/20",
                      isComplete && overrideLock && "bg-success/15 text-success hover:bg-success/20",
                      isActive && !isComplete && "bg-primary/90 text-primary-foreground"
                    )}
                  >
                    {isComplete && !overrideLock ? <Lock className="h-2.5 w-2.5" /> : isComplete ? <CheckCircle2 className="h-2.5 w-2.5" /> : null}
                    {sessions}/{limit}
                  </Badge>
                ) : (
                  <div className="h-5 w-10 rounded-full bg-muted/50 animate-pulse shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
