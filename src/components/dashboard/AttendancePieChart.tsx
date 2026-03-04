import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ClipboardCheck } from "lucide-react";

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

export default function AttendancePieChart({ todayPresent, todayAbsent, todayLate, todayNotRecorded }: Props) {
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
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                  fontSize: "13px",
                }}
              />
              <Legend />
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
