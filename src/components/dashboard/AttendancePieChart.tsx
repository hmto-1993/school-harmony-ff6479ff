import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from "recharts";
import { ClipboardCheck } from "lucide-react";
import { useState, useCallback } from "react";

interface Props {
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  todayNotRecorded: number;
}

const PIE_COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(0, 84%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(220, 9%, 70%)",
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
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.9}
      />
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

export default function AttendancePieChart({ todayPresent, todayAbsent, todayLate, todayNotRecorded }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const data = [
    { name: "حاضر", value: todayPresent },
    { name: "غائب", value: todayAbsent },
    { name: "متأخر", value: todayLate },
    { name: "لم يُسجَّل", value: todayNotRecorded },
  ].filter((d) => d.value > 0);

  return (
    <Card className="shadow-card border-border/50 h-full animate-fade-in" style={{ animationDelay: "500ms", animationFillMode: "both" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </div>
          توزيع الحضور اليوم
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                onMouseEnter={onPieEnter}
                strokeWidth={0}
                animationBegin={300}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} className="transition-opacity duration-200" />
                ))}
              </Pie>
              <Legend
                formatter={(value: string) => <span className="text-xs text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[280px]">
            <p className="text-sm text-muted-foreground">لا توجد بيانات حضور اليوم</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
