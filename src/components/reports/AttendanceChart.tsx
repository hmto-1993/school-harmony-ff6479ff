import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Sector } from "recharts";

interface AttendanceChartProps {
  data: { status: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  present:    { label: "حاضر",        color: "hsl(152, 69%, 45%)" },
  absent:     { label: "غائب",        color: "hsl(0, 72%, 58%)" },
  late:       { label: "متأخر",       color: "hsl(43, 96%, 52%)" },
  early_leave:{ label: "خروج مبكر",   color: "hsl(210, 78%, 55%)" },
  sick_leave: { label: "إجازة مرضية", color: "hsl(280, 60%, 58%)" },
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="currentColor" className="text-foreground text-lg font-bold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="currentColor" className="text-muted-foreground text-sm">
        {value} ({(percent * 100).toFixed(0)}%)
      </text>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.85}
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

export default function AttendanceChart({ data }: AttendanceChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_CONFIG[status]?.label || status,
      value,
      color: STATUS_CONFIG[status]?.color || "hsl(220, 14%, 55%)",
    }));
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">توزيع الحضور</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
              onMouseEnter={onPieEnter}
              strokeWidth={0}
              animationBegin={200}
              animationDuration={700}
              animationEasing="ease-out"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend
              wrapperStyle={{ paddingTop: "16px" }}
              formatter={(value: string) => <span className="text-xs text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
