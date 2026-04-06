import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, TrendingUp, Users, Award, BarChart3, Target, Upload, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { safeWriteXLSX, safeSavePDF } from "@/lib/download-utils";

interface QuizStats {
  activityId: string;
  title: string;
  totalStudents: number;
  submittedCount: number;
  averageScore: number;
  averagePercent: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  totalQuestions: number;
}

export default function QuizStatistics() {
  const [stats, setStats] = useState<QuizStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);

    const { data: quizActivities } = await supabase
      .from("teacher_activities")
      .select("id, title")
      .eq("type", "quiz")
      .order("created_at", { ascending: false });

    if (!quizActivities?.length) { setStats([]); setLoading(false); return; }

    const ids = quizActivities.map(a => a.id);

    const [{ data: submissions }, { data: targets }] = await Promise.all([
      supabase.from("quiz_submissions").select("activity_id, score, total, student_id").in("activity_id", ids),
      supabase.from("activity_class_targets").select("activity_id, class_id").in("activity_id", ids),
    ]);

    const classIds = [...new Set((targets || []).map(t => t.class_id))];
    const { data: students } = await supabase
      .from("students")
      .select("id, class_id")
      .in("class_id", classIds.length ? classIds : ["__none__"]);

    const result: QuizStats[] = quizActivities.map(activity => {
      const actSubs = (submissions || []).filter(s => s.activity_id === activity.id);
      const actTargets = (targets || []).filter(t => t.activity_id === activity.id);
      const targetClassIds = actTargets.map(t => t.class_id);
      const totalStudents = (students || []).filter(s => targetClassIds.includes(s.class_id!)).length;

      const submittedCount = actSubs.length;
      const totalQuestions = actSubs.length > 0 ? Number(actSubs[0].total) || 0 : 0;

      let averageScore = 0;
      let averagePercent = 0;
      let passRate = 0;
      let highestScore = 0;
      let lowestScore = 0;

      if (submittedCount > 0) {
        const scores = actSubs.map(s => Number(s.score) || 0);
        const totals = actSubs.map(s => Number(s.total) || 1);
        const percents = actSubs.map((s, i) => (scores[i] / totals[i]) * 100);

        averageScore = scores.reduce((a, b) => a + b, 0) / submittedCount;
        averagePercent = percents.reduce((a, b) => a + b, 0) / submittedCount;
        passRate = (percents.filter(p => p >= 60).length / submittedCount) * 100;
        highestScore = Math.max(...scores);
        lowestScore = Math.min(...scores);
      }

      return {
        activityId: activity.id,
        title: activity.title,
        totalStudents,
        submittedCount,
        averageScore: Math.round(averageScore * 10) / 10,
        averagePercent: Math.round(averagePercent),
        passRate: Math.round(passRate),
        highestScore,
        lowestScore,
        totalQuestions,
      };
    });

    setStats(result);
    setLoading(false);
  };

  const exportExcel = async () => {
    setExporting(true);
    const XLSX = await import("xlsx");

    // Summary sheet
    const totalSubmissions = stats.reduce((a, s) => a + s.submittedCount, 0);
    const overallAvg = totalSubmissions > 0
      ? Math.round(stats.reduce((a, s) => a + s.averagePercent * s.submittedCount, 0) / totalSubmissions)
      : 0;
    const overallPass = totalSubmissions > 0
      ? Math.round(stats.reduce((a, s) => a + s.passRate * s.submittedCount, 0) / totalSubmissions)
      : 0;

    const summaryRows = [
      { "البيان": "عدد الاختبارات", "القيمة": stats.length },
      { "البيان": "إجمالي التسليمات", "القيمة": totalSubmissions },
      { "البيان": "المتوسط العام", "القيمة": `${overallAvg}%` },
      { "البيان": "معدل النجاح العام", "القيمة": `${overallPass}%` },
    ];

    // Details sheet
    const detailRows = stats.map((q, i) => ({
      "#": i + 1,
      "الاختبار": q.title,
      "عدد الأسئلة": q.totalQuestions,
      "عدد الطلاب": q.totalStudents,
      "عدد التسليمات": q.submittedCount,
      "نسبة التسليم": `${q.totalStudents > 0 ? Math.round((q.submittedCount / q.totalStudents) * 100) : 0}%`,
      "المتوسط": `${q.averagePercent}%`,
      "معدل النجاح": `${q.passRate}%`,
      "أعلى درجة": `${q.highestScore}/${q.totalQuestions}`,
      "أقل درجة": `${q.lowestScore}/${q.totalQuestions}`,
      "متوسط الدرجة": `${q.averageScore}/${q.totalQuestions}`,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "الملخص");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "التفاصيل");
    safeWriteXLSX(wb, `إحصائيات_الاختبارات_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    setExporting(false);
  };

  const exportPDF = async () => {
    setExporting(true);
    const { createArabicPDF, getArabicTableStyles, finalizePDF } = await import("@/lib/arabic-pdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const { doc, startY, watermark, advanced } = await createArabicPDF({ orientation: "landscape", reportType: "default" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFont("Amiri", "bold");
    doc.setFontSize(16);
    doc.text("إحصائيات الاختبارات", pageWidth / 2, startY, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("Amiri", "normal");
    doc.text(format(new Date(), "yyyy/MM/dd"), pageWidth / 2, startY + 7, { align: "center" });

    // Summary row
    const totalSubmissions = stats.reduce((a, s) => a + s.submittedCount, 0);
    const overallAvg = totalSubmissions > 0
      ? Math.round(stats.reduce((a, s) => a + s.averagePercent * s.submittedCount, 0) / totalSubmissions)
      : 0;
    const overallPass = totalSubmissions > 0
      ? Math.round(stats.reduce((a, s) => a + s.passRate * s.submittedCount, 0) / totalSubmissions)
      : 0;

    doc.setFontSize(10);
    doc.text(
      `عدد الاختبارات: ${stats.length}  |  إجمالي التسليمات: ${totalSubmissions}  |  المتوسط العام: ${overallAvg}%  |  معدل النجاح: ${overallPass}%`,
      pageWidth / 2, startY + 14, { align: "center" }
    );

    // Table
    const headers = [["متوسط الدرجة", "أقل درجة", "أعلى درجة", "معدل النجاح", "المتوسط", "نسبة التسليم", "التسليمات", "الطلاب", "الأسئلة", "الاختبار", "#"]];
    const body = stats.map((q, i) => [
      `${q.averageScore}/${q.totalQuestions}`,
      `${q.lowestScore}/${q.totalQuestions}`,
      `${q.highestScore}/${q.totalQuestions}`,
      `${q.passRate}%`,
      `${q.averagePercent}%`,
      `${q.totalStudents > 0 ? Math.round((q.submittedCount / q.totalStudents) * 100) : 0}%`,
      q.submittedCount,
      q.totalStudents,
      q.totalQuestions,
      q.title,
      i + 1,
    ]);

    const tableStyles = getArabicTableStyles(advanced);
    autoTable(doc, {
      head: headers,
      body,
      startY: startY + 20,
      ...tableStyles,
      theme: "grid",
    });

    finalizePDF(doc, `إحصائيات_الاختبارات_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark, advanced);
    setExporting(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (stats.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">لا توجد اختبارات بعد</p>
        </CardContent>
      </Card>
    );
  }

  const totalSubmissions = stats.reduce((a, s) => a + s.submittedCount, 0);
  const overallAvgPercent = totalSubmissions > 0
    ? Math.round(stats.reduce((a, s) => a + s.averagePercent * s.submittedCount, 0) / totalSubmissions)
    : 0;
  const overallPassRate = totalSubmissions > 0
    ? Math.round(stats.reduce((a, s) => a + s.passRate * s.submittedCount, 0) / totalSubmissions)
    : 0;

  return (
    <div className="space-y-6">
      {/* Export button */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              تصدير
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportExcel} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> تصدير Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportPDF} className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4 text-rose-600" /> تصدير PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<BarChart3 className="h-5 w-5" />} label="عدد الاختبارات" value={stats.length}
          color="bg-violet-500/10 text-violet-600" />
        <StatCard icon={<Users className="h-5 w-5" />} label="إجمالي التسليمات" value={totalSubmissions}
          color="bg-blue-500/10 text-blue-600" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="المتوسط العام" value={`${overallAvgPercent}%`}
          color="bg-emerald-500/10 text-emerald-600" />
        <StatCard icon={<Award className="h-5 w-5" />} label="معدل النجاح" value={`${overallPassRate}%`}
          color={cn(overallPassRate >= 60 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")} />
      </div>

      {/* Per-quiz stats */}
      <div className="space-y-3">
        {stats.map(quiz => {
          const completionRate = quiz.totalStudents > 0 ? Math.round((quiz.submittedCount / quiz.totalStudents) * 100) : 0;
          return (
            <Card key={quiz.activityId} className="border-0 shadow-md rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{quiz.title}</h4>
                      <p className="text-xs text-muted-foreground">{quiz.totalQuestions} سؤال</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs rounded-full shrink-0">
                    {quiz.submittedCount}/{quiz.totalStudents} طالب
                  </Badge>
                </div>

                <div className="space-y-3">
                  <ProgressRow label="معدل النجاح" value={quiz.passRate} suffix="%"
                    color={quiz.passRate >= 60 ? "bg-emerald-500" : "bg-rose-500"} />
                  <ProgressRow label="المتوسط" value={quiz.averagePercent} suffix="%"
                    color="bg-blue-500" />
                  <ProgressRow label="نسبة التسليم" value={completionRate} suffix="%"
                    color="bg-violet-500" />
                </div>

                {quiz.submittedCount > 0 && (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/20">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">أعلى درجة:</span>
                      <span className="font-bold text-emerald-600">{quiz.highestScore}/{quiz.totalQuestions}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">أقل درجة:</span>
                      <span className="font-bold text-rose-600">{quiz.lowestScore}/{quiz.totalQuestions}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">المتوسط:</span>
                      <span className="font-bold text-blue-600">{quiz.averageScore}/{quiz.totalQuestions}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressRow({ label, value, suffix, color }: { label: string; value: number; suffix: string; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{value}{suffix}</span>
      </div>
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}
