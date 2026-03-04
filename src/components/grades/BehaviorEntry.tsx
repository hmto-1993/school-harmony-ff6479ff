import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  existingId: string | null;
  notified: boolean;
}

const BehaviorIcon = ({ type }: { type: BehaviorType }) => {
  if (type === "positive") return <ThumbsUp className="h-5 w-5 text-green-600" />;
  if (type === "negative") return <ThumbsDown className="h-5 w-5 text-red-500" />;
  if (type === "neutral") return <Minus className="h-5 w-5 text-yellow-500" />;
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
  const [saving, setSaving] = useState(false);
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; studentId: string; name: string }>({ open: false, studentId: "", name: "" });
  const [sendingNotif, setSendingNotif] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("classes").select("id, name").order("name").then(({ data }) => setClasses(data || []));
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
        return {
          student_id: s.id,
          full_name: s.full_name,
          parent_phone: s.parent_phone,
          type: (rec?.type as BehaviorType) || null,
          note: rec?.note || "",
          existingId: rec?.id || null,
          notified: rec?.notified || false,
        };
      })
    );
  };

  const cycleType = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.student_id !== studentId) return s;
        const next: BehaviorType =
          s.type === null ? "positive" :
          s.type === "positive" ? "neutral" :
          s.type === "neutral" ? "negative" : null;
        return { ...s, type: next };
      })
    );
  };

  const setNote = (studentId: string, note: string) => {
    setStudents((prev) =>
      prev.map((s) => s.student_id === studentId ? { ...s, note } : s)
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];

    for (const s of students) {
      if (s.type === null) continue;
      if (s.existingId) {
        await supabase.from("behavior_records").update({
          type: s.type, note: s.note || null,
        }).eq("id", s.existingId);
      } else {
        await supabase.from("behavior_records").insert({
          student_id: s.student_id,
          class_id: selectedClass,
          date: today,
          type: s.type,
          note: s.note || null,
          recorded_by: user.id,
        });
      }
    }
    toast({ title: "تم الحفظ", description: "تم حفظ سجل السلوك بنجاح" });
    setSaving(false);
    loadData();
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
      // Mark as notified
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

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-lg">سجل السلوك اليومي</CardTitle>
            <Select value={selectedClass} onValueChange={onClassChange}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="اختر الشعبة..." /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedClass ? (
            <p className="text-center py-12 text-muted-foreground">اختر شعبة لعرض سجل السلوك</p>
          ) : students.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">لا يوجد طلاب في هذه الشعبة</p>
          ) : (
            <>
              <div className="flex gap-4 mb-4 text-sm flex-wrap">
                <div className="flex items-center gap-1.5">
                  <ThumbsUp className="h-5 w-5 text-green-600" /><span>إيجابي</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Minus className="h-5 w-5 text-yellow-500" /><span>محايد</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ThumbsDown className="h-5 w-5 text-red-500" /><span>سلبي</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gradient-to-l from-primary/8 to-primary/4 dark:from-primary/15 dark:to-primary/8">
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
                          "transition-colors hover:bg-primary/5 dark:hover:bg-primary/10",
                          isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                          !isLast && "border-b border-border/20"
                        )}
                      >
                        <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{i + 1}</td>
                        <td className="p-3 font-semibold border-l border-border/10">{s.full_name}</td>
                        <td className="p-3 text-center border-l border-border/10">
                          <button
                            type="button"
                            onClick={() => cycleType(s.student_id)}
                            className="p-1 rounded-md transition-all hover:scale-110 cursor-pointer mx-auto"
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
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 ml-2" />
                  {saving ? "جارٍ الحفظ..." : "حفظ السلوك"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Note Dialog */}
      <Dialog open={noteDialog.open} onOpenChange={(open) => setNoteDialog((p) => ({ ...p, open }))}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>ملاحظة السلوك - {noteDialog.name}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={currentNoteStudent?.note || ""}
            onChange={(e) => setNote(noteDialog.studentId, e.target.value)}
            placeholder="اكتب ملاحظة عن سلوك الطالب..."
            rows={4}
          />
          <DialogFooter>
            <Button onClick={() => setNoteDialog((p) => ({ ...p, open: false }))}>تم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
