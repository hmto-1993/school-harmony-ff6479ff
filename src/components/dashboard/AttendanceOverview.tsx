import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, Legend } from "recharts";
import { ClipboardCheck, BarChart3 } from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ClassStats {
  name: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface Props {
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  todayNotRecorded: number;
  classStats: ClassStats[];
}

const PIE_COLORS = [
  "hsl(152, 69%, 45%)",
  "hsl(0, 72%, 58%)",
  "hsl(43, 96%, 52%)",
  "hsl(220, 14%, 55%)",
];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 8} dy={0} textAnchor="middle" fill="currentColor" className="text-foreground text-sm font-bold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 14} dy={0} textAnchor="middle" fill="currentColor" className="text-muted-foreground text-xs">
        {value} ({(percent * 100).toFixed(0)}%)
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.9} />
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
};

export default function AttendanceOverview({ todayPresent, todayAbsent, todayLate, todayNotRecorded, classStats }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const pieData = [
    { name: "حاضر", value: todayPresent },
    { name: "غائب", value: todayAbsent },
    { name: "متأخر", value: todayLate },
    { name: "لم يُسجَّل", value: todayNotRecorded },
  ].filter((d) => d.value > 0);

  return (
    <Card className="shadow-card border-border/50 h-full">
      <CardHeader className="pb-1 px-4 pt-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="p-1 rounded-lg bg-primary/10">
            <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
          </div>
          الحضور وملخص الفصول
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Tabs defaultValue="chart" dir="rtl">
          <TabsList className="grid grid-cols-2 w-full mb-2 h-8">
            <TabsTrigger value="chart" className="text-[11px] gap-1 h-7">
              <ClipboardCheck className="h-3 w-3" />
              توزيع الحضور
            </TabsTrigger>
            <TabsTrigger value="classes" className="text-[11px] gap-1 h-7">
              <BarChart3 className="h-3 w-3" />
              ملخص الفصول
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    strokeWidth={0}
                    animationBegin={300}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} className="transition-opacity duration-200" />
                    ))}
                  </Pie>
                  <Legend formatter={(value: string) => <span className="text-[10px] text-foreground">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-xs text-muted-foreground">لا توجد بيانات حضور اليوم</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="classes">
            {classStats.length > 0 ? (
              <div className="overflow-auto rounded-xl border border-border/40 shadow-sm max-h-[200px]">
                <table className="w-full text-xs border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-l from-primary/8 to-primary/4 dark:from-primary/15 dark:to-primary/8">
                      <th className="text-right p-2 font-semibold text-primary text-[11px] border-b-2 border-primary/20 first:rounded-tr-xl">الفصل</th>
                      <th className="text-center p-2 font-semibold text-primary text-[11px] border-b-2 border-primary/20">الطلاب</th>
                      <th className="text-center p-2 font-semibold text-primary text-[11px] border-b-2 border-primary/20 bg-success/5">حاضر</th>
                      <th className="text-center p-2 font-semibold text-primary text-[11px] border-b-2 border-primary/20 bg-destructive/5">غائب</th>
                      <th className="text-center p-2 font-semibold text-primary text-[11px] border-b-2 border-primary/20 bg-warning/5">متأخر</th>
                      <th className="text-center p-2 font-semibold text-primary text-[11px] border-b-2 border-primary/20 last:rounded-tl-xl">%</th>
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
                          <td className={cn("p-2 font-semibold border-l border-border/10 text-[11px]", isLast && "first:rounded-br-xl")}>{cls.name}</td>
                          <td className="p-2 text-center text-muted-foreground font-medium border-l border-border/10">{cls.total}</td>
                          <td className="p-2 text-center font-bold text-success bg-success/[0.03] border-l border-border/10">{cls.present}</td>
                          <td className="p-2 text-center font-bold text-destructive bg-destructive/[0.03] border-l border-border/10">{cls.absent}</td>
                          <td className="p-2 text-center font-bold text-warning bg-warning/[0.03] border-l border-border/10">{cls.late}</td>
                          <td className={cn("p-2 text-center", isLast && "last:rounded-bl-xl")}>
                            <span className={cn(
                              "text-[11px] font-bold tabular-nums",
                              rate >= 80 ? "text-success" : rate >= 50 ? "text-warning" : "text-destructive"
                            )}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-xs text-muted-foreground">لا توجد بيانات فصول</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
