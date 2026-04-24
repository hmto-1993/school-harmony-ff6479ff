import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, TrendingUp, Users } from "lucide-react";
import type { CategoryMeta, GradeRow } from "@/hooks/useReportSending";

interface Props {
  examCategories: CategoryMeta[];
  rows: GradeRow[];
}

export default function ExamsSummaryPanel({ examCategories, rows }: Props) {
  if (examCategories.length === 0 || rows.length === 0) return null;

  const stats = examCategories.map((cat) => {
    let sum = 0;
    let entered = 0;
    rows.forEach((r) => {
      const score = r.categories[cat.name];
      if (score !== null && score !== undefined) {
        sum += score;
        entered++;
      }
    });
    const avg = entered > 0 ? sum / entered : 0;
    const avgPercent = cat.max_score ? (avg / cat.max_score) * 100 : 0;
    const enteredPct = rows.length > 0 ? (entered / rows.length) * 100 : 0;
    return {
      cat,
      avg: Math.round(avg * 10) / 10,
      avgPercent: Math.round(avgPercent * 10) / 10,
      entered,
      total: rows.length,
      enteredPct: Math.round(enteredPct),
    };
  });

  return (
    <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-success/5 print:hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          ملخص الاختبارات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.cat.id}
              className="rounded-lg bg-card/70 p-3 border border-border/30 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{s.cat.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  من {s.cat.max_score}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
                <span className="text-muted-foreground">المتوسط:</span>
                <span className="font-bold text-foreground">{s.avg}</span>
                <Badge className="bg-success/15 text-success hover:bg-success/20 border-0 mr-auto">
                  {s.avgPercent}%
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">رصد الدرجات:</span>
                <span className="font-bold text-foreground">
                  {s.entered}/{s.total}
                </span>
                <Badge
                  className={`mr-auto border-0 ${
                    s.enteredPct === 100
                      ? "bg-success/15 text-success"
                      : s.enteredPct >= 50
                        ? "bg-warning/15 text-warning"
                        : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {s.enteredPct}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
