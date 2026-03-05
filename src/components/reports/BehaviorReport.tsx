import { useState } from "react";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { BarChart3, Heart } from "lucide-react";
import ReportExportDialog from "@/components/reports/ReportExportDialog";

interface BehaviorRow {
  student_name: string;
  date: string;
  type: string;
  note: string | null;
}

interface BehaviorReportProps {
  selectedClass: string;
  dateFrom: string;
  dateTo: string;
  selectedStudent: string;
}

const TYPE_LABELS: Record<string, string> = {
  positive: "إيجابي",
  negative: "سلبي",
  neutral: "محايد",
};

const TYPE_COLORS: Record<string, string> = {
  positive: "hsl(142, 71%, 45%)",
  negative: "hsl(0, 84%, 60%)",
  neutral: "hsl(45, 93%, 47%)",
};

export default function BehaviorReport({ selectedClass, dateFrom, dateTo, selectedStudent }: BehaviorReportProps) {
  const [data, setData] = useState<BehaviorRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBehavior = async () => {
    if (!selectedClass) return;
    setLoading(true);
    let query = supabase
      .from("behavior_records")
      .select("type, note, date, student_id, students(full_name)")
      .eq("class_id", selectedClass)
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: false });

    if (selectedStudent !== "all") {
      query = query.eq("student_id", selectedStudent);
    }

    const { data: records, error } = await query;

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setData(
        (records || []).map((r: any) => ({
          student_name: r.students?.full_name || "—",
          date: r.date,
          type: r.type,
          note: r.note,
        }))
      );
    }
    setLoading(false);
  };

  // Summary counts
  const positive = data.filter((r) => r.type === "positive").length;
  const negative = data.filter((r) => r.type === "negative").length;
  const neutral = data.filter((r) => r.type === "neutral").length;

  // Pie chart data
  const pieData = [
    { name: "إيجابي", value: positive },
    { name: "سلبي", value: negative },
    { name: "محايد", value: neutral },
  ].filter((d) => d.value > 0);

  // Per-student bar chart
  const studentMap: Record<string, { positive: number; negative: number; neutral: number }> = {};
  data.forEach((r) => {
    if (!studentMap[r.student_name]) studentMap[r.student_name] = { positive: 0, negative: 0, neutral: 0 };
    if (r.type in studentMap[r.student_name]) {
      studentMap[r.student_name][r.type as "positive" | "negative" | "neutral"]++;
    }
  });
  const barData = Object.entries(studentMap).map(([name, counts]) => ({
    name: name.split(" ").slice(0, 2).join(" "),
    إيجابي: counts.positive,
    سلبي: counts.negative,
    محايد: counts.neutral,
  }));

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(
      data.map((r) => ({
        "اسم الطالب": r.student_name,
        التاريخ: r.date,
        النوع: TYPE_LABELS[r.type] || r.type,
        ملاحظات: r.note || "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير السلوك");
    XLSX.writeFile(wb, `تقرير_السلوك_${dateFrom}_${dateTo}.xlsx`);
  };

  const exportPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFont("helvetica");
    doc.setFontSize(16);
    doc.text("Behavior Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`From: ${dateFrom}  To: ${dateTo}`, 14, 28);

    (doc as any).autoTable({
      startY: 35,
      head: [["Student", "Date", "Type", "Notes"]],
      body: data.map((r) => [r.student_name, r.date, TYPE_LABELS[r.type] || r.type, r.note || ""]),
      styles: { fontSize: 9, halign: "left" },
      headStyles: { fillColor: [30, 64, 175] },
    });
    doc.save(`behavior_${dateFrom}_${dateTo}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        <Button onClick={fetchBehavior} disabled={loading || !selectedClass}>
          <BarChart3 className="h-4 w-4 ml-1.5" />
          {loading ? "جارٍ التحميل..." : "عرض التقرير"}
        </Button>
      {data.length > 0 && (
            <ReportExportDialog
              title="تصدير تقرير السلوك"
              onExportExcel={exportExcel}
              onExportPDF={exportPDF}
            />
        )}
      </div>

      {data.length > 0 && (
        <div className="print-area space-y-4">
          <ReportPrintHeader reportType="behavior" />
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{data.length}</p>
                <p className="text-xs text-muted-foreground">إجمالي السجلات</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: TYPE_COLORS.positive }}>{positive}</p>
                <p className="text-xs text-muted-foreground">إيجابي</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: TYPE_COLORS.negative }}>{negative}</p>
                <p className="text-xs text-muted-foreground">سلبي</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: TYPE_COLORS.neutral }}>{neutral}</p>
                <p className="text-xs text-muted-foreground">محايد</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">توزيع السلوك</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name === "إيجابي" ? TYPE_COLORS.positive :
                            entry.name === "سلبي" ? TYPE_COLORS.negative :
                            TYPE_COLORS.neutral
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart per student */}
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">السلوك حسب الطالب</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="إيجابي" fill={TYPE_COLORS.positive} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="سلبي" fill={TYPE_COLORS.negative} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="محايد" fill={TYPE_COLORS.neutral} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          <Card className="shadow-card">
            <CardContent className="pt-4">
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">اسم الطالب</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.student_name}</TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.type === "positive" ? "default" :
                              row.type === "negative" ? "destructive" : "secondary"
                            }
                          >
                            {TYPE_LABELS[row.type] || row.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{row.note || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && data.length === 0 && (
        <Card className="print:hidden">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Heart className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">اختر الفصل والتواريخ ثم اضغط "عرض التقرير"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
