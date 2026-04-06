import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, ThumbsUp, ThumbsDown, Minus, MessageSquare, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type BehaviorType = "positive" | "negative" | "neutral" | null;

interface StudentBehavior {
  student_id: string;
  full_name: string;
  parent_phone: string | null;
  type: BehaviorType;
  note: string;
  severity: string;
  existingId: string | null;
  notified: boolean;
}

const DEFAULT_SUGGESTIONS: Record<string, string[]> = {
  positive: [
    "أظهر احتراماً للقوانين الصفية",
    "ساعد في ترتيب الفصل",
    "أظهر تعاوناً مع زملائه",
    "حافظ على الهدوء أثناء الدرس",
    "أظهر مسؤولية في أداء مهامه",
    "ساعد في حل النزاعات بين الطلاب",
    "أظهر قيادة إيجابية في المجموعة",
    "حافظ على النظام في الفصل",
  ],
  negative: [
    "أحدث ضوضاء في الفصل",
    "لم يتبع قوانين الفصل",
    "أزعج زملاءه أثناء الدرس",
    "لم يحترم دور المعلم",
    "أظهر سلوكاً غير لائق",
    "لم يشارك في أنشطة الفصل",
    "أظهر عدم احترام للآخرين",
    "أحدث فوضى في الفصل",
  ],
  neutral: [
    "أظهر سلوكاً مقبولاً في الفصل",
    "يحتاج تذكيراً ببعض القوانين",
    "أظهر تحسناً في السلوك",
    "أنجز المهام المطلوبة منه",
  ],
};

const BehaviorIcon = ({ type }: { type: BehaviorType }) => {
  if (type === "positive") return <ThumbsUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
  if (type === "negative") return <ThumbsDown className="h-5 w-5 text-rose-500 dark:text-rose-400" />;
  if (type === "neutral") return <Minus className="h-5 w-5 text-amber-500 dark:text-amber-400" />;
  return <Minus className="h-5 w-5 text-muted-foreground opacity-30" />;
};

const typeLabel = (type: BehaviorType) => {
  if (type === "positive") return "إيجابي";
  if (type === "negative") return "سلبي";
  if (type === "neutral") return "محايد";
  return "—";
};

interface BehaviorEntryProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
}

