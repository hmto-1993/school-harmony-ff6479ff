import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, CalendarDays } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PeriodStats {
  present: number;
  absent: number;
  late: number;
  total: number;
  rate: number;
  behaviorPositive: number;
  behaviorNegative: number;
}

function TrendBadge({ current, previous, label }: { current: number; previous: number; label: string }) {
  const diff = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{current}</p>
      {previous > 0 && (
        <div className={cn("flex items-center gap-1 text-xs font-medium",
          isUp ? "text-success" : isDown ? "text-destructive" : "text-muted-foreground"
        )}>
          {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          <span>{Math.abs(diff)}%</span>
        </div>
      )}
    </div>
  );
}

function RateBadge({ current, previous, label }: { current: number; previous: number; label: string }) {
  const diff = current - previous;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums",
        current >= 80 ? "text-success" : current >= 50 ? "text-warning" : "text-destructive"
      )}>
        {current}%
      </p>
      {previous > 0 && (
        <div className={cn("flex items-center gap-1 text-xs font-medium",
          isUp ? "text-success" : isDown ? "text-destructive" : "text-muted-foreground"
        )}>
          {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          <span>{Math.abs(diff)} نقطة</span>
        </div>
      )}
    </div>
  );
}

async function fetchPeriodData(from: string, to: string, totalStudents: number): Promise<PeriodStats> {
  const [{ data: att }, { data: beh }] = await Promise.all([
    supabase.from("attendance_records").select("status").gte("date", from).lte("date", to),
    supabase.from("behavior_records").select("type").gte("date", from).lte("date", to),
  ]);

  const attendance = att || [];
  const behavior = beh || [];
  const present = attendance.filter((r) => r.status === "present").length;
  const absent = attendance.filter((r) => r.status === "absent").length;
  const late = attendance.filter((r) => r.status === "late").length;

  const days = eachDayOfInterval({ start: new Date(from), end: new Date(to) });
  const workingDays = days.filter(d => d.getDay() !== 5 && d.getDay() !== 6).length;
  const expectedTotal = totalStudents * workingDays;
  const rate = expectedTotal > 0 ? Math.round((present / expectedTotal) * 100) : 0;

  return {
    present, absent, late,
    total: attendance.length,
    rate,
    behaviorPositive: behavior.filter((b) => b.type === "positive").length,
    behaviorNegative: behavior.filter((b) => b.type === "negative").length,
  };
}

function ComparisonGrid({ current, previous }: { current: PeriodStats; previous: PeriodStats }) {
  const chartData = [
    { name: "حاضر", الحالي: current.present, السابق: previous.present },
    { name: "غائب", الحالي: current.absent, السابق: previous.absent },
    { name: "متأخر", الحالي: current.late, السابق: previous.late },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <RateBadge current={current.rate} previous={previous.rate} label="نسبة الحضور" />
        <TrendBadge current={current.present} previous={previous.present} label="حاضر" />
        <TrendBadge current={current.absent} previous={previous.absent} label="غائب" />
        <TrendBadge current={current.late} previous={previous.late} label="متأخر" />
        <TrendBadge current={current.behaviorNegative} previous={previous.behaviorNegative} label="سلوك سلبي" />
      </div>
      {(current.present > 0 || previous.present > 0) && (
        <div className="h-32 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                  fontSize: "11px",
                }}
              />
              <Bar dataKey="الحالي" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} animationDuration={800} />
              <Bar dataKey="السابق" fill="hsl(var(--muted-foreground) / 0.3)" radius={[6, 6, 0, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

async function fetchComparisonData() {
  const { data: students } = await supabase.from("students").select("id");
  const count = students?.length || 0;

  const now = new Date();
  const thisWeekStart = format(startOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd");
  const thisWeekEnd = format(endOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd");
  const lastWeekStart = format(startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 }), "yyyy-MM-dd");
  const lastWeekEnd = format(endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 }), "yyyy-MM-dd");

  const thisMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const thisMonthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const lastMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

  const [wc, wp, mc, mp] = await Promise.all([
    fetchPeriodData(thisWeekStart, thisWeekEnd, count),
    fetchPeriodData(lastWeekStart, lastWeekEnd, count),
    fetchPeriodData(thisMonthStart, thisMonthEnd, count),
    fetchPeriodData(lastMonthStart, lastMonthEnd, count),
  ]);

  return { weekCurrent: wc, weekPrevious: wp, monthCurrent: mc, monthPrevious: mp };
}

export default function PeriodComparison() {
  const { data, isLoading } = useQuery({
    queryKey: ["period-comparison", format(new Date(), "yyyy-MM-dd")],
    queryFn: fetchComparisonData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (isLoading || !data) {
    return (
      <Card className="shadow-card h-full">
        <CardHeader className="pb-2">
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-32 rounded-xl bg-muted/50 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const { weekCurrent, weekPrevious, monthCurrent, monthPrevious } = data;

  return (
    <Card className="shadow-card h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/10">
            <CalendarDays className="h-4 w-4 text-accent" />
          </div>
          مقارنة الحضور
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weekly" dir="rtl">
          <TabsList className="mb-4">
            <TabsTrigger value="weekly" className="gap-1.5"><CalendarDays className="h-4 w-4" />أسبوعية</TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1.5"><CalendarDays className="h-4 w-4" />شهرية</TabsTrigger>
          </TabsList>
          <TabsContent value="weekly">
            <p className="text-xs text-muted-foreground mb-3">هذا الأسبوع مقابل الأسبوع الماضي</p>
            <ComparisonGrid current={weekCurrent} previous={weekPrevious} />
          </TabsContent>
          <TabsContent value="monthly">
            <p className="text-xs text-muted-foreground mb-3">هذا الشهر مقابل الشهر الماضي</p>
            <ComparisonGrid current={monthCurrent} previous={monthPrevious} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
