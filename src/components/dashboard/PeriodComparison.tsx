import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, CalendarDays } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, eachDayOfInterval } from "date-fns";

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
    <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{current}</p>
      {previous > 0 && (
        <div className={`flex items-center gap-1 text-xs font-medium ${
          isUp ? "text-green-600" : isDown ? "text-destructive" : "text-muted-foreground"
        }`}>
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
    <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${current >= 80 ? "text-green-600" : current >= 50 ? "text-yellow-600" : "text-destructive"}`}>
        {current}%
      </p>
      {previous > 0 && (
        <div className={`flex items-center gap-1 text-xs font-medium ${
          isUp ? "text-green-600" : isDown ? "text-destructive" : "text-muted-foreground"
        }`}>
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
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <RateBadge current={current.rate} previous={previous.rate} label="نسبة الحضور" />
      <TrendBadge current={current.present} previous={previous.present} label="حاضر" />
      <TrendBadge current={current.absent} previous={previous.absent} label="غائب" />
      <TrendBadge current={current.late} previous={previous.late} label="متأخر" />
      <TrendBadge current={current.behaviorNegative} previous={previous.behaviorNegative} label="سلوك سلبي" />
    </div>
  );
}

export default function PeriodComparison() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [weekCurrent, setWeekCurrent] = useState<PeriodStats | null>(null);
  const [weekPrevious, setWeekPrevious] = useState<PeriodStats | null>(null);
  const [monthCurrent, setMonthCurrent] = useState<PeriodStats | null>(null);
  const [monthPrevious, setMonthPrevious] = useState<PeriodStats | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: students } = await supabase.from("students").select("id");
    const count = students?.length || 0;
    setTotalStudents(count);

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

    setWeekCurrent(wc);
    setWeekPrevious(wp);
    setMonthCurrent(mc);
    setMonthPrevious(mp);
  };

  if (!weekCurrent || !monthCurrent) return null;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
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
            <ComparisonGrid current={weekCurrent} previous={weekPrevious!} />
          </TabsContent>
          <TabsContent value="monthly">
            <p className="text-xs text-muted-foreground mb-3">هذا الشهر مقابل الشهر الماضي</p>
            <ComparisonGrid current={monthCurrent} previous={monthPrevious!} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
