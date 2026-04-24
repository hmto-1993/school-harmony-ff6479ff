import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import type { CategoryMeta, GradeRow } from "@/hooks/useReportSending";
import { distributionByLevel } from "./grades-helpers";

interface Props {
  rows: GradeRow[];
  categories: CategoryMeta[];
}

export default function LevelsReport({ rows, categories }: Props) {
  const dist = distributionByLevel(rows, categories);
  const total = rows.length || 1;

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          تقرير تصنيف المستويات ({rows.length} طالب)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {dist.map((b) => (
            <div
              key={b.key}
              className="rounded-lg border border-border/40 p-3 text-center bg-card/60"
              style={{ borderColor: b.color }}
            >
              <div className="text-2xl font-bold" style={{ color: b.color }}>{b.count}</div>
              <div className="text-xs text-muted-foreground mt-1">{b.label}</div>
              <div className="text-[10px] text-muted-foreground">{((b.count / total) * 100).toFixed(0)}%</div>
              <Badge variant="outline" className="mt-1 text-[10px]">
                {b.min}%+
              </Badge>
            </div>
          ))}
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer>
            <BarChart data={dist} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8, fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {dist.map((b) => (<Cell key={b.key} fill={b.color} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