export default function BehaviorEntry({ selectedClass, onClassChange }: BehaviorEntryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<StudentBehavior[]>([]);
  const [saving] = useState(false); // kept for compatibility
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; studentId: string; name: string }>({ open: false, studentId: "", name: "" });
  const [sendingNotif, setSendingNotif] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>(DEFAULT_SUGGESTIONS);

  useEffect(() => {
    supabase.from("classes").select("id, name").order("name").then(({ data }) => setClasses(data || []));
    // Load custom suggestions
    supabase.from("site_settings").select("id, value").in("id", [
      "behavior_suggestions_positive",
      "behavior_suggestions_negative",
      "behavior_suggestions_neutral",
    ]).then(({ data }) => {
      if (data && data.length > 0) {
        const custom: Record<string, string[]> = { ...DEFAULT_SUGGESTIONS };
        data.forEach((s: any) => {
          const type = s.id.replace("behavior_suggestions_", "");
          try { custom[type] = JSON.parse(s.value); } catch {}
        });
        setSuggestions(custom);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    loadData();
  }, [selectedClass]);

  const loadData = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data: studs } = await supabase
      .from("students").select("id, full_name, parent_phone")
      .eq("class_id", selectedClass).order("full_name");

    const studentIds = (studs || []).map((s) => s.id);
    const { data: records } = await supabase
      .from("behavior_records").select("*")
      .in("student_id", studentIds)
      .eq("date", today)
      .eq("class_id", selectedClass);

    const recordsMap = new Map(records?.map((r) => [r.student_id, r]) || []);

    setStudents(
      (studs || []).map((s) => {
        const rec = recordsMap.get(s.id);
        const rawNote = rec?.note || "";
        const severityMatch = rawNote.match(/\[severity:(\w+)\]/);
        const severity = severityMatch ? severityMatch[1] : "low";
        const note = rawNote.replace(/\[severity:\w+\]\s*/, "");
        return {
          student_id: s.id,
          full_name: s.full_name,
          parent_phone: s.parent_phone,
          type: (rec?.type as BehaviorType) || null,
          note,
          severity,
          existingId: rec?.id || null,
          notified: rec?.notified || false,
        };
      })
    );
  };

  const autoSaveRecord = async (student: StudentBehavior, newType: BehaviorType, newNote?: string, newSeverity?: string) => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const note = newNote !== undefined ? newNote : student.note;
    const severity = newSeverity !== undefined ? newSeverity : student.severity;

    const buildNote = (type: BehaviorType, n: string, sev: string) => {
      const base = n || "";
      if (type === "negative" && sev && sev !== "low") {
        return `[severity:${sev}] ${base}`.trim();
      }
      if (type === "negative" && sev === "low") {
        return base ? `[severity:low] ${base}`.trim() : `[severity:low]`;
      }
      return base || null;
    };

    if (newType === null && student.existingId) {
      // Delete if type cleared
      await supabase.from("behavior_records").delete().eq("id", student.existingId);
      setStudents((prev) =>
        prev.map((s) => s.student_id === student.student_id ? { ...s, type: null, existingId: null, notified: false } : s)
      );
      return;
    }

    if (newType === null) {
      setStudents((prev) =>
        prev.map((s) => s.student_id === student.student_id ? { ...s, type: null } : s)
      );
      return;
    }

    const builtNote = buildNote(newType, note, severity);

    if (student.existingId) {
      await supabase.from("behavior_records").update({
        type: newType, note: builtNote,
      }).eq("id", student.existingId);
      setStudents((prev) =>
        prev.map((s) => s.student_id === student.student_id ? { ...s, type: newType, note: note, severity } : s)
      );
    } else {
      const { data } = await supabase.from("behavior_records").insert({
        student_id: student.student_id,
        class_id: selectedClass,
        date: today,
        type: newType,
        note: builtNote,
        recorded_by: user.id,
      }).select("id").single();
      setStudents((prev) =>
        prev.map((s) => s.student_id === student.student_id ? { ...s, type: newType, note: note, severity, existingId: data?.id || null } : s)
      );
    }
  };

  const cycleType = (studentId: string) => {
    const student = students.find((s) => s.student_id === studentId);
    if (!student) return;
    const next: BehaviorType =
      student.type === null ? "positive" :
      student.type === "positive" ? "neutral" :
      student.type === "neutral" ? "negative" : null;
    // Optimistic update
    setStudents((prev) =>
      prev.map((s) => s.student_id !== studentId ? s : { ...s, type: next })
    );
    autoSaveRecord(student, next);
  };

  const setNote = (studentId: string, note: string) => {
    setStudents((prev) =>
      prev.map((s) => s.student_id === studentId ? { ...s, note } : s)
    );
  };

  // Manual save no longer needed - auto-save handles it
  // Keep a lightweight "save all" for edge cases
  const handleSave = async () => {
    toast({ title: "✓ محفوظ", description: "يتم الحفظ تلقائياً عند كل تغيير" });
  };

  const sendNotification = async (student: StudentBehavior) => {
    if (!student.parent_phone || !student.type) {
      toast({ title: "خطأ", description: "لا يوجد رقم ولي أمر أو لم يتم تحديد السلوك", variant: "destructive" });
      return;
    }
    setSendingNotif(student.student_id);
    const behaviorText = typeLabel(student.type);
    const message = `السلام عليكم ولي أمر الطالب/ة: ${student.full_name}\nسلوك اليوم: ${behaviorText}${student.note ? `\nملاحظة: ${student.note}` : ""}\n\nمع تحيات إدارة المدرسة`;

    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: { phone: student.parent_phone, message },
    });

    if (error || !data?.success) {
      toast({ title: "خطأ في الإرسال", description: data?.error || error?.message || "فشل إرسال الرسالة", variant: "destructive" });
    } else {
      toast({ title: "تم الإرسال", description: `تم إرسال إشعار لولي أمر ${student.full_name}` });
      if (student.existingId) {
        await supabase.from("behavior_records").update({ notified: true }).eq("id", student.existingId);
      }
      setStudents((prev) =>
        prev.map((s) => s.student_id === student.student_id ? { ...s, notified: true } : s)
      );
    }
    setSendingNotif(null);
  };

  const currentNoteStudent = students.find((s) => s.student_id === noteDialog.studentId);
  const currentNoteType = currentNoteStudent?.type;
  const currentSuggestions = currentNoteType ? (suggestions[currentNoteType] || []) : [];

  return (
    <>
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-3 no-print">
          <CardTitle className="text-lg">سجل السلوك اليومي</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedClass ? (
             <p className="text-center py-12 text-muted-foreground">اختر فصلاً لعرض سجل السلوك</p>
           ) : students.length === 0 ? (
             <p className="text-center py-12 text-muted-foreground">لا يوجد طلاب في هذا الفصل</p>
          ) : (
            <>
               <div className="flex gap-3 mb-4 text-sm flex-wrap">
                 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                   <ThumbsUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /><span className="text-emerald-700 dark:text-emerald-300 font-medium">إيجابي</span>
                 </div>
                 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                   <Minus className="h-5 w-5 text-amber-500 dark:text-amber-400" /><span className="text-amber-700 dark:text-amber-300 font-medium">محايد</span>
                 </div>
                 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                   <ThumbsDown className="h-5 w-5 text-rose-500 dark:text-rose-400" /><span className="text-rose-700 dark:text-rose-300 font-medium">سلبي</span>
                 </div>
               </div>

              <div className="hidden print:block text-center mb-2">
                <h2 className="text-sm font-bold">{classes.find(c => c.id === selectedClass)?.name} — سجل السلوك اليومي</h2>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 w-10 first:rounded-tr-xl">#</th>
                      <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[180px]">الطالب</th>
                      <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 w-24">السلوك</th>
                      <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 w-20">ملاحظة</th>
                      <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 w-24 last:rounded-tl-xl">إشعار</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => {
                      const isEven = i % 2 === 0;
                      const isLast = i === students.length - 1;
                      return (
                      <tr
                        key={s.student_id}
                        className={cn(
                          isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                          !isLast && "border-b border-border/20",
                          "hover:bg-primary/10 transition-colors"
                        )}
                      >
                        <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{i + 1}</td>
                        <td className="p-3 font-semibold border-l border-border/10" style={{ fontStyle: "normal" }}>{s.full_name}</td>
                        <td className="p-3 text-center border-l border-border/10">
                           <button
                             type="button"
                             onClick={() => cycleType(s.student_id)}
                             className={cn(
                               "p-1.5 rounded-lg transition-all hover:scale-110 cursor-pointer mx-auto",
                               s.type === "positive" && "bg-emerald-50 dark:bg-emerald-500/15",
                               s.type === "neutral" && "bg-amber-50 dark:bg-amber-500/15",
                               s.type === "negative" && "bg-rose-50 dark:bg-rose-500/15",
                             )}
                             title="اضغط للتبديل"
                           >
                             <BehaviorIcon type={s.type} />
                           </button>
                        </td>
                        <td className="p-3 text-center border-l border-border/10">
                          <button
                            type="button"
                            onClick={() => setNoteDialog({ open: true, studentId: s.student_id, name: s.full_name })}
                            className={cn(
                              "p-1 rounded-md transition-all hover:scale-110",
                              s.note ? "text-primary" : "text-muted-foreground opacity-40 hover:opacity-70"
                            )}
                            title={s.note || "إضافة ملاحظة"}
                          >
                            <MessageSquare className="h-5 w-5" />
                          </button>
                        </td>
                        <td className={cn("p-3 text-center", isLast && "last:rounded-bl-xl")}>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!s.type || !s.parent_phone || sendingNotif === s.student_id}
                            onClick={() => sendNotification(s)}
                            className={cn(
                              "h-8 px-2",
                              s.notified && "text-green-600"
                            )}
                            title={!s.parent_phone ? "لا يوجد رقم ولي أمر" : s.notified ? "تم الإرسال" : "إرسال إشعار"}
                          >
                            {sendingNotif === s.student_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  يتم الحفظ تلقائياً عند كل تغيير
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Note Dialog with behavior type selection & suggestions */}
      <Dialog open={noteDialog.open} onOpenChange={(open) => {
        if (!open && currentNoteStudent && currentNoteStudent.type) {
          // Auto-save note/severity on close
          autoSaveRecord(currentNoteStudent, currentNoteStudent.type, currentNoteStudent.note, currentNoteStudent.severity);
        }
        setNoteDialog((p) => ({ ...p, open }));
      }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ملاحظة السلوك - {noteDialog.name}</DialogTitle>
          </DialogHeader>

          {/* Behavior Type Cards */}
          {currentNoteStudent && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold mb-2">نوع السلوك</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { type: "positive" as const, label: "إيجابي", desc: "سلوك إيجابي يستحق التقدير", icon: ThumbsUp, bg: "bg-emerald-600", border: "border-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
                    { type: "negative" as const, label: "سلبي", desc: "سلوك سلبي يحتاج تصحيح", icon: ThumbsDown, bg: "bg-rose-500", border: "border-rose-500", text: "text-rose-700 dark:text-rose-300" },
                    { type: "neutral" as const, label: "محايد", desc: "سلوك محايد أو ملاحظة عامة", icon: Minus, bg: "bg-amber-500", border: "border-amber-500", text: "text-amber-700 dark:text-amber-300" },
                  ]).map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        const newNote = currentNoteStudent.type !== item.type ? "" : currentNoteStudent.note;
                        const newSeverity = item.type === "negative" ? currentNoteStudent.severity : "low";
                        setStudents((prev) =>
                          prev.map((s) => s.student_id === noteDialog.studentId
                            ? { ...s, type: item.type, note: newNote, severity: newSeverity }
                            : s)
                        );
                        autoSaveRecord(currentNoteStudent, item.type, newNote, newSeverity);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                        currentNoteStudent.type === item.type
                          ? `${item.bg} text-white border-transparent shadow-lg`
                          : "border-border bg-card hover:border-border/80"
                      )}
                    >
                      <item.icon className={cn("h-6 w-6", currentNoteStudent.type === item.type ? "text-white" : item.text)} />
                      <span className={cn("text-sm font-bold", currentNoteStudent.type !== item.type && item.text)}>{item.label}</span>
                      <span className={cn("text-[10px] leading-tight", currentNoteStudent.type === item.type ? "text-white/80" : "text-muted-foreground")}>{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Level for Negative */}
              {currentNoteStudent.type === "negative" && (
                <div>
                  <p className="text-sm font-semibold mb-2">مستوى الخطورة</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {([
                      { key: "none", label: "غير خطر", en: "Not Dangerous" },
                      { key: "low", label: "منخفض", en: "Low" },
                      { key: "medium", label: "متوسط", en: "Medium" },
                      { key: "high", label: "عالي", en: "High" },
                      { key: "critical", label: "حرج", en: "Critical" },
                    ]).map((sev) => {
                      const currentSeverity = currentNoteStudent.severity || "low";
                      return (
                        <button
                          key={sev.key}
                          type="button"
                          onClick={() => {
                            setStudents((prev) =>
                              prev.map((s) => s.student_id === noteDialog.studentId ? { ...s, severity: sev.key } : s)
                            );
                          }}
                          className={cn(
                            "px-2 py-2.5 rounded-xl border-2 text-xs font-bold transition-all text-center",
                            currentSeverity === sev.key
                              ? "bg-emerald-600 text-white border-transparent shadow-lg"
                              : "border-border bg-card text-foreground hover:bg-muted/30"
                          )}
                        >
                          <span className="block">{sev.label}</span>
                          <span className="block text-[9px] font-medium opacity-70">{sev.en}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Suggestions */}
              {currentNoteType && currentSuggestions.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">وصف السلوك</p>
                  <p className="text-xs text-muted-foreground mb-2">مقترحات سريعة:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentSuggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const current = currentNoteStudent?.note || "";
                          const newNote = current ? `${current}، ${sug}` : sug;
                          setNote(noteDialog.studentId, newNote);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-[1.02]",
                          currentNoteStudent?.note?.includes(sug)
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "border-border bg-card hover:bg-muted/50 text-foreground"
                        )}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold mb-2">ملاحظة مخصصة</p>
                <Textarea
                  value={currentNoteStudent?.note || ""}
                  onChange={(e) => setNote(noteDialog.studentId, e.target.value)}
                  placeholder="اكتب ملاحظة عن سلوك الطالب..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setNoteDialog((p) => ({ ...p, open: false }))}>تم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
