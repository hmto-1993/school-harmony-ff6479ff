import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, MessageCircle, AlertTriangle, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek } from "date-fns";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";

interface ViolationsReportTabProps {
  selectedClass: string;
  dateFrom: string;
  dateTo: string;
  selectedStudent: string;
  reportType: "daily" | "periodic" | "semester";
}

interface ViolationRecord {
  student_name: string;
  student_id: string;
  date: string;
  category_name: string;
  score: number;
  note: string | null;
}

export default function ViolationsReportTab({ selectedClass, dateFrom, dateTo, selectedStudent, reportType }: ViolationsReportTabProps) {
  const [data, setData] = useState<ViolationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const isWeekly = reportType === "periodic";

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

    // 2. Get students in class
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

    // 3. Build query - for weekly/periodic: fetch ALL violations (no date filter)
    let query = supabase
      .from("grades")
      .select("student_id, date, category_id, score, note, students(full_name)")
      .in("category_id", catIds)
      .in("student_id", studentIdsInClass)
      .not("score", "is", null)
      .gt("score", 0)
      .order("date", { ascending: false });

    // Only apply date filter for daily mode
    if (!isWeekly) {
      query = query.gte("date", dateFrom).lte("date", dateTo);
    }

    if (selectedStudent !== "all") {
      query = query.eq("student_id", selectedStudent);
    }

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
    if (selectedClass) fetchViolations();
  }, [selectedClass, dateFrom, dateTo, selectedStudent, reportType]);

  // Student summary (used for weekly summary view)
  const studentSummary = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalScore: number; categories: Record<string, number>; lastDate: string }> = {};
    data.forEach(r => {
      if (!map[r.student_id]) map[r.student_id] = { name: r.student_name, count: 0, totalScore: 0, categories: {}, lastDate: r.date };
      map[r.student_id].count++;
      map[r.student_id].totalScore += r.score;
      map[r.student_id].categories[r.category_name] = (map[r.student_id].categories[r.category_name] || 0) + 1;
      if (r.date > map[r.student_id].lastDate) map[r.student_id].lastDate = r.date;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [data]);

  // Group by date for daily view
  const dailyGroups = useMemo(() => {
    const groups: Record<string, ViolationRecord[]> = {};
    data.forEach(r => {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  const buildTableHTML = (records: ViolationRecord[]) => {
    const rows = records.map((r, i) =>
      `<tr><td>${i + 1}</td><td>${r.student_name}</td><td>${r.date}</td><td>${r.category_name}</td><td>${r.note || "—"}</td></tr>`
    ).join("");
    return `<table><thead><tr><th style="width:30px">#</th><th style="text-align:right">الطالب</th><th>التاريخ</th><th>نوع المخالفة</th><th>ملاحظات</th></tr></thead><tbody>${rows}</tbody></table>`;
  };

  const buildSummaryTableHTML = () => {
    const rows = studentSummary.map((s, i) => {
      const catsStr = Object.entries(s.categories).map(([cat, count]) => `${cat} (${count})`).join("، ");
      return `<tr><td>${i + 1}</td><td>${s.name}</td><td>${s.count}</td><td>${catsStr}</td><td>${s.lastDate}</td></tr>`;
    }).join("");
    return `<table><thead><tr><th style="width:30px">#</th><th style="text-align:right">الطالب</th><th>عدد المخالفات</th><th>أنواع المخالفات</th><th>آخر مخالفة</th></tr></thead><tbody>${rows}</tbody></table>`;
  };

  const handleExportPDF = async () => {
    if (data.length === 0) {
      toast({ title: "لا توجد مخالفات", description: "لا يوجد بيانات للتصدير" });
      return;
    }
    try {
      const { exportGradesTableAsPDF } = await import("@/lib/grades-print");
      const label = isWeekly ? "ملخص شامل" : "يومي";
      const tableHTML = isWeekly ? buildSummaryTableHTML() : buildTableHTML(data);
      const subtitle = isWeekly ? "جميع المخالفات السابقة" : `من ${dateFrom} إلى ${dateTo}`;
      await exportGradesTableAsPDF({
        orientation: "portrait",
        title: `تقرير المخالفات — ${label}`,
        subtitle,
        reportType: "violations",
        tableHTML,
        fileName: `violations_report_${isWeekly ? "summary" : dateFrom + "_" + dateTo}`,
      });
      toast({ title: "تم التصدير", description: "تم تصدير ملف PDF بنجاح" });
    } catch (err: any) {
      console.error("[ViolationsReport.exportPDF]", err);
      toast({ title: "خطأ", description: err?.message || "فشل تصدير PDF", variant: "destructive" });
    }
  };

  const handleShareWhatsApp = async () => {
    if (data.length === 0) {
      toast({ title: "لا توجد مخالفات", description: "لا يوجد بيانات للمشاركة" });
      return;
    }
    try {
      const { exportGradesTableAsPDF } = await import("@/lib/grades-print");
      const label = isWeekly ? "ملخص شامل" : "يومي";
      const tableHTML = isWeekly ? buildSummaryTableHTML() : buildTableHTML(data);
      const subtitle = isWeekly ? "جميع المخالفات السابقة" : `من ${dateFrom} إلى ${dateTo}`;
      const blob = await exportGradesTableAsPDF({
        orientation: "portrait",
        title: `تقرير المخالفات — ${label}`,
        subtitle,
        reportType: "violations",
        tableHTML,
        fileName: `violations_report`,
        returnBlob: true,
      }) as Blob;
      const { sharePDFViaWhatsApp } = await import("@/lib/whatsapp-share");
      const result = await sharePDFViaWhatsApp(blob, `تقرير_المخالفات.pdf`, `📋 تقرير المخالفات — ${label}`);
      toast({ title: result === "shared" ? "تم المشاركة" : "تم تصدير PDF", description: result === "shared" ? "تم مشاركة ملف PDF بنجاح" : "تم تحميل الملف، يمكنك إرفاقه في واتساب" });
    } catch (err: any) {
      console.error("[ViolationsReport.shareWhatsApp]", err);
      toast({ title: "خطأ", description: err?.message || "فشل المشاركة", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Export buttons */}
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        {loading && <span className="text-sm text-muted-foreground">جارٍ التحميل...</span>}
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
            <p>لا توجد مخالفات {isWeekly ? "مسجلة" : "في الفترة المحددة"}</p>
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
                <p className="text-2xl font-bold text-foreground">
                  {isWeekly ? new Set(data.map(d => d.date)).size : dailyGroups.length}
                </p>
                <p className="text-xs text-muted-foreground">{isWeekly ? "عدد الأيام المسجلة" : "عدد الأيام"}</p>
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

          {/* Weekly: Summary table */}
          {isWeekly && (
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">ملخص المخالفات الشامل</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right w-8">#</TableHead>
                        <TableHead className="text-right">الطالب</TableHead>
                        <TableHead className="text-right">عدد المخالفات</TableHead>
                        <TableHead className="text-right">أنواع المخالفات</TableHead>
                        <TableHead className="text-right">آخر مخالفة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentSummary.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="text-xs">{s.count}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(s.categories).map(([cat, count]) => (
                                <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {cat} ({count})
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{s.lastDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily: Grouped by date */}
          {!isWeekly && (
            <>
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

              {dailyGroups.map(([groupKey, records]) => (
                <Card key={groupKey} className="shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      {groupKey}
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
                            <TableHead className="text-right">نوع المخالفة</TableHead>
                            <TableHead className="text-right">ملاحظات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell className="font-medium">{r.student_name}</TableCell>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
