import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyAttendance } from "@/hooks/useSmartDashboardData";

interface Props {
  dailyAttendance: DailyAttendance[];
  avgRate: number;
  trendDir: string;
}

export default function AttendanceTrendCard({ dailyAttendance, avgRate, trendDir }: Props) {
  return (
    <Card className="border-0 ring-1 ring-primary/15 bg-gradient-to-br from-primary/5 via-card to-primary/10 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">اتجاه الحضور</p>
              <p className="text-xs text-muted-foreground">آخر 7 أيام</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {trendDir === "up" && <TrendingUp className="h-4 w-4 text-success" />}
            {trendDir === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
            {trendDir === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
            <span className={cn("text-lg font-black", trendDir === "up" ? "text-success" : trendDir === "down" ? "text-destructive" : "text-foreground")}>
              {avgRate}%
            </span>
          </div>
        </div>
        <div className="h-28 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyAttendance} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, direction: 'rtl' }}
                formatter={(value: number) => [`${value}%`, 'نسبة الحضور']}
              />
              <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#attendGrad)" dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
