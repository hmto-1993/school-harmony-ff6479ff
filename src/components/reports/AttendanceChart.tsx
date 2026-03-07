import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface AttendanceChartProps {
  data: { status: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  early_leave: "خروج مبكر",
  sick_leave: "إجازة مرضية",
};

const COLORS = [
  "hsl(142, 71%, 45%)",  // present - green
  "hsl(0, 84%, 60%)",    // absent - red
  "hsl(45, 93%, 47%)",   // late - yellow
  "hsl(200, 80%, 50%)",  // early_leave - blue
  "hsl(270, 60%, 55%)",  // sick_leave - purple
];

export default function AttendanceChart({ data }: AttendanceChartProps) {
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      value,
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
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent, x, y, midAngle }) => {
                const RADIAN = Math.PI / 180;
                const radius = 115;
                const cx2 = 0;
                const cy2 = 0;
                const labelX = x + Math.cos(-midAngle * RADIAN) * 15;
                const labelY = y + Math.sin(-midAngle * RADIAN) * 15;
                return (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor={labelX > (x - 10) ? "start" : "end"}
                    dominantBaseline="central"
                    fontSize={12}
                    fill="currentColor"
                  >
                    {`${name} ${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
              labelLine={{ stroke: "currentColor", strokeWidth: 1 }}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ paddingTop: "12px" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
