import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, MessageCircle, AlertTriangle, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";

interface ViolationsReportTabProps {
  selectedClass: string;
  dateFrom: string;
  dateTo: string;
  selectedStudent: string;
}

interface ViolationRecord {
  student_name: string;
  student_id: string;
  date: string;
  category_name: string;
  score: number;
  note: string | null;
}

export default function ViolationsReportTab({ selectedClass, dateFrom, dateTo, selectedStudent }: ViolationsReportTabProps) {
  const [data, setData] = useState<ViolationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

  const fetchViolations = async () => {
    if (!selectedClass) return;
    setLoading(true);

    // 1. Get deduction categories for this class
    const { data: cats } = await supabase
      .from("grade_categories")
      .select("id, name")
      .eq("is_deduction", true)
      .or(`class_id.eq.${selectedClass},class_id.is.null`);

    if (!cats || cats.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    const catIds = cats.map(c => c.id);
    const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]));

    // 2. Get grades for those categories within date range
    let query = supabase
      .from("grades")
      .select("student_id, date, category_id, score, note, students(full_name)")
      .in("category_id", catIds)
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .not("score", "is", null)
      .gt("score", 0)
      .order("date", { ascending: false });

    if (selectedStudent !== "all") {
      query = query.eq("student_id", selectedStudent);
    }

    // Filter by class via students table
    const { data: studentsInClass } = await supabase
      .from("students")
      .select("id")
      .eq("class_id", selectedClass);

    const studentIdsInClass = (studentsInClass || []).map(s => s.id);
    if (studentIdsInClass.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    query = query.in("student_id", studentIdsInClass);

    const { data: grades, error } = await query;
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      setData([]);
    } else {
      setData((grades || []).map((g: any) => ({
        student_name: g.students?.full_name || "—",
        student_id: g.student_id,
        date: g.date,
        category_name: catMap[g.category_id] || "—",
        score: g.score,
        note: g.note || "",
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedClass && dateFrom && dateTo) fetchViolations();
  }, [selectedClass, dateFrom, dateTo, selectedStudent]);

  // Group by date for daily view
  const dailyGroups = useMemo(() => {
    const groups: Record<string, ViolationRecord[]> = {};
    data.forEach(r => {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  // Group by week for weekly view
  const weeklyGroups = useMemo(() => {
    const groups: Record<string, ViolationRecord[]> = {};
    data.forEach(r => {
      const d = new Date(r.date);
      const weekStart = format(startOfWeek(d, { weekStartsOn: 0 }), "yyyy-MM-dd");
      const weekEnd = format(endOfWeek(d, { weekStartsOn: 0 }), "yyyy-MM-dd");
      const key = `${weekStart}_${weekEnd}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  // Student summary for the selected view
  const studentSummary = useMemo(() => {
    const map: Record<string, { name: string; count: number; categories: Record<string, number> }> = {};
    data.forEach(r => {
      if (!map[r.student_id]) map[r.student_id] = { name: r.student_name, count: 0, categories: {} };
      map[r.student_id].count++;
      map[r.student_id].categories[r.category_name] = (map[r.student_id].categories[r.category_name] || 0) + 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [data]);

  const activeGroups = viewMode === "daily" ? dailyGroups : weeklyGroups;

  const buildTableHTML = (records: ViolationRecord[]) => {
    const rows = records.map((r, i) =>
      `<tr><td>${i + 1}</td><td>${r.student_name}</td><td>${r.date}</td><td>${r.category_name}</td><td>${r.note || "—"}</td></tr>`
    ).join("");
    return `<table><thead><tr><th style="width:30px">#</th><th style="text-align:right">الطالب</th><th>التاريخ</th><th>نوع المخالفة</th><th>ملاحظات</th></tr></thead><tbody>${rows}</tbody></table>`;
  };

  const handleExportPDF = async () => {
    if (data.length === 0) {
      toast({ title: "لا توجد مخالفات", description: "لا يوجد بيانات للتصدير" });
      return;
    }
    try {
      const { exportGradesTableAsPDF } = await import("@/lib/grades-print");
      const label = viewMode === "daily" ? "يومي" : "أسبوعي";
      await exportGradesTableAsPDF({
        orientation: "portrait",
        title: `تقرير المخالفات — ${label}`,
        subtitle: `من ${dateFrom} إلى ${dateTo}`,
        reportType: "violations",
        tableHTML: buildTableHTML(data),
        fileName: `violations_report_${dateFrom}_${dateTo}`,
      });
      toast({ title: "تم التصدير", description: "تم تصدير ملف PDF بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل تصدير PDF", variant: "destructive" });
    }
  };

  const handleShareWhatsApp = async () => {
    if (data.length === 0) {
      toast({ title: "لا توجد مخالفات", description: "لا يوجد بيانات للمشاركة" });
      return;
    }
    try {
      const { exportGradesTableAsPDF } = await import("@/lib/grades-print");
      const label = viewMode === "daily" ? "يومي" : "أسبوعي";
      const blob = await exportGradesTableAsPDF({
        orientation: "portrait",
        title: `تقرير المخالفات — ${label}`,
        subtitle: `من ${dateFrom} إلى ${dateTo}`,
        reportType: "violations",
        tableHTML: buildTableHTML(data),
        fileName: `violations_report_${dateFrom}_${dateTo}`,
        returnBlob: true,
      }) as Blob;
      const { sharePDFViaWhatsApp } = await import("@/lib/whatsapp-share");
      const result = await sharePDFViaWhatsApp(blob, `violations_report.pdf`, `📋 تقرير المخالفات — من ${dateFrom} إلى ${dateTo}`);
      toast({ title: result === "shared" ? "تم المشاركة" : "تم تصدير PDF", description: result === "shared" ? "تم مشاركة ملف PDF بنجاح" : "تم تحميل الملف، يمكنك إرفاقه في واتساب" });
    } catch {
      toast({ title: "خطأ", description: "فشل المشاركة", variant: "destructive" });
    }
  };

  const formatWeekLabel = (key: string) => {
    const [start, end] = key.split("_");
    return `${start} — ${end}`;
  };

  return (
    <div className="space-y-4">
      {/* Export buttons */}
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        {loading && <span className="text-sm text-muted-foreground">جارٍ التحميل...</span>}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "daily" | "weekly")} dir="rtl">
          <TabsList className="h-9">
            <TabsTrigger value="daily" className="gap-1 px-3 text-xs">
              <CalendarDays className="h-3.5 w-3.5" />
              يومي
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-1 px-3 text-xs">
              <CalendarDays className="h-3.5 w-3.5" />
              أسبوعي
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {data.length > 0 && (
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPDF}>
              <FileText className="h-4 w-4" />
              تصدير PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-green-600 hover:text-green-700" onClick={handleShareWhatsApp}>
              <MessageCircle className="h-4 w-4" />
              واتساب
            </Button>
          </>
        )}
      </div>

      {!selectedClass && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>اختر فصلاً لعرض تقرير المخالفات</p>
          </CardContent>
        </Card>
      )}

      {selectedClass && data.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>لا توجد مخالفات في الفترة المحددة</p>
          </CardContent>
        </Card>
      )}

      {data.length > 0 && (
        <div className="print-area space-y-4">
          <ReportPrintHeader reportType="behavior" />

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{data.length}</p>
                <p className="text-xs text-muted-foreground">إجمالي المخالفات</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{studentSummary.length}</p>
                <p className="text-xs text-muted-foreground">عدد الطلاب المخالفين</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{activeGroups.length}</p>
                <p className="text-xs text-muted-foreground">{viewMode === "daily" ? "عدد الأيام" : "عدد الأسابيع"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {studentSummary.length > 0 ? (data.length / studentSummary.length).toFixed(1) : 0}
                </p>
                <p className="text-xs text-muted-foreground">متوسط المخالفات/طالب</p>
              </CardContent>
            </Card>
          </div>

          {/* Top violators */}
          {studentSummary.length > 0 && (
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">أكثر الطلاب مخالفة</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2 max-h-[250px] overflow-auto">
                  {studentSummary.slice(0, 10).map((s, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                        <span className="text-sm font-medium">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(s.categories).map(([cat, count]) => (
                            <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {cat} ({count})
                            </Badge>
                          ))}
                        </div>
                        <Badge variant="destructive" className="text-xs">{s.count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grouped tables */}
          {activeGroups.map(([groupKey, records]) => (
            <Card key={groupKey} className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {viewMode === "daily" ? groupKey : formatWeekLabel(groupKey)}
                  <Badge variant="outline" className="text-[10px]">{records.length} مخالفة</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-auto max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right w-8">#</TableHead>
                        <TableHead className="text-right">الطالب</TableHead>
                        {viewMode === "weekly" && <TableHead className="text-right">التاريخ</TableHead>}
                        <TableHead className="text-right">نوع المخالفة</TableHead>
                        <TableHead className="text-right">ملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">{r.student_name}</TableCell>
                          {viewMode === "weekly" && <TableCell>{r.date}</TableCell>}
                          <TableCell>
                            <Badge variant="destructive" className="text-[11px]">{r.category_name}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{r.note || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
