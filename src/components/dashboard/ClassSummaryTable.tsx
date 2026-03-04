import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassStats {
  name: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface Props {
  classStats: ClassStats[];
}

export default function ClassSummaryTable({ classStats }: Props) {
  if (classStats.length === 0) return null;

  return (
    <Card className="shadow-card border-border/50 h-full animate-fade-in" style={{ animationDelay: "600ms", animationFillMode: "both" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          ملخص الشُعب
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-xl border border-border/40 shadow-sm">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-gradient-to-l from-primary/8 to-primary/4 dark:from-primary/15 dark:to-primary/8">
                <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">الشُعبة</th>
                <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الطلاب</th>
                <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 bg-success/5 dark:bg-success/10">حاضر</th>
                <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 bg-destructive/5 dark:bg-destructive/10">غائب</th>
                <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 bg-warning/5 dark:bg-warning/10">متأخر</th>
                <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl">الحضور</th>
              </tr>
            </thead>
            <tbody>
              {classStats.map((cls, idx) => {
                const rate = cls.total > 0 ? Math.round((cls.present / cls.total) * 100) : 0;
                const isEven = idx % 2 === 0;
                const isLast = idx === classStats.length - 1;
                return (
                  <tr
                    key={cls.name}
                    className={cn(
                      isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                      !isLast && "border-b border-border/20"
                    )}
                  >
                    <td className={cn("p-3 font-semibold border-l border-border/10", isLast && "first:rounded-br-xl")}>{cls.name}</td>
                    <td className="p-3 text-center text-muted-foreground font-medium border-l border-border/10">{cls.total}</td>
                    <td className="p-3 text-center font-bold text-success bg-success/[0.03] dark:bg-success/[0.06] border-l border-border/10">{cls.present}</td>
                    <td className="p-3 text-center font-bold text-destructive bg-destructive/[0.03] dark:bg-destructive/[0.06] border-l border-border/10">{cls.absent}</td>
                    <td className="p-3 text-center font-bold text-warning bg-warning/[0.03] dark:bg-warning/[0.06] border-l border-border/10">{cls.late}</td>
                    <td className={cn("p-3 text-center", isLast && "last:rounded-bl-xl")}>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-muted/80 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              rate >= 80 ? "bg-success" : rate >= 50 ? "bg-warning" : "bg-destructive"
                            )}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-xs font-bold tabular-nums min-w-[32px]",
                          rate >= 80 ? "text-success" : rate >= 50 ? "text-warning" : "text-destructive"
                        )}>
                          {rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
