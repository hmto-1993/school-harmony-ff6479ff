import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check, BookOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LessonPlan {
  id: string;
  lesson_title: string;
  objectives: string;
  teacher_reflection: string;
  is_completed: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: LessonPlan | null;
  weekNum: number;
  dayIndex: number;
  slotIndex: number;
  onUpdated: () => void;
}

export default function LessonSlotDialog({ open, onOpenChange, lesson, weekNum, dayIndex, slotIndex, onUpdated }: Props) {
  const [reflection, setReflection] = useState(lesson?.teacher_reflection || "");
  const [completed, setCompleted] = useState(lesson?.is_completed || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!lesson?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("lesson_plans")
      .update({ teacher_reflection: reflection, is_completed: completed })
      .eq("id", lesson.id);
    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: "فشل التحديث", variant: "destructive" });
    } else {
      toast({ title: "✅ تم التحديث" });
      onUpdated();
      onOpenChange(false);
    }
  };

  const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

  if (!lesson) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              لا يوجد درس
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">لم يتم تعيين درس لهذه الحصة بعد. يمكنك إضافة الدرس من صفحة الإعدادات.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5 text-primary" />
            {lesson.lesson_title}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">أسبوع {weekNum}</Badge>
            <Badge variant="outline" className="text-xs">{DAY_NAMES[dayIndex] || `يوم ${dayIndex + 1}`} · حصة {slotIndex + 1}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {lesson.objectives && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">الأهداف</p>
              <p className="text-sm bg-muted/50 rounded-lg p-2.5">{lesson.objectives}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">ملاحظات المعلم</p>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="أضف ملاحظاتك حول أداء الحصة..."
              className="min-h-[80px] text-sm"
            />
          </div>

          <button
            onClick={() => setCompleted(!completed)}
            className={cn(
              "w-full flex items-center gap-2 rounded-lg border-2 p-3 transition-colors text-sm font-medium",
              completed
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/40 text-muted-foreground"
            )}
          >
            <div className={cn(
              "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors",
              completed ? "bg-primary border-primary text-primary-foreground" : "border-border"
            )}>
              {completed && <Check className="h-3.5 w-3.5" />}
            </div>
            {completed ? "تم إكمال الدرس" : "تحديد كمكتمل"}
          </button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
