import { useState, useEffect, useCallback } from "react";
import FormsGrid from "@/components/forms/FormsGrid";
import FormDialog from "@/components/forms/FormDialog";
import type { FormTemplate } from "@/components/forms/form-templates";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Award, Moon, ShieldCheck, Loader2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { registerArabicFont } from "@/lib/arabic-pdf";
import { cn } from "@/lib/utils";

interface ClassOption { id: string; name: string }

interface Stats {
  totalForms: number;
  excellentStudents: number;
  sleepCases: number;
  disciplineRate: number;
}

export default function FormsPage() {
  const { user } = useAuth();
  const [selectedForm, setSelectedForm] = useState<FormTemplate | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [stats, setStats] = useState<Stats>({ totalForms: 0, excellentStudents: 0, sleepCases: 0, disciplineRate: 0 });
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cls } = await supabase.from("classes").select("id, name").order("name");
      setClasses(cls || []);

      let studentIds: string[] | null = null;
      if (selectedClassId !== "all") {
        const { data: studs } = await supabase.from("students").select("id").eq("class_id", selectedClassId);
        studentIds = (studs || []).map(s => s.id);
      }

      // Forms issued
      let logsQuery = supabase.from("form_issued_logs").select("id", { count: "exact" });
      if (studentIds && studentIds.length > 0) logsQuery = logsQuery.in("student_id", studentIds);
      else if (studentIds) logsQuery = logsQuery.eq("student_id", "00000000-0000-0000-0000-000000000000");
      const { count: formCount } = await logsQuery;

      // Behavior
      let behaviorQuery = supabase.from("behavior_records").select("type, student_id");
      if (selectedClassId !== "all") behaviorQuery = behaviorQuery.eq("class_id", selectedClassId);
      const { data: behaviors } = await behaviorQuery;

      const sleepTypes = ["نوم", "sleep", "نائم"];
      const sleepCases = (behaviors || []).filter(b => sleepTypes.some(t => b.type?.toLowerCase().includes(t))).length;
      const negativeTypes = ["سلبي", "negative", "مخالفة", "إخلال"];
      const negative = (behaviors || []).filter(b => negativeTypes.some(t => b.type?.toLowerCase().includes(t))).length;
      const total = (behaviors || []).length;
      const disciplineRate = total > 0 ? Math.round(((total - negative) / total) * 100) : 100;

      // Excellent students
      let gradesQuery = supabase.from("grades").select("student_id, score, grade_categories!inner(max_score)").not("score", "is", null);
      if (studentIds && studentIds.length > 0) gradesQuery = gradesQuery.in("student_id", studentIds);
      const { data: grades } = await gradesQuery;
      const studentAvgs: Record<string, { sum: number; count: number }> = {};
      (grades || []).forEach((g: any) => {
        const pct = (g.score / (g.grade_categories?.max_score || 100)) * 100;
        if (!studentAvgs[g.student_id]) studentAvgs[g.student_id] = { sum: 0, count: 0 };
        studentAvgs[g.student_id].sum += pct;
        studentAvgs[g.student_id].count++;
      });
      const excellent = Object.values(studentAvgs).filter(v => v.count > 0 && (v.sum / v.count) >= 90).length;

      setStats({ totalForms: formCount || 0, excellentStudents: excellent, sleepCases, disciplineRate });
    })();
  }, [user, selectedClassId]);

  const statCards = [
    { label: "النماذج الصادرة", value: stats.totalForms, icon: FileText, gradient: "from-primary/15 via-primary/5 to-transparent", iconBg: "bg-primary/15", iconColor: "text-primary", ring: "ring-primary/10" },
    { label: "الطلاب المتميزون", value: stats.excellentStudents, icon: Award, gradient: "from-warning/15 via-warning/5 to-transparent", iconBg: "bg-warning/15", iconColor: "text-warning", ring: "ring-warning/10" },
    { label: "حالات النوم", value: stats.sleepCases, icon: Moon, gradient: "from-info/15 via-info/5 to-transparent", iconBg: "bg-info/15", iconColor: "text-info", ring: "ring-info/10" },
    { label: "نسبة الانضباط", value: `${stats.disciplineRate}%`, icon: ShieldCheck, gradient: "from-success/15 via-success/5 to-transparent", iconBg: "bg-success/15", iconColor: "text-success", ring: "ring-success/10" },
  ];

  const handleClassReport = useCallback(async () => {
    if (selectedClassId === "all") {
      toast.error("يرجى اختيار فصل محدد أولاً");
      return;
    }
    setGeneratingReport(true);
    try {
      const className = classes.find(c => c.id === selectedClassId)?.name || "";
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      await registerArabicFont(doc);
      doc.setFont("Amiri");

      const pageW = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(18);
      doc.setFont("Amiri", "bold");
      doc.setTextColor(0, 102, 153);
      doc.text(`تقرير إنجاز الفصل: ${className}`, pageW / 2, y, { align: "center" });
      y += 10;

      doc.setFontSize(10);
      doc.setFont("Amiri", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`تاريخ التقرير: ${format(new Date(), "yyyy/MM/dd")}`, pageW / 2, y, { align: "center" });
      y += 15;

      const items = [
        `إجمالي النماذج الصادرة: ${stats.totalForms}`,
        `عدد الطلاب المتميزين (معدل ≥ 90%): ${stats.excellentStudents}`,
        `حالات النوم المرصودة: ${stats.sleepCases}`,
        `نسبة الانضباط العامة: ${stats.disciplineRate}%`,
      ];

      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      items.forEach(item => {
        doc.text(`• ${item}`, pageW - 20, y, { align: "right" });
        y += 9;
      });

      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("ألفا فيزياء — Alpha Physics", pageW / 2, y, { align: "center" });

      const fileName = `تقرير_إنجاز_${className}.pdf`;
      const blob = doc.output("blob");
      const file = new File([blob], fileName, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        toast.success("تمت المشاركة بنجاح");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success("تم تنزيل التقرير");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error(err);
        toast.error("فشل إنشاء التقرير");
      }
    } finally {
      setGeneratingReport(false);
    }
  }, [selectedClassId, classes, stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مركز ألفا الإداري المتكامل</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة النماذج الرسمية وإحصائيات الفصول</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[150px] text-xs h-9">
              <SelectValue placeholder="كل الفصول" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفصول</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs"
            onClick={handleClassReport}
            disabled={generatingReport || selectedClassId === "all"}
          >
            {generatingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
            تقرير إنجاز الفصل
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className={cn(
              "relative overflow-hidden border-0 ring-1 shadow-card p-3 flex items-center gap-3",
              stat.ring
            )}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-bl opacity-60", stat.gradient)} />
            <div className={cn("relative rounded-xl p-2.5", stat.iconBg)}>
              <stat.icon className={cn("h-4 w-4", stat.iconColor)} />
            </div>
            <div className="relative">
              <p className="text-xl font-black tabular-nums text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <FormsGrid onSelect={setSelectedForm} />

      {selectedForm && (
        <FormDialog
          form={selectedForm}
          open={!!selectedForm}
          onOpenChange={(open) => { if (!open) setSelectedForm(null); }}
        />
      )}
    </div>
  );
}
