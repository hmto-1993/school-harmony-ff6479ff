import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface GradeRow {
  student_name: string;
  categories: Record<string, number | null>;
  total: number;
}

interface GradesChartProps {
  data: GradeRow[];
  categoryNames: string[];
}

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
];

function isExamName(n: string) {
  const s = (n || "").toLowerCase();
  return n.includes("فترة") || n.includes("عملي") || s.includes("period") || s.includes("practical");
}

export default function GradesChart({ data, categoryNames }: GradesChartProps) {
  const examNames = useMemo(() => categoryNames.filter(isExamName), [categoryNames]);
  const [selected, setSelected] = useState<string>("all");

  if (data.length === 0 || examNames.length === 0) return null;

  const visibleCats = selected === "all" ? examNames : examNames.filter((n) => n === selected);

  const chartData = data.map((row) => {
    const entry: Record<string, any> = { name: row.student_name.split(" ").slice(0, 2).join(" ") };
    visibleCats.forEach((cat) => {
      entry[cat] = row.categories[cat] ?? 0;
    });
    return entry;
  });

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">مقارنة درجات الطلاب (الفترة / العملي)</CardTitle>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-[160px] h-8 text-xs print:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">عرض الكل</SelectItem>
            {examNames.map((n) => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {visibleCats.map((cat, i) => (
              <Bar key={cat} dataKey={cat} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
