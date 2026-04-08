import { useState, useEffect, useCallback, useMemo } from "react";
import FormsGrid from "@/components/forms/FormsGrid";
import FormDialog from "@/components/forms/FormDialog";
import type { FormTemplate } from "@/components/forms/form-templates";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText, Award, Moon, ShieldCheck, Loader2, BarChart3,
  Search, Settings2, Users, CheckSquare, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { registerArabicFont } from "@/lib/arabic-pdf";
import { cn } from "@/lib/utils";
import FormIdentitySettings from "@/components/settings/FormIdentitySettings";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface ClassOption { id: string; name: string }

interface StudentRow {
  id: string;
  full_name: string;
  national_id: string | null;
  class_id: string | null;
  parent_phone: string | null;
  className: string;
}

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

  // Student list
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("all");

  // Identity settings dialog
  const [showIdentitySettings, setShowIdentitySettings] = useState(false);

  // Load classes + students
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cls } = await supabase.from("classes").select("id, name").order("name");
      setClasses(cls || []);

      const classMap = new Map((cls || []).map(c => [c.id, c.name]));
      const { data: studs } = await supabase
        .from("students")
        .select("id, full_name, national_id, class_id, parent_phone")
        .order("full_name");

      setAllStudents((studs || []).map(s => ({
        ...s,
        className: s.class_id ? classMap.get(s.class_id) || "" : "",
      })));
    })();
  }, [user]);

  // Load stats
  useEffect(() => {
    if (!user) return;
    (async () => {
      let studentIds: string[] | null = null;
      if (selectedClassId !== "all") {
        const { data: studs } = await supabase.from("students").select("id").eq("class_id", selectedClassId);
        studentIds = (studs || []).map(s => s.id);
      }

      let logsQuery = supabase.from("form_issued_logs").select("id", { count: "exact" });
      if (studentIds && studentIds.length > 0) logsQuery = logsQuery.in("student_id", studentIds);
      else if (studentIds) logsQuery = logsQuery.eq("student_id", "00000000-0000-0000-0000-000000000000");
      const { count: formCount } = await logsQuery;

      let behaviorQuery = supabase.from("behavior_records").select("type, student_id");
      if (selectedClassId !== "all") behaviorQuery = behaviorQuery.eq("class_id", selectedClassId);
      const { data: behaviors } = await behaviorQuery;

      const sleepTypes = ["نوم", "sleep", "نائم"];
      const sleepCases = (behaviors || []).filter(b => sleepTypes.some(t => b.type?.toLowerCase().includes(t))).length;
      const negativeTypes = ["سلبي", "negative", "مخالفة", "إخلال"];
      const negative = (behaviors || []).filter(b => negativeTypes.some(t => b.type?.toLowerCase().includes(t))).length;
      const total = (behaviors || []).length;
      const disciplineRate = total > 0 ? Math.round(((total - negative) / total) * 100) : 100;

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

  const filteredStudents = useMemo(() => {
    let result = allStudents;
    if (studentClassFilter !== "all") {
      result = result.filter(s => s.class_id === studentClassFilter);
    }
    if (studentSearch.trim()) {
      const q = studentSearch.trim().toLowerCase();
      result = result.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        (s.national_id && s.national_id.includes(q))
      );
    }
    return result;
  }, [allStudents, studentClassFilter, studentSearch]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const ids = filteredStudents.map(s => s.id);
    const allSelected = ids.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedStudentIds(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const handleFormSelect = (form: FormTemplate) => {
    setSelectedForm(form);
  };

  const statCards = [
    { label: "النماذج الصادرة", value: stats.totalForms, icon: FileText, gradient: "from-primary/15 via-primary/5 to-transparent", iconBg: "bg-primary/15", iconColor: "text-primary", ring: "ring-primary/10" },
    { label: "الطلاب المتميزون", value: stats.excellentStudents, icon: Award, gradient: "from-warning/15 via-warning/5 to-transparent", iconBg: "bg-warning/15", iconColor: "text-warning", ring: "ring-warning/10" },
    { label: "حالات النوم", value: stats.sleepCases, icon: Moon, gradient: "from-info/15 via-info/5 to-transparent", iconBg: "bg-info/15", iconColor: "text-info", ring: "ring-info/10" },
    { label: "نسبة الانضباط", value: `${stats.disciplineRate}%`, icon: ShieldCheck, gradient: "from-success/15 via-success/5 to-transparent", iconBg: "bg-success/15", iconColor: "text-success", ring: "ring-success/10" },
  ];

  const handleClassReport = useCallback(async () => {
    if (selectedClassId === "all") { toast.error("يرجى اختيار فصل محدد أولاً"); return; }
    setGeneratingReport(true);
    try {
      const className = classes.find(c => c.id === selectedClassId)?.name || "";
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      await registerArabicFont(doc);
      doc.setFont("Amiri");
      const pageW = doc.internal.pageSize.getWidth();
      let y = 20;
      doc.setFontSize(18); doc.setFont("Amiri", "bold"); doc.setTextColor(0, 102, 153);
      doc.text(`تقرير إنجاز الفصل: ${className}`, pageW / 2, y, { align: "center" });
      y += 10;
      doc.setFontSize(10); doc.setFont("Amiri", "normal"); doc.setTextColor(100, 100, 100);
      doc.text(`تاريخ التقرير: ${format(new Date(), "yyyy/MM/dd")}`, pageW / 2, y, { align: "center" });
      y += 15;
      const items = [
        `إجمالي النماذج الصادرة: ${stats.totalForms}`,
        `عدد الطلاب المتميزين (معدل ≥ 90%): ${stats.excellentStudents}`,
        `حالات النوم المرصودة: ${stats.sleepCases}`,
        `نسبة الانضباط العامة: ${stats.disciplineRate}%`,
      ];
      doc.setFontSize(13); doc.setTextColor(30, 41, 59);
      items.forEach(item => { doc.text(`• ${item}`, pageW - 20, y, { align: "right" }); y += 9; });
      y += 5;
      doc.setFontSize(9); doc.setTextColor(150, 150, 150);
      doc.text("ألفا فيزياء — Alpha Physics", pageW / 2, y, { align: "center" });
      const fileName = `تقرير_إنجاز_${className}.pdf`;
      const blob = doc.output("blob");
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        toast.success("تمت المشاركة بنجاح");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success("تم تنزيل التقرير");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") { console.error(err); toast.error("فشل إنشاء التقرير"); }
    } finally { setGeneratingReport(false); }
  }, [selectedClassId, classes, stats]);

  return (
    <div className="space-y-6">
      {/* ========== TOP: Header & Stats ========== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مركز ألفا الإداري المدمج</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة النماذج الرسمية • {allStudents.length} طالب</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[140px] text-xs h-9">
              <SelectValue placeholder="كل الفصول" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفصول</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-9" onClick={() => setShowIdentitySettings(true)}>
            <Settings2 className="h-3.5 w-3.5" />
            إعدادات الهوية
          </Button>
          <Button
            size="sm" variant="outline" className="gap-1 text-xs h-9"
            onClick={handleClassReport}
            disabled={generatingReport || selectedClassId === "all"}
          >
            {generatingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
            تقرير الفصل
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(stat => (
          <Card key={stat.label} className={cn("relative overflow-hidden border-0 ring-1 shadow-card p-3 flex items-center gap-3", stat.ring)}>
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

      {/* ========== MIDDLE: Forms Grid ========== */}
      <FormsGrid onSelect={handleFormSelect} />

      {/* ========== BOTTOM: Student List with Multi-Select ========== */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-primary" />
            <h2 className="text-base font-bold text-foreground">قائمة الطلاب</h2>
            {selectedStudentIds.length > 0 && (
              <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]">
                <CheckSquare className="h-3 w-3 ml-1" />
                {selectedStudentIds.length} مختار
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedStudentIds.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={() => setSelectedStudentIds([])}>
                <XCircle className="h-3 w-3" /> إلغاء التحديد
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={studentClassFilter} onValueChange={setStudentClassFilter}>
            <SelectTrigger className="w-[130px] text-xs h-8">
              <SelectValue placeholder="كل الفصول" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفصول</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الهوية..."
              className="pr-8 h-8 text-xs"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-[10px] shrink-0" onClick={toggleAll}>
            تحديد الكل
          </Button>
        </div>

        {/* Student rows */}
        <ScrollArea className="max-h-[300px]">
          <div className="border rounded-lg divide-y divide-border/50">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">لا يوجد طلاب</p>
            ) : (
              filteredStudents.map(s => {
                const isChecked = selectedStudentIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors hover:bg-accent/50",
                      isChecked && "bg-primary/5"
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleStudent(s.id)}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.national_id || "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                      {s.className || "بدون فصل"}
                    </Badge>
                  </label>
                );
              })
            )}
          </div>
        </ScrollArea>
        <p className="text-[10px] text-muted-foreground text-center">{filteredStudents.length} طالب معروض</p>
      </Card>

      {/* ========== DIALOGS ========== */}
      {selectedForm && (
        <FormDialog
          form={selectedForm}
          open={!!selectedForm}
          onOpenChange={open => { if (!open) setSelectedForm(null); }}
          preSelectedStudentIds={selectedStudentIds}
        />
      )}

      {/* Identity Settings Dialog */}
      <Dialog open={showIdentitySettings} onOpenChange={setShowIdentitySettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              إعدادات هوية النماذج
            </DialogTitle>
          </DialogHeader>
          <FormIdentitySettings />
        </DialogContent>
      </Dialog>
    </div>
  );
}
