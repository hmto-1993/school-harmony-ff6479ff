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
        <div className="overflow-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="text-right p-3 font-medium text-muted-foreground text-xs">الشُعبة</th>
                <th className="text-center p-3 font-medium text-muted-foreground text-xs">الطلاب</th>
                <th className="text-center p-3 font-medium text-muted-foreground text-xs">حاضر</th>
                <th className="text-center p-3 font-medium text-muted-foreground text-xs">غائب</th>
                <th className="text-center p-3 font-medium text-muted-foreground text-xs">متأخر</th>
                <th className="text-center p-3 font-medium text-muted-foreground text-xs">الحضور</th>
              </tr>
            </thead>
            <tbody>
              {classStats.map((cls) => {
                const rate = cls.total > 0 ? Math.round((cls.present / cls.total) * 100) : 0;
                return (
                  <tr key={cls.name} className="border-t border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{cls.name}</td>
                    <td className="p-3 text-center text-muted-foreground">{cls.total}</td>
                    <td className="p-3 text-center font-semibold text-success">{cls.present}</td>
                    <td className="p-3 text-center font-semibold text-destructive">{cls.absent}</td>
                    <td className="p-3 text-center font-semibold text-warning">{cls.late}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              rate >= 80 ? "bg-success" : rate >= 50 ? "bg-warning" : "bg-destructive"
                            )}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-xs font-bold tabular-nums",
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
