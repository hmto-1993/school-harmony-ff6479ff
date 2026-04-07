import { Card, CardContent } from "@/components/ui/card";
import { Award } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { GradeDistribution } from "@/hooks/useSmartDashboardData";

interface Props {
  gradeDistribution: GradeDistribution[];
}

export default function GradeDistributionCard({ gradeDistribution }: Props) {
  return (
    <Card className="border-0 ring-1 ring-info/15 bg-gradient-to-br from-info/5 via-card to-info/10 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-info to-info/70 shadow-md">
            <Award className="h-4 w-4 text-info-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">توزيع الدرجات</p>
            <p className="text-xs text-muted-foreground">جميع التقييمات</p>
          </div>
        </div>
        {gradeDistribution.length > 0 ? (
          <div className="flex items-center gap-2">
            <div className="h-28 w-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="count"
                    strokeWidth={0}
                  >
                    {gradeDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11, direction: 'rtl' }}
                    formatter={(value: number, _: any, entry: any) => [value, entry.payload.label]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              {gradeDistribution.map((g, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
                  <span className="text-foreground font-medium truncate">{g.label}</span>
                  <span className="text-muted-foreground mr-auto">{g.count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-28 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">لا توجد درجات مسجلة بعد</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
