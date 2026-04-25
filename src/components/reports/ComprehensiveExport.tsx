import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { FileText, ChevronDown, Loader2, Sparkles, FileBarChart, Lock } from "lucide-react";
import { finalizePDF } from "@/lib/arabic-pdf";
import { buildSummaryPDF } from "@/lib/summary-pdf";
import { format } from "date-fns";
import { toast } from "sonner";
import { buildComprehensivePDF, ComprehensiveData } from "./comprehensive-pdf-builders";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { UpgradeDialog } from "@/components/subscription/PremiumGate";

interface ComprehensiveExportProps {
  classes: { id: string; name: string }[];
  variant?: "card" | "header";
}

export default function ComprehensiveExport({ classes, variant = "card" }: ComprehensiveExportProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { isPremium, loaded: tierLoaded } = useSubscriptionTier();
  const [showAIUpgrade, setShowAIUpgrade] = useState(false);
  const aiLocked = tierLoaded && !isPremium;
  const requireAI = (cb: () => void) => {
    if (aiLocked) { setShowMenu(false); setShowAIUpgrade(true); return; }
    cb();
  };

  const fetchData = useCallback(async (): Promise<ComprehensiveData | null> => {
    if (!user || classes.length === 0) return null;

    const classIds = classes.map(c => c.id);
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const [
      { data: profile }, { data: students }, { data: todayAttendance },
      { data: categories }, { data: behavior }, { data: lessonPlans },
      { data: schoolSetting }, { data: attendanceHistory }, { data: academicCalendar },
    ] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("user_id", user.id).single(),
      supabase.from("students").select("id, full_name, class_id").in("class_id", classIds).order("full_name"),
      supabase.from("attendance_records").select("student_id, status, class_id").in("class_id", classIds).eq("date", today),
      supabase.from("grade_categories").select("id, name, max_score, category_group, sort_order, class_id"),
      supabase.from("behavior_records").select("student_id, type, class_id, date, note").in("class_id", classIds).gte("date", thirtyDaysAgo),
      supabase.from("lesson_plans").select("class_id, week_number, is_completed, lesson_title, day_index, slot_index").in("class_id", classIds).eq("created_by", user.id),
      supabase.from("site_settings").select("value").eq("id", "school_name").single(),
      supabase.from("attendance_records").select("student_id, status, class_id, date").in("class_id", classIds).order("date", { ascending: false }).limit(5000),
      supabase.from("academic_calendar").select("start_date, total_weeks, semester, academic_year").order("created_at", { ascending: false }).limit(1).single(),
    ]);

    const studentIds = (students || []).map((s: any) => s.id);
    let grades: any[] = [];
    let manualScores: any[] = [];
    if (studentIds.length > 0) {
      const [g, m] = await Promise.all([
        supabase.from("grades").select("student_id, category_id, score, period, date").in("student_id", studentIds).limit(5000),
        supabase.from("manual_category_scores").select("student_id, category_id, score, period").in("student_id", studentIds).limit(5000),
      ]);
      grades = g.data || [];
      manualScores = m.data || [];
    }

    const classSummaries = classes.map((c) => {
      const classStudents = (students || []).filter((s: any) => s.class_id === c.id);
      const classStudentIds = classStudents.map((s: any) => s.id);
      const att = (todayAttendance || []).filter((a: any) => a.class_id === c.id);
      const present = att.filter((a: any) => a.status === "present").length;
      const absent = att.filter((a: any) => a.status === "absent").length;
      const late = att.filter((a: any) => a.status === "late").length;
      const classGrades = grades.filter((g: any) => classStudentIds.includes(g.student_id));
      const classManual = manualScores.filter((m: any) => classStudentIds.includes(m.student_id));
      const classLessons = (lessonPlans || []).filter((l: any) => l.class_id === c.id);
      const classBehavior = (behavior || []).filter((b: any) => b.class_id === c.id);
      const classAttHistory = (attendanceHistory || []).filter((a: any) => a.class_id === c.id);
      const totalAbsences = classAttHistory.filter((a: any) => a.status === "absent").length;

      const absencesByStudent: Record<string, number> = {};
      classAttHistory.filter((a: any) => a.status === "absent").forEach((a: any) => {
        absencesByStudent[a.student_id] = (absencesByStudent[a.student_id] || 0) + 1;
      });
      const topAbsentees = Object.entries(absencesByStudent)
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([studentId, count]) => ({
          name: classStudents.find((s: any) => s.id === studentId)?.full_name || "",
          count,
        }));

      return {
        id: c.id, name: c.name, grade: "", section: "",
        studentCount: classStudents.length,
        students: classStudents.map((s: any) => ({ id: s.id, full_name: s.full_name })),
        attendance: { present, absent, late, total: classStudents.length, notRecorded: classStudents.length - att.length },
        grades: classGrades, manualScores: classManual,
        lessonPlans: { total: classLessons.length, completed: classLessons.filter((l: any) => l.is_completed).length },
        behavior: { positive: classBehavior.filter((b: any) => b.type === "positive").length, negative: classBehavior.filter((b: any) => b.type === "negative").length },
        totalAbsences, topAbsentees,
      };
    });

    const totalStudents = (students || []).length;
    const totalPresent = (todayAttendance || []).filter((a: any) => a.status === "present").length;

    return {
      teacherName: profile?.full_name || "معلم",
      schoolName: schoolSetting?.value || "",
      totalStudents,
      attendanceRate: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0,
      classes: classSummaries,
      categories: categories || [],
      weeklyAttendance: (attendanceHistory || []).map((r: any) => ({ student_id: r.student_id, status: r.status, class_id: r.class_id, date: r.date })),
      academicCalendar: academicCalendar ? { start_date: academicCalendar.start_date, total_weeks: academicCalendar.total_weeks, semester: academicCalendar.semester } : null,
    };
  }, [user, classes]);

  const handleExportComprehensive = useCallback(async (focus: "comprehensive" | "attendance" | "grades" | "none") => {
    setLoading(true);
    setShowMenu(false);
    try {
      const data = await fetchData();
      if (!data) { toast.error("لا توجد بيانات للتصدير"); setLoading(false); return; }

      let summaryText = "";
      if (focus !== "none") {
        const { data: aiRes } = await supabase.functions.invoke("summarize-teacher", {
          body: { teacherName: data.teacherName, schoolName: data.schoolName, classes: data.classes, attendanceRate: data.attendanceRate, totalStudents: data.totalStudents, focus },
        });
        summaryText = aiRes?.summary || "";
      }

      const { doc, watermark } = await buildComprehensivePDF(data, summaryText);
      finalizePDF(doc, `تقرير-شامل_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark);
      toast.success("تم تصدير التقرير الشامل بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء التصدير");
    }
    setLoading(false);
  }, [fetchData]);

  const handleExportSummary = useCallback(async (withAI: boolean) => {
    setLoading(true);
    setShowMenu(false);
    try {
      const data = await fetchData();
      if (!data) { toast.error("لا توجد بيانات للتصدير"); setLoading(false); return; }

      let aiText = "";
      if (withAI) {
        const { data: aiRes } = await supabase.functions.invoke("summarize-teacher", {
          body: { teacherName: data.teacherName, schoolName: data.schoolName, classes: data.classes, attendanceRate: data.attendanceRate, totalStudents: data.totalStudents, focus: "comprehensive" },
        });
        aiText = aiRes?.summary || "";
      }

      const { doc, watermark } = await buildSummaryPDF(data, { includeAISummary: withAI, aiSummaryText: aiText });
      finalizePDF(doc, `ملخص-مستويات_${format(new Date(), "yyyy-MM-dd")}.pdf`, watermark);
      toast.success("تم تصدير الملخص بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء التصدير");
    }
    setLoading(false);
  }, [fetchData]);

  if (classes.length === 0) return null;

  // Slim header trigger variant
  if (variant === "header") {
    return (
      <>
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={loading} className="gap-1.5 bg-background/60 backdrop-blur">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBarChart className="h-4 w-4 text-primary" />}
              {loading ? "جارٍ التصدير..." : "تقرير شامل"}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="text-xs text-muted-foreground">التقرير الشامل + ملخص ذكي</DropdownMenuLabel>
            {([
              { key: "comprehensive" as const, label: "📊 شامل", ai: true },
              { key: "attendance" as const, label: "📋 التركيز على الحضور", ai: true },
              { key: "grades" as const, label: "📝 التركيز على الدرجات", ai: true },
              { key: "none" as const, label: "⏭️ بدون ملخص ذكي", ai: false },
            ]).map(opt => (
              <DropdownMenuItem
                key={opt.key}
                onClick={() => (opt.ai ? requireAI(() => handleExportComprehensive(opt.key)) : handleExportComprehensive(opt.key))}
                className="flex items-center justify-between gap-2"
              >
                <span>{opt.label}</span>
                {opt.ai && aiLocked && <Lock className="h-3.5 w-3.5 text-amber-500" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">ملخص مختصر</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => requireAI(() => handleExportSummary(true))}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center"><Sparkles className="h-4 w-4 ml-2 text-primary" /> ملخص مختصر + ذكي</span>
              {aiLocked && <Lock className="h-3.5 w-3.5 text-amber-500" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportSummary(false)}>
              📋 ملخص مختصر بدون ذكي
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <UpgradeDialog
          open={showAIUpgrade}
          onOpenChange={setShowAIUpgrade}
          featureName="مساعد الصياغة بالذكاء الاصطناعي"
          description="ولّد ملخصات احترافية ومخصّصة لتقاريرك بالذكاء الاصطناعي، حصرياً لمشتركي ألفا بريميوم."
        />
      </>
    );
  }

  return (
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
      <CardContent className="py-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <FileBarChart className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">التقارير الشاملة</h3>
            <p className="text-sm text-muted-foreground mt-1">تصدير تقارير شاملة تتضمن جميع الفصول والدرجات والحضور والسلوك وخطط الدروس</p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="relative">
              <div className="flex">
                <Button onClick={() => handleExportComprehensive("comprehensive")} disabled={loading} className="gap-2 rounded-l-none">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {loading ? "جارٍ التصدير..." : "تقرير شامل PDF"}
                </Button>
                <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
                  <DropdownMenuTrigger asChild>
                    <Button disabled={loading} className="rounded-r-none border-r border-primary-foreground/20 px-2">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">التقرير الشامل + ملخص ذكي</DropdownMenuLabel>
                    {([
                      { key: "comprehensive" as const, label: "📊 شامل", ai: true },
                      { key: "attendance" as const, label: "📋 التركيز على الحضور", ai: true },
                      { key: "grades" as const, label: "📝 التركيز على الدرجات", ai: true },
                      { key: "none" as const, label: "⏭️ بدون ملخص ذكي", ai: false },
                    ]).map(opt => (
                      <DropdownMenuItem
                        key={opt.key}
                        onClick={() => (opt.ai ? requireAI(() => handleExportComprehensive(opt.key)) : handleExportComprehensive(opt.key))}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>{opt.label}</span>
                        {opt.ai && aiLocked && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">ملخص مختصر</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => requireAI(() => handleExportSummary(true))}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center"><Sparkles className="h-4 w-4 ml-2 text-primary" /> ملخص مختصر + ذكي</span>
                      {aiLocked && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportSummary(false)}>
                      📋 ملخص مختصر بدون ذكي
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <UpgradeDialog
        open={showAIUpgrade}
        onOpenChange={setShowAIUpgrade}
        featureName="مساعد الصياغة بالذكاء الاصطناعي"
        description="ولّد ملخصات احترافية ومخصّصة لتقاريرك بالذكاء الاصطناعي، حصرياً لمشتركي ألفا بريميوم."
      />
    </Card>
  );
}
