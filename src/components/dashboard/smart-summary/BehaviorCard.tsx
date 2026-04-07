import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BehaviorSummary } from "@/hooks/useSmartDashboardData";

interface Props {
  behaviorSummary: BehaviorSummary;
}

export default function BehaviorCard({ behaviorSummary }: Props) {
  return (
    <Card className="border-0 ring-1 ring-success/15 bg-gradient-to-br from-success/5 via-card to-success/10 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-success to-success/70 shadow-md">
              <ThumbsUp className="h-4 w-4 text-success-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">السلوك</p>
              <p className="text-xs text-muted-foreground">آخر 7 أيام</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <Badge className="bg-success/15 text-success border-0 gap-1">
              <ThumbsUp className="h-3 w-3" />{behaviorSummary.positive}
            </Badge>
            <Badge className="bg-destructive/15 text-destructive border-0 gap-1">
              <ThumbsDown className="h-3 w-3" />{behaviorSummary.negative}
            </Badge>
          </div>
        </div>
        <div className="h-28 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={behaviorSummary.recentTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11, direction: 'rtl' }}
              />
              <Bar dataKey="positive" name="إيجابي" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="negative" name="سلبي" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
